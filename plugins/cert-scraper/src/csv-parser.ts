export interface CertRecord {
  orgName: string;
  orgType: string;
  city: string;
  state: string;
  lastAuditDate: string;
  auditorName: string;
  certStatus: string;
  agencyName: string;
}

/**
 * Parse a CSV from a certification registry into structured records.
 * Expects headers: Facility Name, Facility Type, City, State,
 * Onsite End Date, Auditor, Completion Status, Agency
 *
 * Adapt the column names below to match your industry's registry format.
 */
export function parseCertRegistryCsv(csvText: string): CertRecord[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const records: CertRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim().replace(/"/g, "") || "";
    });

    // Map registry columns to our standard fields
    // Change these mappings to match your industry's registry format
    const record: CertRecord = {
      orgName: row["Facility Name"] || row["Organization Name"] || "",
      orgType: row["Facility Type"] || row["Organization Type"] || "",
      city: row["City"] || "",
      state: row["State"] || "",
      lastAuditDate: row["Onsite End Date"] || row["Last Audit Date"] || "",
      auditorName: row["Auditor"] || "",
      certStatus: row["Completion Status"] || row["Status"] || "",
      agencyName: row["Agency"] || "",
    };

    // Only include completed audits with a valid date
    if (record.certStatus === "Completed" && record.lastAuditDate) {
      records.push(record);
    }
  }

  return records;
}

/**
 * Filter records to those whose certification expires within N months.
 * Assumes a 3-year certification cycle.
 */
export function findExpiringCerts(
  records: CertRecord[],
  monthsUntilExpiry: number,
  cycleYears: number = 3
): CertRecord[] {
  const now = new Date();

  return records.filter((r) => {
    if (!r.lastAuditDate) return false;
    const auditDate = new Date(r.lastAuditDate);
    if (isNaN(auditDate.getTime())) return false;

    const expiryDate = new Date(auditDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + cycleYears);

    const monthsLeft =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

    return monthsLeft <= monthsUntilExpiry;
  });
}

/** Handle CSV fields that may contain commas inside quotes */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
