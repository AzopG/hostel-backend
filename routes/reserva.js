const express = require('express');
const router = express.Router();
const Reserva = require('../models/Reserva');
const { auth } = require('../middleware/auth');
const reservaController = require('../controllers/reservaController');

// Obtener todas las reservas (usar el controller)
router.get('/', reservaController.obtenerTodasReservas);

// HU08: Obtener reserva por código (acceso público)
router.get('/codigo/:codigo', reservaController.obtenerReservaPorCodigo);

// HU08 CA1 + CA2: Crear reserva (SIN auth para huéspedes no registrados)
router.post('/', reservaController.crearReserva);

// HU10 CA2: Verificar políticas de cancelación antes de cancelar
router.get('/cancelar/:id/verificar', reservaController.verificarPoliticasCancelacion);

// HU10: Cancelar reserva (CA1 + CA2 + CA3 + CA4)
router.put('/cancelar/:id', reservaController.cancelarReserva);

// HU09: Verificar si puede modificar (CA1 + CA4)
router.get('/:id/puede-modificar', reservaController.verificarPuedeModificar);

// HU09: Modificar fechas de reserva (CA1 + CA2 + CA3 + CA4)
router.put('/:id/modificar-fechas', reservaController.modificarFechasReserva);

module.exports = router;