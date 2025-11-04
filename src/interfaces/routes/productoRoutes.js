const express = require('express');
const { crearProducto, listarProductos, actualizarProducto, eliminarProducto, listarPorNombre, listarPorCategoria, listarPorProveedor } = require('../controllers/productoController');
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');




router.post('/productos/crear',extenderSesion, crearProducto);
router.get('/productos/listar',extenderSesion, listarProductos);  
router.post('/productos/filtrar',extenderSesion, listarPorCampo); 
router.put('/productos/actualizar',extenderSesion, actualizarProducto);
router.delete('/productos/eliminar',extenderSesion, eliminarProducto);


module.exports = router;