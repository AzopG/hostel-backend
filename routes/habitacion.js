const express = require('express');
const router = express.Router();
const Habitacion = require('../models/Habitacion');
const habitacionController = require('../controllers/habitacionController');
const { auth } = require('../middleware/auth');

// Obtener todas las habitaciones (ruta básica) - No requiere auth para búsqueda pública
router.get('/', async (req, res) => {
  try {
    const habitaciones = await Habitacion.find().populate('hotel', 'nombre ciudad direccion telefono email politicas fotos calificacion');
    res.json({
      success: true,
      habitaciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener habitaciones',
      error: error.message
    });
  }
});

// Buscar habitaciones por filtros avanzados - No requiere auth para búsqueda pública
router.get('/buscar', async (req, res) => {
  try {
    const { hotelId, capacidad, tipo, disponible, precioMin, precioMax, servicios } = req.query;
    const filtro = {};
    if (hotelId) filtro.hotel = hotelId;
    if (capacidad) filtro.capacidad = capacidad;
    if (tipo) filtro.tipo = tipo;
    if (disponible !== undefined) filtro.disponible = disponible === 'true';
    if (precioMin) filtro.precio = { ...filtro.precio, $gte: Number(precioMin) };
    if (precioMax) filtro.precio = { ...filtro.precio, $lte: Number(precioMax) };

    // Filtrar por servicios (debe incluir todos los seleccionados)
    if (servicios) {
      let serviciosArray = Array.isArray(servicios) ? servicios : [servicios];
      // Usar $all para que la habitación tenga todos los servicios seleccionados
      filtro.servicios = { $all: serviciosArray };
    }

    // Buscar y poblar datos del hotel
    const habitaciones = await Habitacion.find(filtro).populate('hotel', 'nombre ciudad direccion telefono email politicas fotos calificacion');
    res.json({
      success: true,
      habitaciones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al buscar habitaciones',
      error: error.message
    });
  }
});

// HU07 CA1: Obtener detalle completo de una habitación
router.get('/:id/detalle', habitacionController.obtenerDetalleHabitacion);

// HU07 CA2: Verificar disponibilidad dinámica
router.get('/:id/disponibilidad', habitacionController.verificarDisponibilidadDinamica);

// HU07 CA3: Calcular tarifa con desglose
router.get('/:id/tarifa', habitacionController.calcularTarifa);

// Crear habitación con validación de campos requeridos - REQUIERE AUTENTICACIÓN
router.post('/', auth, async (req, res) => {
  try {
    const {
      hotel,
      numero,
      tipo,
      capacidad,
      servicios,
      disponible,
      descripcion,
      fotos,
      precio
    } = req.body;

    if (!hotel || !numero || !tipo || !capacidad || !precio) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: hotel, numero, tipo, capacidad, precio'
      });
    }

    const habitacion = new Habitacion({
      hotel,
      numero,
      tipo,
      capacidad,
      servicios: servicios || [],
      disponible: disponible !== undefined ? disponible : true,
      descripcion: descripcion || '',
      fotos: fotos || [],
      precio
    });
    await habitacion.save();
    res.status(201).json({
      success: true,
      habitacion
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear la habitación', 
      error: error.message 
    });
  }
});

// Actualizar habitación - REQUIERE AUTENTICACIÓN
router.put('/:id', auth, async (req, res) => {
  try {
    const habitacion = await Habitacion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!habitacion) {
      return res.status(404).json({ 
        success: false,
        message: 'Habitación no encontrada' 
      });
    }
    res.json({
      success: true,
      habitacion
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Eliminar habitación - REQUIERE AUTENTICACIÓN
router.delete('/:id', auth, async (req, res) => {
  try {
    const habitacion = await Habitacion.findByIdAndDelete(req.params.id);
    if (!habitacion) {
      return res.status(404).json({ 
        success: false,
        message: 'Habitación no encontrada' 
      });
    }
    res.json({ 
      success: true,
      message: 'Habitación eliminada exitosamente' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;