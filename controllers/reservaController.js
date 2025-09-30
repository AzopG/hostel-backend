const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Hotel = require('../models/Hotel');

/**
 * HU08 CA1 + CA2 + CA3: Crear reserva con validación de disponibilidad
 */
exports.crearReserva = async (req, res) => {
  try {
    const { 
      usuario, // Opcional (puede ser null para huéspedes sin cuenta)
      hotel, 
      habitacion, 
      fechaInicio, 
      fechaFin,
      huespedes,
      datosHuesped, // CA1: Datos del huésped (nombre, apellido, email, telefono)
      tarifa, // CA2: Información de tarifa
      politicasAceptadas, // CA4: Aceptación de políticas
      notas
    } = req.body;

    // Validaciones básicas
    if (!hotel || !habitacion || !fechaInicio || !fechaFin || !huespedes) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: hotel, habitacion, fechaInicio, fechaFin, huespedes'
      });
    }

    // CA1: Validar datos del huésped
    if (!datosHuesped || !datosHuesped.nombre || !datosHuesped.apellido || 
        !datosHuesped.email || !datosHuesped.telefono) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos del huésped: nombre, apellido, email, telefono'
      });
    }

    // CA4: Validar que se aceptaron las políticas
    if (!politicasAceptadas) {
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar las políticas de cancelación para continuar'
      });
    }

    // Validar fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // CA3: VALIDAR DISPONIBILIDAD justo antes de crear la reserva
    // Buscar reservas que se solapen con las fechas solicitadas
    const reservasConflicto = await Reserva.find({
      habitacion: habitacion,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        {
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio }
        }
      ]
    });

    if (reservasConflicto.length > 0) {
      // CA3: Habitación ya no disponible
      return res.status(409).json({
        success: false,
        message: 'Lo sentimos, la habitación ya no está disponible para las fechas seleccionadas',
        conflicto: true,
        sugerencia: 'Por favor, vuelva a la búsqueda para encontrar otras opciones'
      });
    }

    // Verificar que la habitación existe
    const hab = await Habitacion.findById(habitacion).populate('hotel');
    if (!hab) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }

    // Verificar que el hotel existe
    const hotelDoc = await Hotel.findById(hotel);
    if (!hotelDoc) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }

    // Calcular número de noches
    const unDia = 24 * 60 * 60 * 1000;
    const noches = Math.ceil((fin - inicio) / unDia);

    // CA2: Generar código de reserva único
    const codigoReserva = await Reserva.generarCodigoReserva();

    // Crear la reserva
    const reserva = new Reserva({
      usuario: usuario || null,
      hotel,
      habitacion,
      fechaInicio: inicio,
      fechaFin: fin,
      huespedes,
      noches,
      datosHuesped: {
        nombre: datosHuesped.nombre,
        apellido: datosHuesped.apellido,
        email: datosHuesped.email,
        telefono: datosHuesped.telefono,
        documento: datosHuesped.documento || '',
        pais: datosHuesped.pais || 'Colombia',
        ciudad: datosHuesped.ciudad || ''
      },
      codigoReserva,
      tarifa: tarifa || {
        precioPorNoche: hab.precio || 100000,
        subtotal: (hab.precio || 100000) * noches,
        impuestos: Math.round((hab.precio || 100000) * noches * 0.19),
        total: (hab.precio || 100000) * noches + Math.round((hab.precio || 100000) * noches * 0.19),
        moneda: 'COP'
      },
      estado: 'confirmada',
      politicasAceptadas: true,
      fechaPoliticasAceptadas: new Date(),
      notas: notas || ''
    });

    await reserva.save();

    // CA2: Actualizar inventario - Ya no se usa el flag "disponible"
    // Las reservas se manejan por solapamiento de fechas

    // Poblar datos para la respuesta
    await reserva.populate('habitacion');
    await reserva.populate('hotel');

    // CA2: Respuesta con código de reserva
    res.status(201).json({
      success: true,
      message: '¡Reserva creada exitosamente!',
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        datosHuesped: reserva.datosHuesped,
        habitacion: {
          _id: reserva.habitacion._id,
          numero: reserva.habitacion.numero,
          tipo: reserva.habitacion.tipo
        },
        hotel: {
          _id: reserva.hotel._id,
          nombre: reserva.hotel.nombre,
          ciudad: reserva.hotel.ciudad,
          direccion: reserva.hotel.direccion,
          telefono: reserva.hotel.telefono,
          email: reserva.hotel.email
        },
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        huespedes: reserva.huespedes,
        noches: reserva.noches,
        tarifa: reserva.tarifa,
        estado: reserva.estado,
        createdAt: reserva.createdAt
      }
    });

  } catch (err) {
    console.error('Error al crear reserva:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al crear la reserva', 
      error: err.message 
    });
  }
};

/**
 * HU08: Obtener reserva por código
 */
exports.obtenerReservaPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    const reserva = await Reserva.findOne({ codigoReserva: codigo.toUpperCase() })
      .populate('habitacion', 'numero tipo capacidad servicios precio')
      .populate('hotel', 'nombre ciudad direccion telefono email politicas')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada con el código proporcionado'
      });
    }

    res.json({
      success: true,
      reserva
    });

  } catch (err) {
    console.error('Error al obtener reserva:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la reserva',
      error: err.message
    });
  }
};

/**
 * Cancelar reserva
 */
exports.cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reserva = await Reserva.findById(id);
    
    if (!reserva) {
      return res.status(404).json({ 
        success: false,
        message: 'Reserva no encontrada' 
      });
    }

    if (reserva.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'Esta reserva ya está cancelada'
      });
    }

    reserva.estado = 'cancelada';
    await reserva.save();

    res.json({ 
      success: true,
      message: 'Reserva cancelada exitosamente', 
      reserva 
    });

  } catch (err) {
    console.error('Error al cancelar reserva:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al cancelar reserva', 
      error: err.message 
    });
  }
};
