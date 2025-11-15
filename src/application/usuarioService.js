const pool = require('../infrastructure/db');
const Usuario = require('../domain/usuario');
const bcrypt = require('bcrypt');

class UsuarioService {

  static listar() {
    return pool.query(
      'SELECT id, correo, rol, estado, nombre, app, apm, telefono FROM usuarios ORDER BY id'
    )
    .then(res => res.rows.map(u => new Usuario(u.id, u.correo, null, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono)))
    .catch(err => { console.error("[listar] ERROR:", err); throw err; });
  }

  static crear({ correo, password, rol, estado, nombre, app, apm, telefono }) {
  return bcrypt.hash(password, 10, { version: 'a' })   // <--- fuerza $2a$
    .then(hash => pool.query(
      `INSERT INTO usuarios (correo, password, rol, estado, nombre, app, apm, telefono)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, correo, password, rol, estado, nombre, app, apm, telefono`,
      [correo, hash, rol, estado, nombre, app, apm, telefono]
    )
    .then(res => {
      const u = res.rows[0];

      return pool.query(
        `INSERT INTO usuario_login (usuario_id, failed_attempts, blocked_until)
         VALUES ($1, 0, NULL)`,
        [u.id]
      )
      .then(() => new Usuario(
        u.id,
        u.correo,
        u.password,
        u.rol,
        u.estado,
        u.nombre,
        u.app,
        u.apm,
        u.telefono
      ));
    }))
    .catch(error => {
      console.error("[crear] ERROR:", error);
      if (error.code === '23505' && error.detail?.includes('correo')) {
        throw new Error('El correo ya existe, no se puede repetir');
      }
      throw new Error(error.message || 'Error desconocido al crear usuario');
    });
}



  static actualizarLogin(usuario_id, {
    failed_attempts=null, blocked_until=null, ultimo_login=null,
    latitud=null, longitud=null, token=null, token_expires=null,
    sesion_activa=null, inicio_sesion=null, fin_sesion=null
  }) {
    return pool.query(
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
       RETURNING *`,
      [failed_attempts, blocked_until, ultimo_login, latitud, longitud, token, token_expires, sesion_activa, inicio_sesion, fin_sesion, usuario_id]
    )
    .then(res => res.rows[0] || null)
    .catch(err => { console.error("[actualizarLogin] ERROR:", err); throw err; });
  }

  static actualizar(correoBuscado, { correo, password, rol, estado, nombre, app, apm, telefono, passwordHash }) {
    let promHash;
    if (passwordHash) {
      promHash = Promise.resolve(passwordHash);
    } else if (password) {
      promHash = /^\$2[aby]\$/.test(password) ? Promise.resolve(password) : bcrypt.hash(password, 10);
    } else {
      promHash = Promise.resolve(null);
    }

    return promHash.then(hashFinal => 
      pool.query(
        `UPDATE usuarios
         SET correo=COALESCE($1,correo), password=COALESCE($2,password),
             rol=COALESCE($3,rol), estado=COALESCE($4,estado),
             nombre=COALESCE($5,nombre), app=COALESCE($6,app),
             apm=COALESCE($7,apm), telefono=COALESCE($8,telefono)
         WHERE correo=$9
         RETURNING *`,
        [correo, hashFinal, rol, estado, nombre, app, apm, telefono, correoBuscado]
      )
      .then(res => {
        if (res.rows.length === 0) return null;
        const u = res.rows[0];
        return new Usuario(u.id, u.correo, hashFinal || u.password, u.rol, u.estado, u.nombre, u.app, u.apm, u.telefono);
      })
    )
    .catch(err => { console.error("[actualizar] ERROR:", err); throw err; });
  }

  static actualizarPassword(usuario_id, passwordHash) {
    return pool.query(
      `UPDATE usuarios SET password=$1 WHERE id=$2`,
      [passwordHash, usuario_id]
    )
    .catch(err => { console.error("[actualizarPassword] ERROR:", err); throw err; });
  }

  static eliminar({ correo }) {
    return pool.query(
      `DELETE FROM usuarios WHERE correo=$1 RETURNING *`,
      [correo]
    )
    .then(res => res.rows.length ? new Usuario(...Object.values(res.rows[0])) : null)
    .catch(err => { console.error("[eliminar] ERROR:", err); throw err; });
  }

  static buscarPorCorreo(correo) {
    return pool.query(
      `SELECT u.id,u.correo,u.password,u.rol,u.estado,u.nombre,u.app,u.apm,u.telefono,
              ul.failed_attempts, ul.blocked_until
       FROM usuarios u
       LEFT JOIN usuario_login ul ON ul.usuario_id = u.id
       WHERE u.correo=$1`,
      [correo]
    )
    .then(res => {
      if (!res.rows.length) return null;
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
    })
    .catch(err => { console.error("[buscarPorCorreo] ERROR:", err); throw err; });
  }

  static guardarToken(usuario_id, token, expiracion=null) {
    const ahora = new Date();
    const fin = expiracion || new Date(ahora.getTime() + 5 * 60000);

    return pool.query(
      `SELECT token, token_expires, sesion_activa FROM usuario_login WHERE usuario_id=$1`,
      [usuario_id]
    )
    .then(check => {
      if (check.rows.length) {
        const row = check.rows[0];
        if (row.sesion_activa && row.token_expires && new Date(row.token_expires) > ahora) {
          return { usuario_id, ...row };
        }
      }
      return pool.query(
        `UPDATE usuario_login
         SET token=$1, token_expires=$2, sesion_activa=TRUE, inicio_sesion=NOW(), fin_sesion=$3
         WHERE usuario_id=$4
         RETURNING usuario_id, token, token_expires, sesion_activa, inicio_sesion, fin_sesion`,
        [token, fin, fin, usuario_id]
      )
      .then(res => res.rows[0] || null);
    })
    .catch(err => { console.error("[guardarToken] ERROR:", err); throw err; });
  }

  static obtenerLogin(usuario_id) {
    return pool.query(
      `SELECT * FROM usuario_login WHERE usuario_id=$1`,
      [usuario_id]
    )
    .then(res => {
      if (!res.rows.length) return null;
      const row = res.rows[0];
      return {
        ...row,
        inicio_sesion: row.inicio_sesion ? new Date(row.inicio_sesion) : null,
        fin_sesion: row.fin_sesion ? new Date(row.fin_sesion) : null
      };
    })
    .catch(err => { console.error("[obtenerLogin] ERROR:", err); throw err; });
  }

  static obtenerTokenActivo(correo) {
    return pool.query(
      `SELECT ul.token, ul.token_expires
       FROM usuarios u
       JOIN usuario_login ul ON ul.usuario_id=u.id
       WHERE u.correo=$1`,
      [correo]
    )
    .then(res => {
      if (!res.rows.length) return null;
      const row = res.rows[0];
      if (!row.token || (row.token_expires && new Date(row.token_expires) < new Date())) return null;
      return row.token;
    })
    .catch(err => { console.error("[obtenerTokenActivo] ERROR:", err); throw err; });
  }

  static buscarPorToken(token) {
    return pool.query(
      `SELECT u.id,u.correo,u.rol,u.estado,u.nombre,u.app,u.apm,u.telefono,
              ul.sesion_activa,ul.token,ul.token_expires,ul.inicio_sesion,ul.fin_sesion
       FROM usuarios u
       JOIN usuario_login ul ON ul.usuario_id=u.id
       WHERE ul.token=$1`,
      [token]
    )
    .then(res => {
      if (!res.rows.length) return null;
      const u = res.rows[0];
      return {
        id: u.id, correo: u.correo, rol: u.rol, estado: u.estado,
        nombre: u.nombre, app: u.app, apm: u.apm, telefono: u.telefono,
        sesion_activa: u.sesion_activa,
        token: u.token,
        token_expires: u.token_expires ? new Date(u.token_expires) : null,
        inicio_sesion: u.inicio_sesion ? new Date(u.inicio_sesion) : null,
        fin_sesion: u.fin_sesion ? new Date(u.fin_sesion) : null
      };
    })
    .catch(err => { console.error("[buscarPorToken] ERROR:", err); throw err; });
  }

}

module.exports = UsuarioService;
