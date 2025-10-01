const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// Obtener todos los hoteles
router.get('/', async (req, res) => {
  try {
    const hoteles = await Hotel.find().populate('habitaciones').lean();
    res.json(hoteles);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo hoteles' });
  }
});

// Crear hotel
router.post('/', async (req, res) => {
  try {
    const Habitacion = require('../models/Habitacion');
    let habitacionesIds = [];
    // Si se especifica el número de habitaciones, crea las habitaciones vacías
    if (req.body.habitaciones && typeof req.body.habitaciones === 'number' && req.body.habitaciones > 0) {
      for (let i = 1; i <= req.body.habitaciones; i++) {
        const nuevaHabitacion = new Habitacion({
          hotel: null, // Se asigna después de crear el hotel
          numero: i,
          tipo: 'estándar',
          capacidad: 1,
          servicios: [],
          disponible: true,
          precio: 100000
        });
        await nuevaHabitacion.save();
        habitacionesIds.push(nuevaHabitacion._id);
      }
      req.body.habitaciones = habitacionesIds;
    }
    const hotel = new Hotel(req.body);
    await hotel.save();
    // Asigna el hotel a cada habitación creada
    if (habitacionesIds.length > 0) {
      await Habitacion.updateMany(
        { _id: { $in: habitacionesIds } },
        { $set: { hotel: hotel._id } }
      );
    }
    res.status(201).json(hotel);
  } catch (err) {
    res.status(500).json({ error: 'Error creando hotel' });
  }
});


// Editar hotel
router.put('/:id', async (req, res) => {
  try {
    // Si se envía habitaciones como arreglo de objetos, actualiza cada una
    if (Array.isArray(req.body.habitaciones) && req.body.habitaciones.length > 0 && typeof req.body.habitaciones[0] === 'object') {
      const Habitacion = require('../models/Habitacion');
      let habitacionesIds = [];
      for (const hab of req.body.habitaciones) {
        if (hab._id) {
          await Habitacion.findByIdAndUpdate(hab._id, {
            $set: {
              numero: hab.numero,
              servicios: hab.servicios
            }
          });
          habitacionesIds.push(hab._id);
        } else {
          // Si no tiene _id, crea la habitación y guarda el id
          const nuevaHabitacion = new Habitacion({
            hotel: req.params.id,
            numero: hab.numero,
            tipo: hab.tipo || 'estándar',
            capacidad: hab.capacidad || 1,
            servicios: hab.servicios || [],
            disponible: true,
            precio: hab.precio || 100000
          });
          await nuevaHabitacion.save();
          habitacionesIds.push(nuevaHabitacion._id);
        }
      }
      // Reemplaza habitaciones por solo los IDs para el hotel
      req.body.habitaciones = habitacionesIds;
    }
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