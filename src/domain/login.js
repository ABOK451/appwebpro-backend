class UsuarioLogin {
  constructor(id, usuario_id, reset_code, reset_expires, failed_attempts, blocked_until, ultimo_login, otp_secret, otp_code, otp_expires) {
    this.id = id;                      // ID de login
    this.usuario_id = usuario_id;      // FK a usuarios.id
    this.reset_code = reset_code;      // Código para recuperación
    this.reset_expires = reset_expires;// Expiración del código
    this.failed_attempts = failed_attempts || 0; // Intentos fallidos
    this.blocked_until = blocked_until;         // Fecha hasta la cual está bloqueado
    this.ultimo_login = ultimo_login;           // Fecha del último login
    this.otp_secret = otp_secret || null;      // Secret para Google Authenticator
    this.otp_code = otp_code || null;          // Código temporal enviado por correo
    this.otp_expires = otp_expires || null;    // Expiración del OTP
  }
}

module.exports = UsuarioLogin;
