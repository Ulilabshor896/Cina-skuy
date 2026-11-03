const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

function openDb(file = process.env.DB_FILE || "hotel.db") {
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      stock INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      nights INTEGER NOT NULL,
      guests INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Menunggu Pembayaran',
      method TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id, check_in, check_out);
  `);
  const ins = db.prepare("INSERT OR IGNORE INTO rooms (id, name, price, capacity, stock) VALUES (?,?,?,?,?)");
  [[1, "Standard", 350000, 2, 5], [2, "Deluxe", 550000, 2, 4], [3, "Family", 750000, 4, 2], [4, "Suite", 950000, 3, 2]]
    .forEach((r) => ins.run(...r));
  if (!db.prepare("SELECT 1 FROM users WHERE email = ?").get("demo@hotel.id")) {
    db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?,?,?)")
      .run("Tamu Demo", "demo@hotel.id", bcrypt.hashSync("demo123", 10));
  }
  return db;
}

module.exports = { openDb };
