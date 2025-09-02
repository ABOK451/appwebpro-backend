const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'db',  // <- nombre del servicio de PostgreSQL
  database: process.env.DB_NAME || 'seguridad',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432
});

module.exports = pool;
