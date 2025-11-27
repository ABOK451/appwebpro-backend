const UsuarioService = require('../../application/usuarioService');
const pool = require('../../infrastructure/db');
const errorResponse = require('../../helpers/errorResponse');

const verificarSesionActiva = async (req, res, next) => {
  const correo = req.body?.correo;
  console.log("[verificarSesionActiva] Inicio. Correo recibido:", correo);

  if (!correo) {
    console.log("[verificarSesionActiva] ERROR: Falta correo.");
    return res.status(400).json(
      errorResponse("Correo es requerido", null, 2)
    );
  }

  let client;

  try {
    client = await pool.connect();

    const usuarioRes = await client.query(
      `SELECT * FROM usuarios WHERE correo = $1`,
      [correo]
    );
    const usuario = usuarioRes.rows[0];

    if (!usuario) {
      console.log("[verificarSesionActiva] Usuario NO encontrado:", correo);
      return res.status(404).json(
        errorResponse("Usuario no encontrado", null, 3)
      );
    }

    const loginRes = await client.query(
      `SELECT * FROM usuario_login WHERE usuario_id = $1`,
      [usuario.id]
    );
    const login = loginRes.rows[0];

    const ahora = new Date();

    if (login) login.fin_sesion = login.fin_sesion ? new Date(login.fin_sesion) : null;

    if (login && login.sesion_activa && login.fin_sesion > ahora) {
      console.log("[verificarSesionActiva] Sesión activa detectada.");

      const tiempoRestanteMin = Math.ceil((login.fin_sesion - ahora) / 60000);

      return res.status(200).json({
        mensaje: "Ya existe una sesión activa",
        codigo: 0,
        token: login.token,
        tiempo_restante_min: tiempoRestanteMin
      });
    }

    console.log("[verificarSesionActiva] No hay sesión activa. Continuando...");
    next();

  } catch (error) {
    console.error("[verificarSesionActiva] ERROR:", error);
    return res.status(500).json(
      errorResponse("Error al verificar sesión activa", error.message, 5)
    );
  } finally {
    if (client) client.release();
  }
};


 const extenderSesion = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      console.log("[extenderSesion] ERROR: Token no recibido");
      return res.status(401).json(errorResponse("Token no enviado. Inicia sesión.", null, 1));
    }

    const usuario = await UsuarioService.buscarPorToken(token);

    if (!usuario || !usuario.sesion_activa) {
      console.log("[extenderSesion] Sesión NO activa");
      return res.status(401).json(errorResponse("Sesión no activa. Inicia sesión nuevamente.", null, 2));
    }

    const ahora = new Date();
    const finActual = new Date(usuario.fin_sesion);

    if (finActual > ahora) {
      const nuevaFin = new Date(finActual.getTime() + 3 * 60000);
      await UsuarioService.actualizarLogin(usuario.id, { fin_sesion: nuevaFin });

      req.tiempo_restante_min = Math.ceil((nuevaFin - ahora) / 60000);

      console.log("[extenderSesion] Sesión extendida. Minutos restantes:", req.tiempo_restante_min);
      return next();
    }

    console.log("[extenderSesion] Sesión expiró.");

    await UsuarioService.actualizarLogin(usuario.id, {
      sesion_activa: false,
      fin_sesion: null
    });

    return res.status(440).json( // 440 = Login Timeout
      errorResponse("La sesión expiró. Inicia sesión nuevamente.", null, 3)
    );

  } catch (err) {
    console.error("[extenderSesion] ERROR:", err);
    return res.status(500).json(errorResponse("Error al validar sesión", err.message, 5));
  }
};



module.exports = { verificarSesionActiva, extenderSesion };
