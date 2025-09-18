const express = require('express');
const router = express.Router();
const Reserva = require('../models/Reserva');
const { auth } = require('../middleware/auth');
const reservaController = require('../controllers/reservaController');

// Consultar reservas por usuario, hotel, estado, fechas
router.get('/', auth, async (req, res) => {
  try {
    const { usuario, hotel, estado, fechaInicio, fechaFin } = req.query;
    const filtro = {};
    if (usuario) filtro.usuario = usuario;
    if (hotel) filtro.hotel = hotel;
    if (estado) filtro.estado = estado;
    if (fechaInicio && fechaFin) filtro.fechaInicio = { $gte: fechaInicio, $lte: fechaFin };
    const reservas = await Reserva.find(filtro).populate('usuario hotel habitacion salon paquete');
    res.json(reservas);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener reservas', error: err.message });
  }
});

// Crear reserva con lógica de inventario
router.post('/', auth, reservaController.crearReserva);

// Cancelar reserva
router.put('/cancelar/:id', auth, reservaController.cancelarReserva);

module.exports = router;