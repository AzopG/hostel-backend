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

// =====================================================
// HU17: RESERVAR UN SALÓN
// =====================================================

// HU17 CA1: Iniciar reserva de salón - Obtener resumen y formulario
router.post('/salones/:salonId/iniciar', reservaController.iniciarReservaSalon);

// HU17 CA2: Verificar disponibilidad en tiempo real (prevenir conflictos)
router.post('/salones/:salonId/verificar-disponibilidad', reservaController.verificarDisponibilidadSalonTiempoReal);

// HU17 CA3: Confirmar reserva de salón (genera código y bloquea horario)
router.post('/salones/:salonId/confirmar', reservaController.confirmarReservaSalon);

// HU17 CA4: Obtener políticas de reserva de salones
router.get('/salones/politicas/:hotelId', reservaController.obtenerPoliticasReservaSalon);
router.get('/salones/politicas', reservaController.obtenerPoliticasReservaSalon);

module.exports = router;