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
export declare function parseCertRegistryCsv(csvText: string): CertRecord[];
/**
 * Filter records to those whose certification expires within N months.
 * Assumes a 3-year certification cycle.
 */
export declare function findExpiringCerts(records: CertRecord[], monthsUntilExpiry: number, cycleYears?: number): CertRecord[];
