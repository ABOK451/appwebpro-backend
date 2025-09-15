const pool = require("../../infrastructure/db");
const transporter = require("../../config/email"); 

const MAX_ATTEMPTS = 5;        
const BLOCK_TIME = 15 * 60 * 1000; // 15 minutos

// Verifica si la cuenta está bloqueada
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

  // Si ya pasó el tiempo de bloqueo, resetear intentos y bloqueo
  await pool.query(
    `UPDATE usuario_login 
     SET failed_attempts=0, blocked_until=NULL 
     WHERE usuario_id=$1`,
    [usuario_id]
  );

  return false;
};

// Registra un intento de login fallido
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

    // Enviar correo notificando bloqueo
    await transporter.sendMail({
      from: "noreply@miapp.com",
      to: usuario.correo,
      subject: "Cuenta bloqueada temporalmente",
      text: `Tu cuenta ha sido bloqueada temporalmente hasta ${blockedUntil.toLocaleString()} debido a múltiples intentos fallidos de inicio de sesión.`
    });
  } else {
    await pool.query(
      `UPDATE usuario_login SET failed_attempts=$1 WHERE usuario_id=$2`,
      [attempts, usuario.id]
    );
  }
};

module.exports = { loginAttempt, isBlocked };
