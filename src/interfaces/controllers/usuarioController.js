const UsuarioService = require('../../application/usuarioService');

// Listar todos los usuarios en formato JSON
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.listar();
    res.json(usuarios); // ⚡ Devuelve JSON para Swagger / Postman
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mostrar formulario ya no es necesario para API, pero lo dejamos con info mínima
const mostrarFormulario = (req, res) => {
  res.json({
    message: "Para crear un usuario, envía un POST a /usuarios/nuevo con nombre, email, password y rol"
  });
};

// Crear un nuevo usuario vía POST, devuelve el usuario creado en JSON
const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const nuevoUsuario = await UsuarioService.crear({ nombre, email, password, rol });
    res.status(201).json(nuevoUsuario); // Devuelve el usuario creado
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { listarUsuarios, mostrarFormulario, crearUsuario };
