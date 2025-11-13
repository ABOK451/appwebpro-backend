require('dotenv').config();

const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  // ✅ Render u otros servicios en la nube
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log("✅ Conectando con DATABASE_URL (Render)");
} else {
  // ✅ Config local
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432
  });
  console.log(`✅ Conectando localmente a PostgreSQL en ${process.env.DB_HOST}:${process.env.DB_PORT}`);
}

module.exports = pool;
