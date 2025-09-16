class UsuarioLogin {
  constructor(id, usuario_id, reset_code, reset_expires, failed_attempts, blocked_until, ultimo_login) {
    this.id = id;                      
    this.usuario_id = usuario_id;      
    this.reset_code = reset_code;      
    this.reset_expires = reset_expires;
    this.failed_attempts = failed_attempts || 0; 
    this.blocked_until = blocked_until;        
    this.ultimo_login = ultimo_login;          
  }
}

module.exports = UsuarioLogin;
