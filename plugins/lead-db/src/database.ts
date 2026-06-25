import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

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

export class LeadDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_name TEXT NOT NULL,
        org_type TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        last_audit_date TEXT,
        auditor_name TEXT,
        source TEXT NOT NULL,
        stage TEXT NOT NULL DEFAULT 'new',
        score INTEGER NOT NULL DEFAULT 0,
        estimated_value REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_leads_name_state ON leads(org_name, state);
    `);
  }

  findByName(orgName: string, state: string): Lead | null {
    const row = this.db
      .prepare("SELECT * FROM leads WHERE org_name = ? AND state = ?")
      .get(orgName, state) as any;
    return row ? this.rowToLead(row) : null;
  }

  addLead(input: LeadInput): number {
    const stmt = this.db.prepare(`
      INSERT INTO leads (org_name, org_type, city, state, last_audit_date, auditor_name, source, estimated_value, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.orgName, input.orgType, input.city, input.state,
      input.lastAuditDate || null, input.auditorName || null,
      input.source, input.estimatedValue || 0, input.notes || null
    );
    return result.lastInsertRowid as number;
  }

  getLead(id: number): Lead | null {
    const row = this.db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as any;
    return row ? this.rowToLead(row) : null;
  }

  scoreLead(id: number): number {
    const lead = this.getLead(id);
    if (!lead) return 0;

    let score = 0;
    const now = new Date();

    // Audit urgency (0-60 points)
    if (lead.lastAuditDate) {
      const expiry = new Date(lead.lastAuditDate);
      expiry.setFullYear(expiry.getFullYear() + 3);
      const monthsLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsLeft <= 0) score += 60;
      else if (monthsLeft <= 3) score += 50;
      else if (monthsLeft <= 6) score += 40;
      else if (monthsLeft <= 9) score += 30;
      else if (monthsLeft <= 12) score += 15;
      else score += 5;
    }

    // Estimated value (0-20 points)
    const value = lead.estimatedValue || 0;
    if (value >= 12000) score += 20;
    else if (value >= 8000) score += 15;
    else if (value >= 5000) score += 10;
    else score += 5;

    // Organization type (0-20 points)
    const typeScores: Record<string, number> = {
      "Behavioral Health": 20, "Environmental Hazmat": 20,
      "Juvenile": 20, "Healthcare": 15,
      "Municipal": 15, "County": 15,
      "State": 10, "Federal": 10,
      "Community": 8, "Private": 5,
    };
    score += typeScores[lead.orgType] || 10;

    score = Math.min(100, Math.max(0, score));
    this.db.prepare("UPDATE leads SET score = ?, updated_at = datetime('now') WHERE id = ?").run(score, id);
    return score;
  }

  getPipeline(filter: { stage?: string; state?: string; scoreMin?: number } = {}): Lead[] {
    let sql = "SELECT * FROM leads WHERE 1=1";
    const params: any[] = [];

    if (filter.stage) { sql += " AND stage = ?"; params.push(filter.stage); }
    if (filter.state) { sql += " AND state = ?"; params.push(filter.state); }
    if (filter.scoreMin !== undefined) { sql += " AND score >= ?"; params.push(filter.scoreMin); }

    sql += " ORDER BY score DESC, updated_at DESC";
    return (this.db.prepare(sql).all(...params) as any[]).map((r) => this.rowToLead(r));
  }

  getStats() {
    const total = (this.db.prepare("SELECT COUNT(*) as count FROM leads").get() as any).count;
    const stageRows = this.db.prepare("SELECT stage, COUNT(*) as count FROM leads GROUP BY stage").all() as any[];
    const byStage: Record<string, number> = {};
    for (const row of stageRows) byStage[row.stage] = row.count;
    const totalValue = (this.db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM leads").get() as any).total;
    return { total, byStage, totalValue };
  }

  private rowToLead(row: any): Lead {
    return {
      id: row.id, orgName: row.org_name, orgType: row.org_type,
      city: row.city, state: row.state, lastAuditDate: row.last_audit_date,
      auditorName: row.auditor_name, source: row.source, stage: row.stage,
      score: row.score, estimatedValue: row.estimated_value,
      notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
}
