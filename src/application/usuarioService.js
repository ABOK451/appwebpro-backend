const pool = require('../infrastructure/db');
const Usuario = require('../domain/usuario');

class UsuarioService {
  static async listar() {
    const res = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');
    return res.rows.map(u => new Usuario(u.id, u.nombre, u.email, null, u.rol));
  }

  static async crear({ nombre, email, password, rol }) {
    const res = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol]
    );
    const u = res.rows[0];
    return new Usuario(u.id, u.nombre, u.email, null, u.rol);
  }
}

module.exports = UsuarioService;
