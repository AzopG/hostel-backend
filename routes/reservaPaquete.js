const express = require('express');
const router = express.Router();
const reservaPaqueteController = require('../controllers/reservaPaqueteController');
const { auth, requireRole } = require('../middleware/auth');

/**
 * RUTAS PARA RESERVAS DE PAQUETES EMPRESARIALES
 * Acceso para usuarios autenticados
 */

// Listar paquetes disponibles para reservar
// GET /api/reservas-paquetes/disponibles?hotelId=&fechaInicio=&fechaFin=&numeroAsistentes=
router.get('/disponibles',
  auth,
  reservaPaqueteController.listarPaquetesDisponibles
);

// Obtener detalles de un paquete específico
// GET /api/reservas-paquetes/paquete/:paqueteId
router.get('/paquete/:paqueteId',
  auth,
  reservaPaqueteController.obtenerDetallePaquete
);

// Crear nueva reserva de paquete
// POST /api/reservas-paquetes
router.post('/',
  auth,
  requireRole('empresa', 'cliente', 'admin_hotel', 'admin_central'),
  reservaPaqueteController.crearReservaPaquete
);

// Listar mis reservas de paquetes
// GET /api/reservas-paquetes/mis-reservas?estado=&limit=&offset=
router.get('/mis-reservas',
  auth,
  reservaPaqueteController.listarMisReservasPaquetes
);

// Obtener detalle de una reserva específica
// GET /api/reservas-paquetes/:reservaId
router.get('/:reservaId',
  auth,
  reservaPaqueteController.obtenerDetalleReserva
);

// Modificar reserva de paquete
// PUT /api/reservas-paquetes/:reservaId
router.put('/:reservaId',
  auth,
  requireRole('empresa', 'cliente', 'admin_hotel', 'admin_central'),
  reservaPaqueteController.modificarReservaPaquete
);

// Cancelar reserva de paquete
// DELETE /api/reservas-paquetes/:reservaId
router.delete('/:reservaId',
  auth,
  requireRole('empresa', 'cliente', 'admin_hotel', 'admin_central'),
  reservaPaqueteController.cancelarReservaPaquete
);

// =====================================================
// GESTIÓN PARA ADMINISTRADORES DE HOTEL
// =====================================================

// Listar todas las reservas de paquetes del hotel
// GET /api/reservas-paquetes/hotel/todas?estado=&limit=&offset=
router.get('/hotel/todas',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  reservaPaqueteController.listarReservasHotel
);

// Confirmar reserva de paquete
// PUT /api/reservas-paquetes/:reservaId/confirmar
router.put('/:reservaId/confirmar',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  reservaPaqueteController.confirmarReservaPaquete
);

// Rechazar reserva de paquete
// PUT /api/reservas-paquetes/:reservaId/rechazar
router.put('/:reservaId/rechazar',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  reservaPaqueteController.rechazarReservaPaquete
);

module.exports = router;