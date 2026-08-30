import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../scholarmate.db');

const SQL = await initSqlJs();

let dbData = null;
if (fs.existsSync(dbPath)) {
  dbData = fs.readFileSync(dbPath);
}

const db = dbData ? new SQL.Database(dbData) : new SQL.Database();

function saveDatabase() {
  const binaryArray = db.export();
  const buffer = Buffer.from(binaryArray);
  fs.writeFileSync(dbPath, buffer);
}

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    extracted_text TEXT NOT NULL,
    page_count INTEGER DEFAULT 1,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    summary TEXT NOT NULL,
    bullet_points TEXT NOT NULL,
    important_questions TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    cards_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    questions_json TEXT NOT NULL,
    score INTEGER DEFAULT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
saveDatabase();

// Compatibility wrapper matching better-sqlite3 API
const dbWrapper = {
  prepare(sql) {
    return {
      get(...params) {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },
      all(...params) {
        const stmt = db.prepare(sql);
        const results = [];
        try {
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      },
      run(...params) {
        db.run(sql, params);

        // Fetch last insert rowid BEFORE saving database to prevent db.export() from resetting rowid
        const res = db.exec("SELECT last_insert_rowid() AS id");
        const lastInsertRowid = (res[0] && res[0].values[0] && res[0].values[0][0]) || 0;

        saveDatabase();
        return { lastInsertRowid };
      }
    };
  },
  exec(sql) {
    db.run(sql);
    saveDatabase();
  }
};

export default dbWrapper;
