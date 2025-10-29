const express = require('express');
const { crearProducto, listarProductos, actualizarProducto, eliminarProducto, listarPorNombre, listarPorCategoria, listarPorProveedor } = require('../controllers/productoController');
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');




router.post('/productos/crear', extenderSesion,crearProducto);
router.get('/productos/listar', extenderSesion,listarProductos);
router.get('/productos/filtro/nombre/:nombre', extenderSesion,listarPorNombre);
router.get('/productos/filtro/categoria/:categoria', extenderSesion,listarPorCategoria);
router.get('/productos/filtro/proveedor/:proveedor', extenderSesion,listarPorProveedor);
router.put('/productos/actualizar', extenderSesion,actualizarProducto);
router.delete('/productos/eliminar', extenderSesion,eliminarProducto);

module.exports = router;