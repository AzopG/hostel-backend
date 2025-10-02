const express = require('express');
const router = express.Router();
const Reserva = require('../models/Reserva');
const { auth, requireAdminCentral } = require('../middleware/auth');
const reservaController = require('../controllers/reservaController');


// Obtener todas las reservas (usar el controller)
router.get('/', reservaController.obtenerTodasReservas);

// HU25: Ocupación por hotel y rango de fechas (solo admin central)
router.get('/ocupacion-hotel', auth, requireAdminCentral, reservaController.obtenerOcupacionPorHotel);

// Obtener mis reservas (filtradas por usuario o parámetros)
router.get('/mis-reservas', auth, reservaController.obtenerMisReservas);

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
 // HU09: Modificar fechas de reserva por código
 router.put('/codigo/:codigo/modificar-fechas', reservaController.modificarFechasReservaPorCodigo);

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

// =====================================================
// HU11: RECIBOS Y COMPROBANTES
// =====================================================

// HU11 CA1: Obtener recibo de una reserva (JSON para visualización)
router.get('/:reservaId/recibo', reservaController.obtenerReciboReserva);

// HU11 CA2: Descargar recibo en PDF
router.get('/:reservaId/recibo/pdf', reservaController.descargarReciboPDF);

// HU11: Enviar recibo por email
router.post('/:reservaId/recibo/enviar', reservaController.enviarReciboPorEmail);

// HU12: Reenviar email de confirmación
router.post('/:reservaId/reenviar-email', reservaController.reenviarEmailConfirmacion);

// =====================================================
// GESTIÓN DE RESERVAS PARA HOTELES
// =====================================================

// Confirmar una reserva pendiente (para administradores de hotel)
router.put('/:id/confirmar', reservaController.confirmarReservaPendiente);

// Rechazar una reserva pendiente (para administradores de hotel)
router.put('/:id/rechazar', reservaController.rechazarReservaPendiente);

// Actualizar estado de una reserva (para administradores de hotel)
router.put('/:id/estado', reservaController.actualizarEstadoReserva);

module.exports = router;