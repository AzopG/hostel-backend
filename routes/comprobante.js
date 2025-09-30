const express = require('express');
const router = express.Router();
const comprobanteController = require('../controllers/comprobanteController');

// HU11 CA1: Obtener comprobante en formato JSON (para visualización web)
router.get('/:codigoReserva', comprobanteController.obtenerComprobanteHTML);

// HU11 CA2: Descargar comprobante en PDF
router.get('/:codigoReserva/pdf', comprobanteController.descargarComprobantePDF);

// HU11 CA4: Obtener historial de comprobantes del usuario
router.get('/usuario/:usuarioId/historial', comprobanteController.obtenerHistorialComprobantes);

module.exports = router;
