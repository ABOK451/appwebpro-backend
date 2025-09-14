const pool = require('../infrastructure/db');
const Usuario = require('../domain/usuario');
const bcrypt = require('bcrypt'); 

class UsuarioService {
  static async listar() {
    const res = await pool.query(
      'SELECT id, correo, rol, estado, nombre, app, apm, telefono FROM usuarios ORDER BY id'
    );
    return res.rows.map(u => new Usuario(u.id, u.nombre, u.correo, null, u.rol));
  }

  static async crear({ correo, password, rol, estado, nombre, app, apm, telefono }) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const res = await pool.query(
      `INSERT INTO usuarios (correo, password, rol, estado, nombre, app, apm, telefono)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, correo, rol, estado, nombre, app, apm, telefono`,
      [correo, hash, rol, estado, nombre, app, apm, telefono]
    );

    const u = res.rows[0];

    return new Usuario(u.id, u.correo, hash, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono);
  }

  static async actualizar(correoBuscado, { 
  correo, password, rol, estado, nombre, app, apm, telefono, passwordHash,
  reset_code, reset_expires
}) {
  const hashFinal = passwordHash || (password ? await bcrypt.hash(password, 10) : null);

  const res = await pool.query(
    `UPDATE usuarios
     SET 
       correo = COALESCE($1, correo),
       password = COALESCE($2, password),
       rol = COALESCE($3, rol),
       estado = COALESCE($4, estado),
       nombre = COALESCE($5, nombre),
       app = COALESCE($6, app),
       apm = COALESCE($7, apm),
       telefono = COALESCE($8, telefono),
       reset_code = $9,
       reset_expires = $10
     WHERE correo = $11
     RETURNING id, correo, rol, estado, nombre, app, apm, telefono, reset_code, reset_expires`,
    [correo, hashFinal, rol, estado, nombre, app, apm, telefono, reset_code, reset_expires, correoBuscado]
  );

  if (res.rows.length === 0) return null;

  const u = res.rows[0];
  return new Usuario(
    u.id, u.correo, hashFinal || u.password, u.rol, u.estado, 
    u.nombre, u.app, u.apm, u.telefono, u.reset_code, u.reset_expires
  );
}

  static async eliminar({ correo }) {
    const res = await pool.query(
      `DELETE FROM usuarios 
       WHERE correo = $1 
       RETURNING id, correo, rol, estado, nombre, app, apm, telefono`,
      [correo]
    );

    if (res.rows.length === 0) return null; 

    const u = res.rows[0];
    return new Usuario(u.id, u.nombre, u.correo, null, u.rol);
  }

  static async buscarPorCorreo(correo) {
    const res = await pool.query(
      `SELECT * FROM usuarios WHERE correo = $1`,
      [correo]
    );
    if (res.rows.length === 0) return null;
    const u = res.rows[0];

    return new Usuario(u.id,u.correo,u.password,u.rol,u.estado,u.nombre,u.app,u.apm,u.telefono, u.reset_code, u.reset_expires);
  }

  static async guardarCodigoReset(correo, codigo, expiracion) {
  await pool.query(
    `UPDATE usuarios SET reset_code=$1, reset_expires=$2 WHERE correo=$3`,
    [codigo, expiracion, correo]
  );
}

static async validarCodigoReset(correo, codigo) {
  const res = await pool.query(
    `SELECT reset_code, reset_expires FROM usuarios WHERE correo=$1`,
    [correo]
  );

  if (res.rows.length === 0) return false;
  const u = res.rows[0];

  if (u.reset_code !== codigo) return false;
  if (new Date(u.reset_expires) < new Date()) return false;

  return true;
}

static async limpiarCodigoReset(correo) {
  await pool.query(
    `UPDATE usuarios SET reset_code=NULL, reset_expires=NULL WHERE correo=$1`,
    [correo]
  );
}


}

module.exports = UsuarioService;
