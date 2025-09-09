const pool = require('../infrastructure/db');
const Usuario = require('../domain/usuario');

class UsuarioService {
  static async listar() {
    const res = await pool.query('SELECT id, correo, password, rol, estado, nombre, app, apm, telefono FROM usuarios ORDER BY id');
    return res.rows.map(u => new Usuario(u.id, u.nombre, u.email, null, u.rol));
  }

  static async crear({ correo, password, rol, estado, nombre, app, apm, telefono }) {
    const res = await pool.query(
      'INSERT INTO usuarios (correo, password, rol, estado, nombre, app, apm, telefono) VALUES ($1, $2, $3, $4 ,$5, $6, $7, $8) RETURNING id, correo, password, rol, estado, nombre, app, apm, telefono',
      [correo, password, rol, estado, nombre, app, apm, telefono]
    );
    const u = res.rows[0];
    return new Usuario(u.id, u.nombre, u.email, null, u.rol);
  }
}

module.exports = UsuarioService;
