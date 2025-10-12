const InventarioReportService = require('../../application/inventarioReporteService');
const errorResponse = require('../../helpers/errorResponse');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const stream = require('stream');
const moment = require('moment');

function sendPdfBuffer(res, buffer, filename = 'reporte.pdf') {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function sendExcelBuffer(res, buffer, filename = 'reporte.xlsx') {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

const ReportController = {

  // RF2.1 - inventario actual
  inventarioActual(req, res) {
    InventarioReportService.reporteInventarioActual()
      .then(data => res.json({ codigo: 0, mensaje: 'Inventario actual', data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_REPORTE', 'Error al generar inventario actual', err.message)));
  },

  // RF2.1 - mas vendidos
  masVendidos(req, res) {
    const { fecha_inicio, fecha_fin, limit } = req.body || {};
    InventarioReportService.reporteMasVendidos({ fecha_inicio, fecha_fin, limit })
      .then(data => res.json({ codigo: 0, mensaje: 'Productos más vendidos', data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_REPORTE', 'Error al generar reporte de más vendidos', err.message)));
  },

  // RF2.1 - bajo stock
  bajoStock(req, res) {
    const { threshold } = req.body || {};
    InventarioReportService.reporteBajoStock({ threshold })
      .then(data => res.json({ codigo: 0, mensaje: 'Productos con bajo stock', data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_REPORTE', 'Error al generar reporte bajo stock', err.message)));
  },

  // RF2.1 - movimientos por periodo (body: fecha_inicio, fecha_fin, codigo_producto optional)
  movimientosPeriodo(req, res) {
    const { fecha_inicio, fecha_fin, codigo_producto } = req.body || {};
    InventarioReportService.reporteMovimientosPeriodo({ fecha_inicio, fecha_fin, codigo_producto })
      .then(data => res.json({ codigo: 0, mensaje: 'Movimientos por periodo', data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_REPORTE', 'Error al generar movimientos por periodo', err.message)));
  },

  // RF2.2 - exportar reporte a PDF o Excel
  exportReport(req, res) {
    // body: { reportType: 'inventario'|'mas_vendidos'|'bajo_stock'|'movimientos_periodo', params: {...}, format: 'pdf'|'excel' }
    const { reportType, params = {}, format = 'pdf' } = req.body || {};
    InventarioReportService.fetchReportData(reportType, params)
      .then(rows => {
        const now = moment().format('YYYYMMDD_HHmm');
        if (format === 'pdf') {
          // genera PDF simple con PDFKit
          const doc = new PDFDocument({ margin: 30 });
          const buffers = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            sendPdfBuffer(res, pdfData, `${reportType}_${now}.pdf`);
          });

          doc.fontSize(18).text(`Reporte: ${reportType}`, { align: 'center' });
          doc.moveDown();
          // tabla simple
          doc.fontSize(10);
          if (!rows || rows.length === 0) {
            doc.text('No hay datos para este reporte');
            doc.end();
            return;
          }

          // Encabezados dependiendo del reportType
          const keys = Object.keys(rows[0]);
          doc.text(keys.join(' | '));
          doc.moveDown(0.2);
          rows.forEach(r => {
            const line = keys.map(k => (r[k] === null || r[k] === undefined ? '' : String(r[k]))).join(' | ');
            doc.text(line);
          });

          doc.end();

        } else if (format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('Reporte');
          if (!rows || rows.length === 0) {
            sheet.addRow(['No hay datos']);
          } else {
            const keys = Object.keys(rows[0]);
            sheet.addRow(keys);
            rows.forEach(r => sheet.addRow(keys.map(k => r[k])));
          }

          workbook.xlsx.writeBuffer()
            .then(buffer => sendExcelBuffer(res, buffer, `${reportType}_${now}.xlsx`))
            .catch(err => res.status(200).json(errorResponse('ERROR_EXPORT', 'Error al generar Excel', err.message)));

        } else {
          return res.status(200).json(errorResponse('FORMAT_INVALID', 'Formato de exportación inválido', `format=${format}`));
        }
      })
      .catch(err => res.status(200).json(errorResponse('ERROR_REPORTE', 'Error al obtener datos para exportar', err.message)));
  },

  // RF2.3 - endpoints para dashboards
  dashboardMasVendidos(req, res) {
    const { fecha_inicio, fecha_fin, limit } = req.body || {};
    InventarioReportService.dashboardMasVendidos({ periodo: { fecha_inicio, fecha_fin }, limit })
      .then(data => res.json({ codigo: 0, data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_DASHBOARD', 'Error al obtener datos dashboard', err.message)));
  },

  dashboardValorInventario(req, res) {
    InventarioReportService.dashboardValorInventario()
      .then(data => res.json({ codigo: 0, data }))
      .catch(err => res.status(200).json(errorResponse('ERROR_DASHBOARD', 'Error al obtener valor del inventario', err.message)));
  },

  // RF2.4 - endpoint para forzar recálculo (puedes llamar esto desde hooks cuando se crea/actualiza movimientos)
  recalculateAll(req, res) {
    InventarioReportService.recalculateAllStocks()
      .then(updated => res.json({ codigo: 0, mensaje: 'Stocks recalculados', updated }))
      .catch(err => res.status(200).json(errorResponse('ERROR_RECALC', 'Error al recalcular stocks', err.message)));
  },

  recalculateByCodigo(req, res) {
    const { codigo } = req.body || {};
    if (!codigo) return res.status(200).json(errorResponse('VALIDACION_DATOS', 'Falta el campo codigo'));
    InventarioReportService.recalculateStockByCodigo(codigo)
      .then(p => res.json({ codigo: 0, mensaje: 'Stock recalculado', producto: p }))
      .catch(err => res.status(200).json(errorResponse('ERROR_RECALC', 'Error al recalcular stock', err.message)));
  }

};

module.exports = ReportController;
