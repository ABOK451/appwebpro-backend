const express = require('express');
const router = express.Router();
const { listarUsuarios, mostrarFormulario, crearUsuario, eliminarUsuario, actualizarUsuario, loginUsuario, recuperarPassword, resetPassword } = require('../controllers/usuarioController');

router.get('/usuarios', listarUsuarios);
router.get('/usuarios/nuevo', mostrarFormulario);
router.post('/usuarios/nuevo', crearUsuario);
router.delete('/usuarios/eliminar', eliminarUsuario); 
router.put('/usuarios/actualizar', actualizarUsuario);
router.post('/usuarios/login', loginUsuario);
router.post('/usuarios/recuperar', recuperarPassword); 
router.post('/usuarios/reset', resetPassword); 


module.exports = router;
