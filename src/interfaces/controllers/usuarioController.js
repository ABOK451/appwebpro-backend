const UsuarioService = require('../../application/usuarioService');

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.listar();
    res.json(usuarios); // ⚡ Devuelve JSON para Swagger / Postman
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const mostrarFormulario = (req, res) => {
  res.json({
    message: "Para crear un usuario, envía un POST a /usuarios/nuevo con nombre, email, password y rol"
  });
};

const crearUsuario = async (req, res) => {
  try {
    const { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;
    const nuevoUsuario = await UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono });
    res.status(201).json(nuevoUsuario); 
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { listarUsuarios, mostrarFormulario, crearUsuario };
