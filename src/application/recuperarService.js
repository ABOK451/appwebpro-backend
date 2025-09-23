const pool = require('../infrastructure/db');

class RecuperarService {
  
  static async guardarCodigoReset(usuario_id, codigo, expiracion) {
    try {
      const res = await pool.query(
        `UPDATE usuario_login 
         SET reset_code=$1, reset_expires=$2 
         WHERE usuario_id=$3`,
        [codigo, expiracion, usuario_id]
      );
      return res.rowCount > 0;
    } catch (err) {
      console.error("Error en guardarCodigoReset:", err.message);
      throw err;
    }
  }

  
  static async validarCodigoReset(usuario_id, codigo) {
    try {
      const res = await pool.query(
        `SELECT reset_code, reset_expires 
         FROM usuario_login 
         WHERE usuario_id=$1`,
        [usuario_id]
      );

      if (res.rows.length === 0) return false;
      const u = res.rows[0];

      if (!u.reset_code || u.reset_code !== codigo) return false;
      if (!u.reset_expires || new Date(u.reset_expires) < new Date()) return false;

      return true;
    } catch (err) {
      console.error("Error en validarCodigoReset:", err.message);
      throw err;
    }
  }

  
  static async limpiarCodigoReset(usuario_id) {
    try {
      const res = await pool.query(
        `UPDATE usuario_login 
         SET reset_code=NULL, reset_expires=NULL 
         WHERE usuario_id=$1`,
        [usuario_id]
      );
      return res.rowCount > 0;
    } catch (err) {
      console.error("Error en limpiarCodigoReset:", err.message);
      throw err;
    }
  }
}

module.exports = RecuperarService;
