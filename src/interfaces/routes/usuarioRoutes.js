const express = require('express');
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');

const { listarUsuarios,  crearUsuario, eliminarUsuario, actualizarUsuario } = require('../controllers/usuarioController');


router.get('/usuarios',  listarUsuarios);
router.post('/usuarios/nuevo',  crearUsuario);
router.delete('/usuarios/eliminar',  eliminarUsuario); 
router.put('/usuarios/actualizar',  actualizarUsuario);




module.exports = router;
