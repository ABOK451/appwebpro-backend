const pool = require('../infrastructure/db');
const UsuarioLogin = require('../domain/login'); // tu clase UsuarioLogin
const bcrypt = require('bcrypt'); 

class RecuperarService {

  static async guardarCodigoReset(usuario_id, codigo, expiracion) {
    await pool.query(
      `UPDATE usuario_login 
       SET reset_code=$1, reset_expires=$2 
       WHERE usuario_id=$3`,
      [codigo, expiracion, usuario_id]
    );
  }

  static async validarCodigoReset(usuario_id, codigo) {
    const res = await pool.query(
      `SELECT reset_code, reset_expires 
       FROM usuario_login 
       WHERE usuario_id=$1`,
      [usuario_id]
    );

    if (res.rows.length === 0) return false;
    const u = res.rows[0];

    if (u.reset_code !== codigo) return false;
    if (new Date(u.reset_expires) < new Date()) return false;

    return true;
  }

  static async limpiarCodigoReset(usuario_id) {
    await pool.query(
      `UPDATE usuario_login 
       SET reset_code=NULL, reset_expires=NULL 
       WHERE usuario_id=$1`,
      [usuario_id]
    );
  }

}

module.exports = RecuperarService;
