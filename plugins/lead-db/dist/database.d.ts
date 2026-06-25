export interface LeadInput {
    orgName: string;
    orgType: string;
    city: string;
    state: string;
    lastAuditDate?: string;
    auditorName?: string;
    source: string;
    estimatedValue?: number;
    notes?: string;
}
export interface Lead extends LeadInput {
    id: number;
    stage: string;
    score: number;
    createdAt: string;
    updatedAt: string;
}
export declare class LeadDatabase {
    private db;
    constructor(dbPath: string);
    private migrate;
    findByName(orgName: string, state: string): Lead | null;
    addLead(input: LeadInput): number;
    getLead(id: number): Lead | null;
    scoreLead(id: number): number;
    getPipeline(filter?: {
        stage?: string;
        state?: string;
        scoreMin?: number;
    }): Lead[];
    getStats(): {
        total: any;
        byStage: Record<string, number>;
        totalValue: any;
    };
    private rowToLead;
}
