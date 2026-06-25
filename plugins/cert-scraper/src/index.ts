import { Type } from "@sinclair/typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { parseCertRegistryCsv, findExpiringCerts, type CertRecord } from "./csv-parser.js";

// Default: a public compliance certification registry CSV endpoint
// Readers can change this to any CSV-based registry in their industry
const DEFAULT_URL = "https://example.com/certification-registry.csv";

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

async function fetchRegistryCsv(
  baseUrl: string,
  state: string,
  orgType?: string
): Promise<CertRecord[]> {
  const params = new URLSearchParams({
    state,
    type: orgType || "All",
    _format: "csv",
  });

  const resp = await fetch(`${baseUrl}?${params}`);
  if (!resp.ok) return [];
  const text = await resp.text();
  return parseCertRegistryCsv(text);
}

export default defineToolPlugin({
  id: "cert-scraper",
  name: "Certification Scraper",
  description: "Scrape public compliance audit directories for expiring certifications.",
  tools: (tool) => [
    tool({
      name: "scrape_certifications",
      description:
        "Fetch certification audit records from a public registry. " +
        "Returns organization name, type, location, last audit date, and status. " +
        "Use months_until_expiry to filter for organizations whose certs are expiring soon.",
      parameters: Type.Object({
        states: Type.Array(Type.String(), {
          description: "State codes to search (e.g. ['WI', 'IL']). Use ['ALL'] for national.",
        }),
        org_type: Type.Optional(
          Type.String({
            description: "Filter by organization type. Omit for all types.",
          })
        ),
        months_until_expiry: Type.Optional(
          Type.Number({
            description: "Only return orgs whose certs expire within this many months.",
          })
        ),
      }),
      execute: async ({ states, org_type, months_until_expiry }, context) => {
        const registryUrl = context?.config?.registryUrl || DEFAULT_URL;
        const targetStates = states.includes("ALL") ? STATES : states;
        let allRecords: CertRecord[] = [];

        for (const state of targetStates) {
          const records = await fetchRegistryCsv(registryUrl, state, org_type);
          allRecords = allRecords.concat(records);
          if (targetStates.length > 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (months_until_expiry !== undefined) {
          const expiring = findExpiringCerts(allRecords, months_until_expiry);
          return {
            total_scraped: allRecords.length,
            expiring_count: expiring.length,
            records: expiring,
          };
        }

        return { total_scraped: allRecords.length, records: allRecords };
      },
    }),

    tool({
      name: "get_audit_stats",
      description:
        "Get summary statistics for certifications: counts by org type, status, and state.",
      parameters: Type.Object({
        states: Type.Array(Type.String(), {
          description: "State codes. Use ['ALL'] for national.",
        }),
      }),
      execute: async ({ states }, context) => {
        const registryUrl = context?.config?.registryUrl || DEFAULT_URL;
        const targetStates = states.includes("ALL") ? STATES : states;
        let allRecords: CertRecord[] = [];

        for (const state of targetStates) {
          const records = await fetchRegistryCsv(registryUrl, state);
          allRecords = allRecords.concat(records);
          if (targetStates.length > 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byState: Record<string, number> = {};

        for (const r of allRecords) {
          byType[r.orgType] = (byType[r.orgType] || 0) + 1;
          byStatus[r.certStatus] = (byStatus[r.certStatus] || 0) + 1;
          byState[r.state] = (byState[r.state] || 0) + 1;
        }

        return {
          total: allRecords.length,
          by_org_type: byType,
          by_status: byStatus,
          by_state: byState,
        };
      },
    }),
  ],
});
