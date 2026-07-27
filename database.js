import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'prompts.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeSchema();
      }
    });
  }

  initializeSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_text TEXT NOT NULL,
        response_text TEXT,
        platform TEXT,
        model TEXT,
        timestamp INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create full-text search virtual table
    this.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
        id UNINDEXED,
        prompt_text,
        response_text,
        platform,
        model,
        content=prompts,
        content_rowid=id
      )
    `);

    // Create triggers to keep FTS index in sync
    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
        INSERT INTO prompts_fts(rowid, id, prompt_text, response_text, platform, model)
        VALUES (new.id, new.id, new.prompt_text, new.response_text, new.platform, new.model);
      END
    `);

    this.db.run(`
      CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
        DELETE FROM prompts_fts WHERE id = old.id;
      END
    `);
  }

  addPrompt(promptText, responseText, platform, model, timestamp = null) {
    return new Promise((resolve, reject) => {
      const ts = timestamp || Math.floor(Date.now() / 1000);
      this.db.run(
        `INSERT INTO prompts (prompt_text, response_text, platform, model, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [promptText, responseText, platform, model, ts],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  searchPrompts(query, sortBy = 'date') {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT p.id, p.prompt_text, p.response_text, p.platform, p.model, p.timestamp
        FROM prompts p
      `;

      if (query && query.trim()) {
        sql = `
          SELECT p.id, p.prompt_text, p.response_text, p.platform, p.model, p.timestamp
          FROM prompts p
          INNER JOIN prompts_fts f ON p.id = f.id
          WHERE prompts_fts MATCH ?
        `;
      }

      if (sortBy === 'date') {
        sql += ' ORDER BY p.timestamp DESC';
      } else if (sortBy === 'date-asc') {
        sql += ' ORDER BY p.timestamp ASC';
      }

      const params = query && query.trim() ? [query] : [];

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  getAllPrompts(sortBy = 'date') {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT id, prompt_text, response_text, platform, model, timestamp
        FROM prompts
      `;

      if (sortBy === 'date') {
        sql += ' ORDER BY timestamp DESC';
      } else if (sortBy === 'date-asc') {
        sql += ' ORDER BY timestamp ASC';
      }

      this.db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  getPromptById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM prompts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  deletePrompt(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM prompts WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  clearAllPrompts() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM prompts', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default Database;
