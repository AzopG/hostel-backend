const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// Obtener todos los hoteles
router.get('/', async (req, res) => {
  try {
    const hoteles = await Hotel.find().lean();
    const Habitacion = require('../models/Habitacion');
    // Obtener todos los IDs de hoteles
    const hotelIds = hoteles.map(h => h._id);
    // Agregación para contar habitaciones y ocupadas por hotel
    const habitacionesPorHotel = await Habitacion.aggregate([
      { $match: { hotel: { $in: hotelIds } } },
      { $group: {
        _id: '$hotel',
        total: { $sum: 1 },
        ocupadas: { $sum: { $cond: [{ $eq: ['$disponible', false] }, 1, 0] } }
      }}
    ]);
    // Mapear resultados por hotel
    const habitacionesMap = {};
    habitacionesPorHotel.forEach(h => {
      habitacionesMap[h._id.toString()] = h;
    });
    // Asignar datos agregados a cada hotel
    hoteles.forEach(hotel => {
      const datos = habitacionesMap[hotel._id.toString()] || { total: 0, ocupadas: 0 };
      hotel.habitaciones = datos.total;
      hotel.ocupacion = datos.total > 0 ? Math.round((datos.ocupadas / datos.total) * 100) : 0;
    });
    res.json(hoteles);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo hoteles' });
  }
});

// Crear hotel
router.post('/', async (req, res) => {
  const hotel = new Hotel(req.body);
  await hotel.save();
  res.status(201).json(hotel);
});


// Editar hotel
router.put('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado' });
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ error: 'Error editando hotel' });
  }
});

// Eliminar hotel
router.delete('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado' });
    res.json({ mensaje: 'Hotel eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando hotel' });
  }
});

// Actualizar estado activo/inactivo de hotel
router.patch('/:id/estado', async (req, res) => {
  try {
    const { activo } = req.body;
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { $set: { activo } },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado' });
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

module.exports = router;