const express = require("express");
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');
const { listarUsuarios, crearUsuario, eliminarUsuario, actualizarUsuario } = require('../controllers/usuarioController');

router.get('/usuarios', extenderSesion, listarUsuarios);
router.post('/usuarios/nuevo', extenderSesion, crearUsuario);
router.delete('/usuarios/eliminar', extenderSesion, eliminarUsuario);
router.put('/usuarios/actualizar', extenderSesion, actualizarUsuario);

module.exports = router;
