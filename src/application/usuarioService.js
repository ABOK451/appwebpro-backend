const pool = require('../infrastructure/db');
const Usuario = require('../domain/usuario');
const bcrypt = require('bcrypt'); 

class UsuarioService {
  static async listar() {
    const res = await pool.query(
      'SELECT id, correo, rol, estado, nombre, app, apm, telefono FROM usuarios ORDER BY id'
    );
    return res.rows.map(u => new Usuario(u.id, u.correo, null, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono));
  }

  static async crear({ correo, password, rol, estado, nombre, app, apm, telefono }) {
  try {
    const hash = await bcrypt.hash(password, 10);

    const res = await pool.query(
      `INSERT INTO usuarios (correo, password, rol, estado, nombre, app, apm, telefono)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, correo, rol, estado, nombre, app, apm, telefono`,
      [correo, hash, rol, estado, nombre, app, apm, telefono]
    );

    const u = res.rows[0];

    await pool.query(
      `INSERT INTO usuario_login (usuario_id, failed_attempts, blocked_until) VALUES ($1, 0, NULL)`,
      [u.id]
    );

    return new Usuario(u.id, u.correo, hash, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono);

  } catch (error) {
    console.error("Error en UsuarioService.crear:", error);

    if (error.code === '23505' && error.detail && error.detail.includes('correo')) {
      throw new Error('El correo ya existe, no se puede repetir');
    }

    throw new Error(error.message || 'Error desconocido al crear usuario');
  }
}

  static async actualizarLogin(usuario_id, { failed_attempts, blocked_until }) {
  const res = await pool.query(
    `UPDATE usuario_login
     SET failed_attempts = COALESCE($1, failed_attempts),
         blocked_until = $2
     WHERE usuario_id = $3
     RETURNING usuario_id, failed_attempts, blocked_until`,
    [failed_attempts, blocked_until, usuario_id]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0];
}


  static async actualizar(correoBuscado, { 
    correo, password, rol, estado, nombre, app, apm, telefono, passwordHash
  }) {
    let hashFinal = null;
      if (passwordHash) {
        hashFinal = passwordHash;
      } else if (password) {
        if (/^\$2[aby]\$/.test(password)) {
          hashFinal = password;
        } else {
          hashFinal = await bcrypt.hash(password, 10);
        }
      }


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
         telefono = COALESCE($8, telefono)
       WHERE correo = $9
       RETURNING id, correo, rol, estado, nombre, app, apm, telefono`,
      [correo, hashFinal, rol, estado, nombre, app, apm, telefono, correoBuscado]
    );

    if (res.rows.length === 0) return null;
    const u = res.rows[0];
    return new Usuario(
      u.id, u.correo, hashFinal || u.password, u.rol, u.estado,
      u.nombre, u.app, u.apm, u.telefono
    );
  }

  static async actualizarPassword(usuario_id, passwordHash) {
    await pool.query(
      `UPDATE usuarios 
       SET password=$1 
       WHERE id=$2`,
      [passwordHash, usuario_id]
    );
  }

  static async eliminar({ correo }) {
    const res = await pool.query(
      `DELETE FROM usuarios WHERE correo = $1 RETURNING id, correo, rol, estado, nombre, app, apm, telefono`,
      [correo]
    );

    if (res.rows.length === 0) return null;
    const u = res.rows[0];
    return new Usuario(u.id, u.correo, null, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono);
  }

  static async buscarPorCorreo(correo) {
  const res = await pool.query(
    `SELECT u.id, u.correo, u.password, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono,
            ul.failed_attempts, ul.blocked_until
     FROM usuarios u
     LEFT JOIN usuario_login ul ON ul.usuario_id = u.id
     WHERE u.correo = $1`,
    [correo]
  );

  if (res.rows.length === 0) return null;
  const u = res.rows[0];

  return {
    id: Number(u.id),  
    correo: u.correo,
    password: u.password,
    rol: u.rol,
    estado: u.estado,
    nombre: u.nombre,
    app: u.app,
    apm: u.apm,
    telefono: u.telefono,
    failed_attempts: Number(u.failed_attempts) || 0,
    blocked_until: u.blocked_until ? new Date(u.blocked_until) : null
  };
}





  
  
}

module.exports = UsuarioService;
