const Habitacion = require('../models/Habitacion');
const Reserva = require('../models/Reserva');
const Hotel = require('../models/Hotel');

/**
 * HU07 CA1: Obtener detalle completo de una habitación
 * Incluye: fotos, descripción, capacidad, servicios, políticas
 */
exports.obtenerDetalleHabitacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar habitación con populate de hotel
    const habitacion = await Habitacion.findById(id)
      .populate('hotel', 'nombre ciudad direccion telefono email politicas fotos calificacion')
      .lean();

    if (!habitacion) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }

    // Obtener reservas para calcular disponibilidad
    const reservas = await Reserva.find({
      habitacion: id,
      estado: { $in: ['confirmada', 'pendiente'] }
    }).select('fechaInicio fechaFin estado').lean();

    // Formatear respuesta con toda la información necesaria
    const detalle = {
      _id: habitacion._id,
      numero: habitacion.numero,
      tipo: habitacion.tipo,
      capacidad: habitacion.capacidad,
      servicios: habitacion.servicios || [],
      disponible: habitacion.disponible,
      
      // Información del hotel (CA1)
      hotel: {
        _id: habitacion.hotel._id,
        nombre: habitacion.hotel.nombre,
        ciudad: habitacion.hotel.ciudad,
        direccion: habitacion.hotel.direccion,
        telefono: habitacion.hotel.telefono,
        email: habitacion.hotel.email,
        calificacion: habitacion.hotel.calificacion || 0,
        politicas: habitacion.hotel.politicas || {
          checkIn: '15:00',
          checkOut: '12:00',
          cancelacion: '24 horas antes sin cargo',
          mascotas: false,
          fumadores: false
        },
        fotos: habitacion.hotel.fotos || []
      },

      // Fotos específicas de la habitación (CA1)
      fotos: habitacion.fotos || [],

      // Descripción detallada (CA1)
      descripcion: habitacion.descripcion || `Habitación ${habitacion.tipo} con capacidad para ${habitacion.capacidad} huéspedes.`,

      // Precio (CA3)
      precio: habitacion.precio || 100000, // Precio por noche en COP

      // Reservas activas para validación de disponibilidad (CA2)
      reservas: reservas
    };

    res.json({
      success: true,
      habitacion: detalle
    });

  } catch (error) {
    console.error('Error al obtener detalle de habitación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle de la habitación',
      error: error.message
    });
  }
};

/**
 * HU07 CA2: Verificar disponibilidad dinámica
 * Comprueba si la habitación sigue disponible para las fechas dadas
 */
exports.verificarDisponibilidadDinamica = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Validar fechas
    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Buscar habitación
    const habitacion = await Habitacion.findById(id);
    
    if (!habitacion) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }

    if (!habitacion.disponible) {
      return res.json({
        success: true,
        disponible: false,
        mensaje: 'La habitación ya no está disponible'
      });
    }

    // Buscar reservas que se solapen con las fechas solicitadas
    const reservasConflicto = await Reserva.find({
      habitacion: id,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        {
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio }
        }
      ]
    });

    const disponible = reservasConflicto.length === 0;

    res.json({
      success: true,
      disponible,
      mensaje: disponible 
        ? 'La habitación sigue disponible para las fechas seleccionadas'
        : 'La habitación ya no está disponible para las fechas seleccionadas',
      reservasConflicto: disponible ? [] : reservasConflicto.map(r => ({
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin,
        estado: r.estado
      }))
    });

  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
};

/**
 * HU07 CA3: Calcular tarifa con desglose
 * Calcula precio total con desglose por noche e impuestos
 */
exports.calcularTarifa = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Validar fechas
    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Buscar habitación
    const habitacion = await Habitacion.findById(id).populate('hotel', 'nombre ciudad');
    
    if (!habitacion) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }

    // Calcular número de noches
    const unDia = 24 * 60 * 60 * 1000; // milisegundos en un día
    const noches = Math.ceil((fin - inicio) / unDia);

    // Precio por noche (desde el modelo o valor por defecto)
    const precioPorNoche = habitacion.precio || 100000;

    // Calcular subtotal
    const subtotal = precioPorNoche * noches;

    // Calcular impuestos (IVA 19% en Colombia)
    const tasaImpuesto = 0.19;
    const impuestos = Math.round(subtotal * tasaImpuesto);

    // Total final
    const total = subtotal + impuestos;

    res.json({
      success: true,
      tarifa: {
        habitacion: {
          _id: habitacion._id,
          numero: habitacion.numero,
          tipo: habitacion.tipo,
          hotel: habitacion.hotel
        },
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        noches,
        desglose: {
          precioPorNoche: precioPorNoche,
          subtotal: subtotal,
          impuestos: {
            concepto: 'IVA (19%)',
            monto: impuestos
          },
          total: total
        },
        moneda: 'COP'
      }
    });

  } catch (error) {
    console.error('Error al calcular tarifa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular la tarifa',
      error: error.message
    });
  }
};
