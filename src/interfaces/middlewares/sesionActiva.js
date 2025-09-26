const UsuarioService = require('../../application/usuarioService');
const errorResponse = require('../../helpers/errorResponse');

const verificarSesionActiva = async (req, res, next) => {
  try {
    const correo = req.body?.correo;
    console.log("[verificarSesionActiva] Inicio de verificación para correo:", correo);

    if (!correo) {
      console.log("[verificarSesionActiva] FALTA_CORREO");
      return res.status(200).json(
        errorResponse("FALTA_CORREO", "Correo es requerido", null, 2)
      );
    }

    // Buscar usuario
    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) {
      console.log("[verificarSesionActiva] Usuario no encontrado:", correo);
      return res.status(200).json(
        errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3)
      );
    }
    console.log("[verificarSesionActiva] Usuario encontrado:", usuario.id);

    // Obtener login
    const login = await UsuarioService.obtenerLogin(usuario.id);
    const ahora = new Date();
    console.log("[verificarSesionActiva] Login obtenido:", login);

    if (login && login.sesion_activa) {
      // ✅ Ya hay sesión activa
      if (login.fin_sesion && login.fin_sesion > ahora) {
        console.log("[verificarSesionActiva] Sesión sigue activa");
        return res.status(200).json({
          mensaje: "Ya existe una sesión activa",
          codigo: 0,
          token: login.token
        });
      } else {
        // ✅ Sesión expirada → cerrarla
        console.log("[verificarSesionActiva] Sesión expirada, cerrando...");
        await UsuarioService.actualizarLogin(usuario.id, {
          sesion_activa: false,
          fin_sesion: null,
          token: null,
          token_expires: null
        });
        console.log("[verificarSesionActiva] Sesión cerrada correctamente");
      }
    }

    // ✅ Solo si no hay sesión activa → continuar a login
    console.log("[verificarSesionActiva] No hay sesión activa, continuando...");
    next();

  } catch (error) {
    console.error("[verificarSesionActiva] ERROR:", error);
    return res.status(200).json(
      errorResponse("ERROR_SERVIDOR", "Error al verificar sesión activa", error.message, 3)
    );
  }
};



const extenderSesion = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1]; // ejemplo Bearer
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

    // Si todo bien, continuar
    req.usuario = usuario;
    next();

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
