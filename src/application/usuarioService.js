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

static async actualizarLogin(usuario_id, {
  failed_attempts = null,
  blocked_until = null,
  ultimo_login = null,
  latitud = null,
  longitud = null,
  token = null,
  token_expires = null,
  sesion_activa = null,
  inicio_sesion = null,
  fin_sesion = null
}) {
  const res = await pool.query(
    `UPDATE usuario_login
     SET failed_attempts = COALESCE($1, failed_attempts),
         blocked_until = COALESCE($2, blocked_until),
         ultimo_login = COALESCE($3, ultimo_login),
         latitud = COALESCE($4, latitud),
         longitud = COALESCE($5, longitud),
         token = COALESCE($6, token),
         token_expires = COALESCE($7, token_expires),
         sesion_activa = COALESCE($8, sesion_activa),
         inicio_sesion = COALESCE($9, inicio_sesion),
         fin_sesion = COALESCE($10, fin_sesion)
     WHERE usuario_id = $11
     RETURNING usuario_id, failed_attempts, blocked_until, ultimo_login, latitud, longitud, token, token_expires, sesion_activa, inicio_sesion, fin_sesion`,
    [failed_attempts, blocked_until, ultimo_login, latitud, longitud, token, token_expires, sesion_activa, inicio_sesion, fin_sesion, usuario_id]
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

static async guardarToken(usuario_id, token, expiracion = null) {
  const ahora = new Date();
  const fin = expiracion || new Date(ahora.getTime() + 5 * 60000); // 5 minutos por defecto

  // Primero revisa si ya existe un token activo
  const check = await pool.query(
    `SELECT token, token_expires, sesion_activa
     FROM usuario_login 
     WHERE usuario_id = $1`,
    [usuario_id]
  );

  if (check.rows.length > 0) {
    const row = check.rows[0];
    if (row.sesion_activa && row.token_expires && new Date(row.token_expires) > ahora) {
      return {
        usuario_id,
        token: row.token,
        token_expires: row.token_expires,
        sesion_activa: row.sesion_activa,
        inicio_sesion: row.inicio_sesion,
        fin_sesion: row.fin_sesion
      };
    }
  }

  const res = await pool.query(
    `UPDATE usuario_login
     SET token = $1,
         token_expires = $2,
         sesion_activa = TRUE,
         inicio_sesion = NOW(),
         fin_sesion = $3
     WHERE usuario_id = $4
     RETURNING usuario_id, token, token_expires, sesion_activa, inicio_sesion, fin_sesion`,
    [token, fin, fin, usuario_id]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0];
}



static async obtenerLogin(usuario_id) {
  const res = await pool.query(
    `SELECT usuario_id, token, token_expires, sesion_activa, inicio_sesion, fin_sesion
     FROM usuario_login
     WHERE usuario_id = $1`,
    [usuario_id]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  return {
    ...row,
    inicio_sesion: row.inicio_sesion ? new Date(row.inicio_sesion) : null,
    fin_sesion: row.fin_sesion ? new Date(row.fin_sesion) : null
  };
  try {
    // Abrimos una transacción para usar FOR UPDATE
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Inicia la transacción

      // Bloquea la fila para evitar que otras solicitudes la lean hasta terminar
      const res = await client.query(
        `SELECT usuario_id, token, token_expires, sesion_activa, inicio_sesion, fin_sesion 
         FROM usuario_login 
         WHERE usuario_id = $1 
         FOR UPDATE`,
        [usuario_id]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      await client.query('COMMIT'); // Confirmamos la transacción
      return {
        ...row,
        inicio_sesion: row.inicio_sesion ? new Date(row.inicio_sesion) : null,
        fin_sesion: row.fin_sesion ? new Date(row.fin_sesion) : null
      };
    } catch (err) {
      await client.query('ROLLBACK'); // Revertir si hay error
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[obtenerLogin] ERROR:', err);
    return null;
  }
}




  static async obtenerTokenActivo(correo) {
  const res = await pool.query(
    `SELECT ul.token, ul.token_expires
     FROM usuarios u
     JOIN usuario_login ul ON ul.usuario_id = u.id
     WHERE u.correo = $1`,
    [correo]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  // Verifica que el token no haya expirado
  if (!row.token) return null;
  if (row.token_expires && new Date(row.token_expires) < new Date()) return null;

  return row.token;
}

static async buscarPorToken(token) {
  try {
    const res = await pool.query(
      `SELECT u.id, u.correo, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono,
              ul.sesion_activa, ul.token, ul.token_expires, ul.inicio_sesion, ul.fin_sesion
       FROM usuarios u
       JOIN usuario_login ul ON ul.usuario_id = u.id
       WHERE ul.token = $1`,
      [token]
    );

    console.log("[buscarPorToken] Resultado query:", res.rows);

    if (res.rows.length === 0) return null;

    const u = res.rows[0];
    return {
      id: u.id,
      correo: u.correo,
      rol: u.rol,
      estado: u.estado,
      nombre: u.nombre,
      app: u.app,
      apm: u.apm,
      telefono: u.telefono,
      sesion_activa: u.sesion_activa,
      token: u.token,
      token_expires: u.token_expires ? new Date(u.token_expires) : null,
      inicio_sesion: u.inicio_sesion ? new Date(u.inicio_sesion) : null,
      fin_sesion: u.fin_sesion ? new Date(u.fin_sesion) : null
    };
  } catch (err) {
    console.error("[buscarPorToken] ERROR:", err);
    return null;
  }
}











}

module.exports = UsuarioService;