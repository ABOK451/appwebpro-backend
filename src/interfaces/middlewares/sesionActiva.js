const UsuarioService = require('../../application/usuarioService');
const pool = require('../../infrastructure/db');
const errorResponse = require('../../helpers/errorResponse');

const verificarSesionActiva = async (req, res, next) => {
  const correo = req.body?.correo;
  console.log("[verificarSesionActiva] Inicio de verificación para correo:", correo);

  if (!correo) {
    console.log("[verificarSesionActiva] FALTA_CORREO");
    return res.status(200).json(
      errorResponse("FALTA_CORREO", "Correo es requerido", null, 2)
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const usuarioRes = await client.query(
      `SELECT * FROM usuarios WHERE correo = $1 FOR UPDATE`,
      [correo]
    );
    const usuario = usuarioRes.rows[0];

    if (!usuario) {
      await client.query('ROLLBACK');
      console.log("[verificarSesionActiva] Usuario no encontrado:", correo);
      return res.status(200).json(
        errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3)
      );
    }

    const loginRes = await client.query(
      `SELECT * FROM usuario_login WHERE usuario_id = $1 FOR UPDATE`,
      [usuario.id]
    );
    const login = loginRes.rows[0];
    const ahora = new Date();

    if (login && login.sesion_activa && login.fin_sesion > ahora) {
      await client.query('COMMIT');
      console.log("[verificarSesionActiva] Sesión sigue activa");

      const tiempoRestanteMin = Math.ceil((new Date(login.fin_sesion) - ahora) / 60000); // minutos

      return res.status(200).json({
        mensaje: "Ya existe una sesión activa",
        codigo: 0,
        token: login.token,
        tiempo_restante_min: tiempoRestanteMin
      });
    }

    console.log("[verificarSesionActiva] No hay sesión activa o expiró, continuando...");
    await client.query('COMMIT');
    next();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("[verificarSesionActiva] ERROR:", error);
    return res.status(200).json(
      errorResponse("ERROR_SERVIDOR", "Error al verificar sesión activa", error.message, 3)
    );
  } finally {
    client.release();
  }
};


const extenderSesion = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1]; 
    console.log("[extenderSesion] Authorization header:", req.headers['authorization']);

    if (!token) {
      console.log("[extenderSesion] No se proporcionó token");
      return res.status(200).json({ 
        codigo: 3, 
        error: { 
          codigo: "SESION_NO_INICIADA", 
          mensaje: "No se pudo obtener la sesión. Necesitas iniciar sesión.", 
          detalle: null 
        } 
      });
    }

    console.log("[extenderSesion] Token encontrado:", token);

    const usuario = await UsuarioService.buscarPorToken(token);
    console.log("[extenderSesion] Usuario obtenido por token:", usuario);

    if (!usuario || !usuario.sesion_activa) {
      console.log("[extenderSesion] Usuario no encontrado o sesión inactiva");
      return res.status(200).json({ 
        codigo: 3, 
        error: { 
          codigo: "SESION_INACTIVA", 
          mensaje: "La sesión no está activa. Necesitas iniciar sesión nuevamente.", 
          detalle: null 
        } 
      });
    }

    const ahora = new Date();

    if (usuario.fin_sesion && usuario.fin_sesion > ahora) {
      // Sesión activa → extender
      const nuevaFin = new Date(ahora.getTime() + 3 * 60000); // +3 min
      await UsuarioService.actualizarLogin(usuario.id, { fin_sesion: nuevaFin });
      console.log(`[extenderSesion] Sesión extendida hasta ${nuevaFin}`);

      const tiempoRestanteMin = Math.ceil((nuevaFin - ahora) / 60000);

      // Guardamos info en req para usarla en la siguiente ruta
      req.tokenExtendido = usuario.token;
      req.tiempoRestanteMin = tiempoRestanteMin;

      // Llamamos a next para que la ruta se ejecute
      next();

    } else {
      // Sesión expirada → cerrar
      await UsuarioService.actualizarLogin(usuario.id, { 
        sesion_activa: false, 
        fin_sesion: null 
      });
      console.log("[extenderSesion] Sesión expiró, se cerró correctamente");
      return res.status(401).json({ 
        codigo: 3, 
        error: { 
          codigo: "SESION_EXPIRADA", 
          mensaje: "La sesión expiró. Necesitas iniciar sesión nuevamente.", 
          detalle: null 
        } 
      });
    }

  } catch (err) {
    console.error("[extenderSesion] Error:", err);
    return res.status(200).json({ 
      codigo: 3, 
      error: { 
        codigo: "ERROR_SERVIDOR", 
        mensaje: "Error al validar la sesión", 
        detalle: err.message 
      } 
    });
  }
};


module.exports = { verificarSesionActiva, extenderSesion };
