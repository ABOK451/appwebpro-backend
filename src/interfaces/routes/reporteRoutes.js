const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reporteController');

router.post('/reporte/inventario', ReportController.inventarioActual);
router.post('/reporte/mas-vendidos', ReportController.masVendidos);
router.post('/reporte/bajo-stock', ReportController.bajoStock);
router.post('/reporte/movimientos-periodo', ReportController.movimientosPeriodo);

router.post('/reporte/export', ReportController.exportReport);

router.post('/reporte/dashboard/mas-vendidos', ReportController.dashboardMasVendidos);
router.post('/reporte/dashboard/valor-inventario', ReportController.dashboardValorInventario);

router.post('/reporte/recalculate/all', ReportController.recalculateAll);
router.post('/reporte/recalculate/by-codigo', ReportController.recalculateByCodigo);

module.exports = router;
