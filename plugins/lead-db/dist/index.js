import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { LeadDatabase } from "./database.js";
import { resolve } from "path";
const DB_PATH = process.env.DATABASE_PATH || resolve(process.cwd(), "data", "leads.db");
let db = null;
function getDb() {
    if (!db)
        db = new LeadDatabase(DB_PATH);
    return db;
}
export default defineToolPlugin({
    id: "lead-db",
    name: "Lead Database",
    description: "Track compliance audit leads with scoring and deduplication.",
    tools: (tool) => [
        tool({
            name: "add_lead",
            description: "Add a new organization to the lead pipeline. Checks for duplicates first. " +
                "Returns the lead ID and initial score.",
            parameters: Type.Object({
                org_name: Type.String({ description: "Organization name" }),
                org_type: Type.String({ description: "Organization type (e.g., Healthcare, Environmental, Safety)" }),
                city: Type.String({ description: "City" }),
                state: Type.String({ description: "2-letter state code" }),
                last_audit_date: Type.Optional(Type.String({ description: "Last audit date (YYYY-MM-DD)" })),
                auditor_name: Type.Optional(Type.String({ description: "Auditor who performed the last audit" })),
                source: Type.String({ description: "Lead source: certification_registry, manual, referral" }),
                estimated_value: Type.Optional(Type.Number({ description: "Estimated contract value in USD" })),
                notes: Type.Optional(Type.String({ description: "Additional notes" })),
            }),
            execute: async (params) => {
                const existing = getDb().findByName(params.org_name, params.state);
                if (existing) {
                    return { duplicate: true, existing_id: existing.id, message: `${params.org_name} already in pipeline` };
                }
                const id = getDb().addLead({
                    orgName: params.org_name,
                    orgType: params.org_type,
                    city: params.city,
                    state: params.state,
                    lastAuditDate: params.last_audit_date,
                    auditorName: params.auditor_name,
                    source: params.source,
                    estimatedValue: params.estimated_value,
                    notes: params.notes,
                });
                const score = getDb().scoreLead(id);
                return { id, score, stage: "new", duplicate: false };
            },
        }),
        tool({
            name: "score_lead",
            description: "Calculate a lead's score (0-100) based on audit urgency, " +
                "estimated value, and organization type. Higher = hotter lead.",
            parameters: Type.Object({
                lead_id: Type.Number({ description: "Lead ID to score" }),
            }),
            execute: async ({ lead_id }) => {
                const score = getDb().scoreLead(lead_id);
                const lead = getDb().getLead(lead_id);
                return { id: lead_id, score, orgName: lead?.orgName };
            },
        }),
        tool({
            name: "get_pipeline",
            description: "Get leads from the pipeline, optionally filtered by stage, state, or minimum score.",
            parameters: Type.Object({
                stage: Type.Optional(Type.String({ description: "Filter by stage (e.g., 'new', 'contacted')" })),
                state: Type.Optional(Type.String({ description: "Filter by 2-letter state code" })),
                score_min: Type.Optional(Type.Number({ description: "Minimum lead score (0-100)" })),
            }),
            execute: async ({ stage, state, score_min }) => {
                const leads = getDb().getPipeline({ stage, state, scoreMin: score_min });
                return { count: leads.length, leads };
            },
        }),
        tool({
            name: "get_stats",
            description: "Get pipeline summary: total leads, counts by stage, total estimated value.",
            parameters: Type.Object({}),
            execute: async () => {
                return getDb().getStats();
            },
        }),
    ],
});
