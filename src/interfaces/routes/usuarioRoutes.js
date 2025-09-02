const express = require('express');
const router = express.Router();
const { listarUsuarios, mostrarFormulario, crearUsuario } = require('../controllers/usuarioController');

router.get('/usuarios', listarUsuarios);
router.get('/usuarios/nuevo', mostrarFormulario);
router.post('/usuarios/nuevo', crearUsuario);

module.exports = router;
