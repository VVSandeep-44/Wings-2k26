const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "wings2k26.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const ensureRegistrationColumns = () => {
  db.all("PRAGMA table_info(registrations)", (error, rows = []) => {
    if (error) {
      console.error("Failed to inspect registrations table:", error.message);
      return;
    }

    const existingColumns = new Set(rows.map((row) => row.name));
    const requiredColumns = [
      {
        name: "validation_status",
        definition: "TEXT NOT NULL DEFAULT 'pending'",
      },
      {
        name: "validation_message",
        definition: "TEXT",
      },
      {
        name: "invitation_status",
        definition: "TEXT NOT NULL DEFAULT 'queued'",
      },
      {
        name: "invitation_sent_at",
        definition: "TEXT",
      },
      {
        name: "updated_at",
        definition: "TEXT",
      },
    ];

    requiredColumns.forEach(({ name, definition }) => {
      if (existingColumns.has(name)) {
        return;
      }

      db.run(
        `ALTER TABLE registrations ADD COLUMN ${name} ${definition}`,
        (alterError) => {
          if (alterError) {
            console.error(
              `Failed to add column ${name} to registrations:`,
              alterError.message
            );
          }
        }
      );
    });
  });
};

const initDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        college TEXT NOT NULL,
        department TEXT NOT NULL,
        year TEXT NOT NULL,
        events TEXT NOT NULL,
        reg_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        validation_status TEXT NOT NULL DEFAULT 'pending',
        validation_message TEXT,
        invitation_status TEXT NOT NULL DEFAULT 'queued',
        invitation_sent_at TEXT,
        updated_at TEXT
      )
    `);

    ensureRegistrationColumns();

    db.run(
      "CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at DESC)"
    );
  });
};

module.exports = {
  db,
  initDatabase,
};
