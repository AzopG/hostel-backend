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
    console.log('--- INICIO EDICIÓN HOTEL ---');
    console.log('ID hotel:', req.params.id);
    console.log('Payload recibido:', JSON.stringify(req.body, null, 2));
    // Si se envía habitaciones como arreglo de objetos, actualiza cada una
    if (Array.isArray(req.body.habitaciones) && req.body.habitaciones.length > 0 && typeof req.body.habitaciones[0] === 'object') {
      const Habitacion = require('../models/Habitacion');
      let habitacionesIds = [];
      for (const hab of req.body.habitaciones) {
        if (hab._id) {
          console.log('Actualizando habitación:', hab._id, hab);
          await Habitacion.findByIdAndUpdate(hab._id, {
            $set: {
              numero: hab.numero,
              tipo: hab.tipo,
              capacidad: hab.capacidad,
              servicios: hab.servicios,
              disponible: hab.disponible,
              precio: hab.precio,
              descripcion: hab.descripcion,
              fotos: hab.fotos || []
            }
          });
          habitacionesIds.push(hab._id);
        } else {
          console.log('Creando nueva habitación:', hab);
          const nuevaHabitacion = new Habitacion({
            hotel: req.params.id,
            numero: hab.numero,
            tipo: hab.tipo || 'estándar',
            capacidad: hab.capacidad || 1,
            servicios: hab.servicios || [],
            disponible: hab.disponible !== undefined ? hab.disponible : true,
            precio: hab.precio || 100000,
            descripcion: hab.descripcion || '',
            fotos: hab.fotos || []
          });
          await nuevaHabitacion.save();
          habitacionesIds.push(nuevaHabitacion._id);
        }
      }
      // Reemplaza habitaciones por solo los IDs para el hotel
      req.body.habitaciones = habitacionesIds;
      console.log('IDs de habitaciones actualizadas:', habitacionesIds);
    }
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!hotel) {
      console.log('Hotel no encontrado');
      return res.status(404).json({ error: 'Hotel no encontrado' });
    }
    console.log('Hotel actualizado:', hotel);
    console.log('--- FIN EDICIÓN HOTEL ---');
    res.json(hotel);
  } catch (err) {
    console.error('Error editando hotel:', err);
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