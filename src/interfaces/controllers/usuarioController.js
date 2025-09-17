const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt'); 


const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.listar();
    res.json({ mensaje: "Usuarios listados con éxito", usuarios });
  } catch (error) {
    res.status(500).json({ error: `Error al listar usuarios: ${error.message}` });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;

    if (!correo || !password || !rol || !estado || !nombre || !telefono) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: "El correo no es válido" });
    }
    if (!/^\+\d{1,3}\d{10}$/.test(telefono)) {
      return res.status(400).json({ error: "El teléfono debe incluir código de país y 10 dígitos, ejemplo +521234567890" });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });
    }
    if (!nombreRegex.test(nombre)) {
      return res.status(400).json({ error: "El nombre solo puede contener letras (con acentos permitidos) y espacios, sin números ni caracteres especiales" });
    }
    if (app && !nombreRegex.test(app)) {
      return res.status(400).json({ error: "El apellido paterno solo puede contener letras (con acentos permitidos), sin números ni caracteres especiales" });
    }
    if (apm && !nombreRegex.test(apm)) {
      return res.status(400).json({ error: "El apellido materno solo puede contener letras (con acentos permitidos), sin números ni caracteres especiales" });
    }

    // 🔹 Aquí se llama al servicio para crear el usuario
    const nuevoUsuario = await UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono });

    res.status(201).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario });

  } catch (error) {
    // Captura el error de clave duplicada de PostgreSQL
    if (error.code === '23505' && error.detail && error.detail.includes('correo')) {
      return res.status(400).json({ error: "El correo ya existe, no se puede repetir" });
    }

    res.status(500).json({ error: `Error al crear usuario: ${error.message}` });
  }
};



const eliminarUsuario = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido para eliminar un usuario" });

    const usuarioEliminado = await UsuarioService.eliminar({ correo });
    if (!usuarioEliminado) return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });

    res.json({ mensaje: `Usuario ${usuarioEliminado.nombre} eliminado con éxito` });
  } catch (error) {
    res.status(500).json({ error: `Error al eliminar usuario: ${error.message}` });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { correo, password, telefono, nombre, app, apm } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo del usuario a actualizar es requerido" });

    if (telefono && !/^\+\d{1,3}\d{10}$/.test(telefono)) {
      return res.status(400).json({ error: "El teléfono debe incluir código de país y 10 dígitos" });
    }
    if (password && !passwordRegex.test(password)) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });
    }
    if (nombre && !nombreRegex.test(nombre)) {
      return res.status(400).json({ error: "El nombre no debe contener números ni caracteres especiales" });
    }
    if (app && !nombreRegex.test(app)) {
      return res.status(400).json({ error: "El apellido paterno no debe contener números ni caracteres especiales" });
    }
    if (apm && !nombreRegex.test(apm)) {
      return res.status(400).json({ error: "El apellido materno no debe contener números ni caracteres especiales" });
    }

    const datosActualizar = { ...req.body };
    if (password) datosActualizar.password = await bcrypt.hash(password, 10);

    const usuarioActualizado = await UsuarioService.actualizar(correo, datosActualizar);
    if (!usuarioActualizado) return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });

    res.json({ mensaje: "Usuario actualizado con éxito", usuario: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ error: `Error al actualizar usuario: ${error.message}` });
  }
};





module.exports = {
  listarUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario
};
