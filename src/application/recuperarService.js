const pool = require('../infrastructure/db');

class RecuperarService {

  static guardarCodigoReset(usuario_id, codigo, expiracion) {
    return pool.query(
      `UPDATE usuario_login 
       SET reset_code=$1, reset_expires=$2 
       WHERE usuario_id=$3`,
      [codigo, expiracion, usuario_id]
    )
    .then(res => res.rowCount > 0)
    .catch(err => {
      console.error("Error en guardarCodigoReset:", err.message);
      throw err;
    });
  }

  static validarCodigoReset(usuario_id, codigo) {
    return pool.query(
      `SELECT reset_code, reset_expires 
       FROM usuario_login 
       WHERE usuario_id=$1`,
      [usuario_id]
    )
    .then(res => {
      if (res.rows.length === 0) return false;
      const u = res.rows[0];

      if (!u.reset_code || u.reset_code !== codigo) return false;
      if (!u.reset_expires || new Date(u.reset_expires) < new Date()) return false;

      return true;
    })
    .catch(err => {
      console.error("Error en validarCodigoReset:", err.message);
      throw err;
    });
  }

  static limpiarCodigoReset(usuario_id) {
    return pool.query(
      `UPDATE usuario_login 
       SET reset_code=NULL, reset_expires=NULL 
       WHERE usuario_id=$1`,
      [usuario_id]
    )
    .then(res => res.rowCount > 0)
    .catch(err => {
      console.error("Error en limpiarCodigoReset:", err.message);
      throw err;
    });
  }
}

module.exports = RecuperarService;
