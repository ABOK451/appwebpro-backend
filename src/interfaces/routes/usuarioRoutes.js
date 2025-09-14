const express = require('express');
const router = express.Router();
const { listarUsuarios, mostrarFormulario, crearUsuario, eliminarUsuario, actualizarUsuario, loginUsuario, solicitarReset, resetConCodigo } = require('../controllers/usuarioController');

router.get('/usuarios', listarUsuarios);
router.get('/usuarios/nuevo', mostrarFormulario);
router.post('/usuarios/nuevo', crearUsuario);
router.delete('/usuarios/eliminar', eliminarUsuario); 
router.put('/usuarios/actualizar', actualizarUsuario);
router.post('/usuarios/login', loginUsuario);
router.post('/usuarios/solicitar-reset', solicitarReset);
router.post('/usuarios/reset-con-codigo', resetConCodigo); 


module.exports = router;
