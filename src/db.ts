import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('supplypay.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'operator', 'supplier', 'admin'
    name TEXT NOT NULL,
    cpf TEXT,
    birth_date TEXT,
    bank TEXT,
    whatsapp TEXT,
    status TEXT DEFAULT 'OFF', -- 'ON', 'OFF'
    balance REAL DEFAULT 0,
    level_points REAL DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    supplier_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'IN_USE', 'COMPLETED'
    withdrawal_amount REAL,
    pix_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Default settings
  INSERT OR IGNORE INTO settings (key, value) VALUES ('cpf_price', '2.70');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('supplier_fee_percentage', '0.5'); -- 50% of price
`);

export default db;
