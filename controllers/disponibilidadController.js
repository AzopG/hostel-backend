const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Hotel = require('../models/Hotel');
const Reserva = require('../models/Reserva');

exports.disponibilidad = async (req, res) => {
  try {
    const { hotel, fechaInicio, fechaFin, tipo, capacidad } = req.query;
    // Buscar habitaciones disponibles
    let filtroHab = { disponible: true };
    if (hotel) filtroHab.hotel = hotel;
    if (tipo) filtroHab.tipo = tipo;
    if (capacidad) filtroHab.capacidad = capacidad;
    const habitaciones = await Habitacion.find(filtroHab);
    // Buscar salones disponibles
    let filtroSal = { disponible: true };
    if (hotel) filtroSal.hotel = hotel;
    if (capacidad) filtroSal.capacidad = capacidad;
    const salones = await Salon.find(filtroSal);
    res.json({ habitaciones, salones });
  } catch (err) {
    res.status(500).json({ msg: 'Error al consultar disponibilidad', error: err });
  }
};

/**
 * HU04 - CA1: Obtener lista de ciudades con hoteles disponibles
 */
exports.getCiudades = async (req, res) => {
  try {
    // Obtener ciudades únicas de hoteles con habitaciones
    const ciudades = await Hotel.aggregate([
      {
        $lookup: {
          from: 'habitacions', // Nombre de la colección en MongoDB
          localField: '_id',
          foreignField: 'hotel',
          as: 'habitaciones'
        }
      },
      {
        $match: {
          'habitaciones.0': { $exists: true } // Solo hoteles con habitaciones
        }
      },
      {
        $group: {
          _id: '$ciudad',
          totalHoteles: { $sum: 1 },
          totalHabitaciones: { $sum: { $size: '$habitaciones' } }
        }
      },
      {
        $project: {
          _id: 0,
          ciudad: '$_id',
          totalHoteles: 1,
          totalHabitaciones: 1
        }
      },
      {
        $sort: { ciudad: 1 }
      }
    ]);

    res.json({
      success: true,
      count: ciudades.length,
      ciudades
    });
  } catch (err) {
    console.error('Error obteniendo ciudades:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Error al obtener ciudades',
      error: err.message 
    });
  }
};

/**
 * HU04 - CA1, CA2, CA3: Obtener disponibilidad de habitaciones por ciudad y rango de fechas
 */
exports.getDisponibilidadPorCiudad = async (req, res) => {
  try {
    const { ciudad } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    // Validaciones
    if (!ciudad) {
      return res.status(400).json({
        success: false,
        msg: 'La ciudad es requerida'
      });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        msg: 'Las fechas de inicio y fin son requeridas'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        msg: 'Formato de fecha inválido. Use formato ISO (YYYY-MM-DD)'
      });
    }

    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        msg: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Buscar hoteles en la ciudad
    const hoteles = await Hotel.find({ ciudad }).select('_id nombre direccion');

    if (hoteles.length === 0) {
      return res.json({
        success: true,
        msg: 'No hay hoteles disponibles en esta ciudad',
        ciudad,
        hoteles: [],
        disponibilidad: []
      });
    }

    const hotelesIds = hoteles.map(h => h._id);

    // Buscar todas las habitaciones de esos hoteles
    const habitaciones = await Habitacion.find({
      hotel: { $in: hotelesIds },
      disponible: true
    }).populate('hotel', 'nombre ciudad');

    // Buscar reservas existentes que se solapen con el rango de fechas
    const reservas = await Reserva.find({
      hotel: { $in: hotelesIds },
      habitacion: { $exists: true },
      estado: { $ne: 'cancelada' },
      $or: [
        {
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio }
        }
      ]
    }).select('habitacion fechaInicio fechaFin');

    // Crear mapa de reservas por habitación
    const reservasPorHabitacion = {};
    reservas.forEach(reserva => {
      const habId = reserva.habitacion.toString();
      if (!reservasPorHabitacion[habId]) {
        reservasPorHabitacion[habId] = [];
      }
      reservasPorHabitacion[habId].push({
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin
      });
    });

    // CA3: Calcular disponibilidad día por día
    const disponibilidadPorDia = {};
    const currentDate = new Date(inicio);
    
    while (currentDate <= fin) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Contar habitaciones disponibles para este día
      let habitacionesDisponibles = 0;
      
      habitaciones.forEach(habitacion => {
        const habId = habitacion._id.toString();
        const reservasHab = reservasPorHabitacion[habId] || [];
        
        // Verificar si hay alguna reserva que cubra este día
        const estaReservado = reservasHab.some(reserva => {
          return currentDate >= new Date(reserva.fechaInicio) && 
                 currentDate < new Date(reserva.fechaFin);
        });
        
        if (!estaReservado) {
          habitacionesDisponibles++;
        }
      });
      
      disponibilidadPorDia[dateKey] = {
        fecha: dateKey,
        disponible: habitacionesDisponibles > 0,
        habitacionesDisponibles,
        totalHabitaciones: habitaciones.length
      };
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      ciudad,
      fechaInicio: inicio.toISOString().split('T')[0],
      fechaFin: fin.toISOString().split('T')[0],
      totalHoteles: hoteles.length,
      totalHabitaciones: habitaciones.length,
      hoteles: hoteles.map(h => ({
        id: h._id,
        nombre: h.nombre,
        direccion: h.direccion
      })),
      disponibilidad: Object.values(disponibilidadPorDia)
    });

  } catch (err) {
    console.error('Error obteniendo disponibilidad por ciudad:', err);
    res.status(500).json({
      success: false,
      msg: 'Error al obtener disponibilidad',
      error: err.message
    });
  }
};
