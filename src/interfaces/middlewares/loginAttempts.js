const pool = require("../../infrastructure/db");
const EmailService = require('../../application/emailService');

const MAX_ATTEMPTS = 5;        
const BLOCK_TIME = 15 * 60 * 1000; // 15 minutos

const isBlocked = async (usuario_id) => {
  const result = await pool.query(
    `SELECT failed_attempts, blocked_until 
     FROM usuario_login 
     WHERE usuario_id=$1`,
    [usuario_id]
  );

  const loginData = result.rows[0];
  if (!loginData || !loginData.blocked_until) return false;

  if (new Date(loginData.blocked_until) > new Date()) return true;

  await pool.query(
    `UPDATE usuario_login 
     SET failed_attempts=0, blocked_until=NULL 
     WHERE usuario_id=$1`,
    [usuario_id]
  );

  return false;
};

const loginAttempt = async (usuario) => {
  const result = await pool.query(
    `SELECT failed_attempts FROM usuario_login WHERE usuario_id=$1`,
    [usuario.id]
  );

  let attempts = result.rows[0]?.failed_attempts || 0;
  attempts += 1;

  if (attempts >= MAX_ATTEMPTS) {
    const blockedUntil = new Date(Date.now() + BLOCK_TIME);

    await pool.query(
      `UPDATE usuario_login 
       SET failed_attempts=$1, blocked_until=$2 
       WHERE usuario_id=$3`,
      [attempts, blockedUntil, usuario.id]
    );

        await EmailService.sendAccountBlockedEmail(usuario.correo, usuario.nombre, blockedUntil);
  } else {
    await pool.query(
      `UPDATE usuario_login SET failed_attempts=$1 WHERE usuario_id=$2`,
      [attempts, usuario.id]
    );
  }
};

module.exports = { loginAttempt, isBlocked };
