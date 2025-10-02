const express = require('express');
const router = express.Router();
const Habitacion = require('../models/Habitacion');
const habitacionController = require('../controllers/habitacionController');

// Consultar habitaciones por hotel y filtros
router.get('/', async (req, res) => {
  const { hotel, capacidad, tipo, disponible } = req.query;
  const filtro = {};
  if (hotel) filtro.hotel = hotel;
  if (capacidad) filtro.capacidad = capacidad;
  if (tipo) filtro.tipo = tipo;
  if (disponible) filtro.disponible = disponible;
  const habitaciones = await Habitacion.find(filtro);
  res.json(habitaciones);
});

// HU07 CA1: Obtener detalle completo de una habitación
router.get('/:id/detalle', habitacionController.obtenerDetalleHabitacion);

// HU07 CA2: Verificar disponibilidad dinámica
router.get('/:id/disponibilidad', habitacionController.verificarDisponibilidadDinamica);

// HU07 CA3: Calcular tarifa con desglose
router.get('/:id/tarifa', habitacionController.calcularTarifa);

// Crear habitación
router.post('/', async (req, res) => {
  const habitacion = new Habitacion(req.body);
  await habitacion.save();
  res.status(201).json(habitacion);
});

// Actualizar habitación
router.put('/:id', async (req, res) => {
  try {
    const habitacion = await Habitacion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!habitacion) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json(habitacion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Eliminar habitación
router.delete('/:id', async (req, res) => {
  try {
    const habitacion = await Habitacion.findByIdAndDelete(req.params.id);
    if (!habitacion) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json({ message: 'Habitación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;