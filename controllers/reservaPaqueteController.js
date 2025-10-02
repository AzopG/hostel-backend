const ReservaPaquete = require('../models/ReservaPaquete');
const Paquete = require('../models/Paquete');
const Hotel = require('../models/Hotel');
const Usuario = require('../models/Usuario');
const Salon = require('../models/Salon');

/**
 * CONTROLADOR PARA RESERVAS DE PAQUETES EMPRESARIALES
 */

// Listar paquetes disponibles para reservar
const listarPaquetesDisponibles = async (req, res) => {
  try {
    const { hotelId, fechaInicio, fechaFin, numeroAsistentes } = req.query;
    
    let filtros = { 
      estado: 'activo',
      activo: true
    };
    
    if (hotelId) {
      filtros.hotel = hotelId;
    }
    
    if (numeroAsistentes) {
      filtros.capacidadMinima = { $lte: parseInt(numeroAsistentes) };
      filtros.capacidadMaxima = { $gte: parseInt(numeroAsistentes) };
    }
    
    const paquetes = await Paquete.find(filtros)
      .populate('hotel', 'nombre ciudad direccion')
      .select('nombre descripcion tipo capacidadMinima capacidadMaxima precios habitaciones salones servicios catering')
      .sort({ 'precios.base': 1 });
    
    res.json({
      success: true,
      paquetes
    });
    
  } catch (error) {
    console.error('Error al listar paquetes disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener detalles de un paquete específico
const obtenerDetallePaquete = async (req, res) => {
  try {
    const { paqueteId } = req.params;
    
    const paquete = await Paquete.findById(paqueteId)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('salones.salonId', 'nombre capacidad ubicacion equipamiento');
    
    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }
    
    res.json({
      success: true,
      paquete
    });
    
  } catch (error) {
    console.error('Error al obtener detalle del paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nueva reserva de paquete
const crearReservaPaquete = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datosReserva = req.body;
    
    console.log('🔍 Creando reserva de paquete...');
    console.log('📋 Usuario ID:', usuarioId);
    console.log('📦 Datos recibidos:', JSON.stringify(datosReserva, null, 2));
    
    // Validar que el paquete existe y está disponible
    const paquete = await Paquete.findById(datosReserva.paquete);
    console.log('📦 Paquete encontrado:', paquete ? paquete.nombre : 'NO ENCONTRADO');
    
    if (!paquete) {
      return res.status(400).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }
    
    if (paquete.estado !== 'activo') {
      return res.status(400).json({
        success: false,
        message: 'Paquete no disponible - Estado: ' + paquete.estado
      });
    }
    
    // Validar capacidad
    if (datosReserva.numeroAsistentes < paquete.capacidadMinima || 
        datosReserva.numeroAsistentes > paquete.capacidadMaxima) {
      return res.status(400).json({
        success: false,
        message: `El número de asistentes debe estar entre ${paquete.capacidadMinima} y ${paquete.capacidadMaxima}`
      });
    }
    
    // Calcular precios
    console.log('💰 Calculando precios...');
    const precios = calcularPrecios(paquete, datosReserva);
    console.log('💰 Precios calculados:', precios);
    
    // Crear la reserva
    console.log('💾 Creando nueva reserva...');
    const nuevaReserva = new ReservaPaquete({
      ...datosReserva,
      usuario: usuarioId,
      hotel: paquete.hotel,
      precios,
      estado: 'pendiente',
      estadoPago: 'pendiente'
    });
    
    console.log('💾 Guardando reserva...');
    await nuevaReserva.save();
    console.log('✅ Reserva guardada con ID:', nuevaReserva._id);
    
    // Poblar datos para respuesta
    await nuevaReserva.populate([
      { path: 'paquete', select: 'nombre descripcion' },
      { path: 'hotel', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' }
    ]);
    
    console.log('✅ Reserva creada exitosamente:', nuevaReserva.numeroReserva);
    
    res.status(201).json({
      success: true,
      message: 'Reserva de paquete creada exitosamente',
      reserva: nuevaReserva
    });
    
  } catch (error) {
    console.error('💥 Error al crear reserva de paquete:', error);
    console.error('💥 Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// Función auxiliar para calcular precios
const calcularPrecios = (paquete, datosReserva) => {
  let subtotalPaquete = paquete.precios.base;
  let subtotalHabitaciones = 0;
  let subtotalSalones = 0;
  let subtotalServicios = 0;
  let subtotalCatering = 0;
  
  // Calcular habitaciones
  if (datosReserva.habitacionesReservadas) {
    subtotalHabitaciones = datosReserva.habitacionesReservadas.reduce((total, hab) => {
      return total + (hab.precioTotal || 0);
    }, 0);
  }
  
  // Calcular salones
  if (datosReserva.salonesReservados) {
    subtotalSalones = datosReserva.salonesReservados.reduce((total, salon) => {
      return total + (salon.precioTotal || 0);
    }, 0);
  }
  
  // Calcular servicios adicionales
  if (datosReserva.serviciosAdicionales) {
    subtotalServicios = datosReserva.serviciosAdicionales.reduce((total, servicio) => {
      return total + (servicio.precioTotal || 0);
    }, 0);
  }
  
  // Calcular catering
  if (datosReserva.cateringSeleccionado) {
    subtotalCatering = datosReserva.cateringSeleccionado.reduce((total, catering) => {
      return total + (catering.precioTotal || 0);
    }, 0);
  }
  
  const subtotal = subtotalPaquete + subtotalHabitaciones + subtotalSalones + subtotalServicios + subtotalCatering;
  const impuestos = subtotal * 0.19; // IVA 19%
  const total = subtotal + impuestos;
  
  const anticipoPorcentaje = datosReserva.metodoPago?.anticipoPorcentaje || 50;
  const montoAnticipo = total * (anticipoPorcentaje / 100);
  const montoRestante = total - montoAnticipo;
  
  return {
    subtotalPaquete,
    subtotalHabitaciones,
    subtotalSalones,
    subtotalServicios,
    subtotalCatering,
    descuentos: 0,
    impuestos,
    total,
    montoAnticipo,
    montoRestante
  };
};

// Listar reservas del usuario actual
const listarMisReservasPaquetes = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { estado, limit = 10, offset = 0 } = req.query;
    
    let filtros = { usuario: usuarioId };
    if (estado) {
      filtros.estado = estado;
    }
    
    const reservas = await ReservaPaquete.find(filtros)
      .populate('paquete', 'nombre descripcion tipo')
      .populate('hotel', 'nombre ciudad')
      .sort({ fechaInicio: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await ReservaPaquete.countDocuments(filtros);
    
    res.json({
      success: true,
      reservas,
      total,
      pagina: Math.floor(offset / limit) + 1,
      totalPaginas: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Error al listar reservas de paquetes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener detalle de una reserva específica
const obtenerDetalleReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const usuarioId = req.usuario.id;
    
    const reserva = await ReservaPaquete.findOne({
      _id: reservaId,
      usuario: usuarioId
    })
    .populate('paquete')
    .populate('hotel', 'nombre ciudad direccion telefono email')
    .populate('salonesReservados.salonId', 'nombre capacidad ubicacion');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    res.json({
      success: true,
      reserva
    });
    
  } catch (error) {
    console.error('Error al obtener detalle de reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cancelar reserva de paquete
const cancelarReservaPaquete = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const usuarioId = req.usuario.id;
    const { motivo } = req.body;
    
    const reserva = await ReservaPaquete.findOne({
      _id: reservaId,
      usuario: usuarioId
    });
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    if (reserva.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'La reserva ya está cancelada'
      });
    }
    
    // Verificar política de cancelación
    const fechaEvento = new Date(reserva.fechaInicio);
    const fechaActual = new Date();
    const horasRestantes = (fechaEvento - fechaActual) / (1000 * 60 * 60);
    
    let penalizacion = 0;
    if (horasRestantes < 24) {
      penalizacion = 100;
    } else if (horasRestantes < 48) {
      penalizacion = 50;
    } else if (horasRestantes < 72) {
      penalizacion = 25;
    }
    
    reserva.estado = 'cancelada';
    reserva.historial.push({
      fecha: new Date(),
      accion: 'cancelacion',
      usuario: usuarioId,
      detalles: `Reserva cancelada. Motivo: ${motivo}. Penalización: ${penalizacion}%`
    });
    
    await reserva.save();
    
    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      penalizacion
    });
    
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Modificar reserva de paquete
const modificarReservaPaquete = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const usuarioId = req.usuario.id;
    const modificaciones = req.body;
    
    const reserva = await ReservaPaquete.findOne({
      _id: reservaId,
      usuario: usuarioId
    });
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    if (reserva.estado === 'cancelada' || reserva.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una reserva cancelada o completada'
      });
    }
    
    // Verificar si se puede modificar (48 horas antes del evento)
    const fechaEvento = new Date(reserva.fechaInicio);
    const fechaActual = new Date();
    const horasRestantes = (fechaEvento - fechaActual) / (1000 * 60 * 60);
    
    if (horasRestantes < 48) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden hacer modificaciones con menos de 48 horas de anticipación'
      });
    }
    
    // Aplicar modificaciones
    Object.keys(modificaciones).forEach(key => {
      if (key !== '_id' && key !== 'numeroReserva' && key !== 'usuario') {
        reserva[key] = modificaciones[key];
      }
    });
    
    // Recalcular precios si es necesario
    if (modificaciones.numeroAsistentes || modificaciones.serviciosAdicionales || 
        modificaciones.cateringSeleccionado) {
      const paquete = await Paquete.findById(reserva.paquete);
      reserva.precios = calcularPrecios(paquete, reserva);
    }
    
    reserva.historial.push({
      fecha: new Date(),
      accion: 'modificacion',
      usuario: usuarioId,
      detalles: 'Reserva modificada por el cliente'
    });
    
    await reserva.save();
    
    res.json({
      success: true,
      message: 'Reserva modificada exitosamente',
      reserva
    });
    
  } catch (error) {
    console.error('Error al modificar reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// =====================================================
// GESTIÓN PARA ADMINISTRADORES DE HOTEL
// =====================================================

// Listar todas las reservas de paquetes del hotel
const listarReservasHotel = async (req, res) => {
  try {
    const adminId = req.usuario.id;
    const { estado, limit = 50, offset = 0 } = req.query;
    
    console.log('🏨 Listando reservas de paquetes para admin:', adminId);
    
    // Obtener los hoteles que administra este usuario
    const usuarioAdmin = await Usuario.findById(adminId);
    if (!usuarioAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    let hotelesIds = [];
    if (usuarioAdmin.rol === 'admin_central') {
      // Admin central puede ver todos los hoteles
      const todosHoteles = await Hotel.find({}).select('_id');
      hotelesIds = todosHoteles.map(h => h._id);
    } else if (usuarioAdmin.rol === 'admin_hotel') {
      // Admin hotel puede ver todos los hoteles también
      const todosHoteles = await Hotel.find({}).select('_id');
      hotelesIds = todosHoteles.map(h => h._id);
    }

    console.log(`🏨 Hoteles a verificar: ${hotelesIds.length}`);

    // Crear filtros - Si no hay filtro específico, buscar en todos los hoteles
    let filtros = {};
    if (hotelesIds.length > 0) {
      filtros.hotel = { $in: hotelesIds };
    }
    if (estado) {
      filtros.estado = estado;
    }

    console.log('🔍 Filtros aplicados:', filtros);

    // Obtener reservas
    const reservas = await ReservaPaquete.find(filtros)
      .populate('usuario', 'nombre email telefono')
      .populate('paquete', 'nombre descripcion')
      .populate('hotel', 'nombre ciudad')
      .sort({ fechaCreacion: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ReservaPaquete.countDocuments(filtros);

    console.log(`✅ Encontradas ${reservas.length} reservas de ${total} totales`);

    res.json({
      success: true,
      reservas: reservas,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('💥 Error al listar reservas del hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas del hotel',
      error: error.message
    });
  }
};

// Confirmar reserva de paquete
const confirmarReservaPaquete = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { notasHotel } = req.body;
    const adminId = req.usuario.id;
    
    console.log('✅ Confirmando reserva de paquete:', reservaId);
    
    // Buscar la reserva
    const reserva = await ReservaPaquete.findById(reservaId)
      .populate('usuario', 'nombre email')
      .populate('paquete', 'nombre')
      .populate('hotel', 'nombre');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva de paquete no encontrada'
      });
    }
    
    // Verificar que esté pendiente
    if (reserva.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: `No se puede confirmar una reserva con estado: ${reserva.estado}`
      });
    }
    
    // Actualizar reserva
    reserva.estado = 'confirmada';
    reserva.fechaConfirmacion = new Date();
    if (notasHotel) {
      reserva.notasHotel = notasHotel;
    }
    
    await reserva.save();
    
    console.log('✅ Reserva de paquete confirmada exitosamente');
    
    res.json({
      success: true,
      message: 'Reserva de paquete confirmada exitosamente',
      reserva: {
        _id: reserva._id,
        numeroReserva: reserva.numeroReserva,
        estado: reserva.estado,
        fechaConfirmacion: reserva.fechaConfirmacion
      }
    });
    
  } catch (error) {
    console.error('💥 Error al confirmar reserva de paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la reserva de paquete',
      error: error.message
    });
  }
};

// Rechazar reserva de paquete
const rechazarReservaPaquete = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { motivoRechazo, notasHotel } = req.body;
    const adminId = req.usuario.id;
    
    console.log('❌ Rechazando reserva de paquete:', reservaId);
    
    if (!motivoRechazo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo de rechazo es requerido'
      });
    }
    
    // Buscar la reserva
    const reserva = await ReservaPaquete.findById(reservaId)
      .populate('usuario', 'nombre email')
      .populate('paquete', 'nombre')
      .populate('hotel', 'nombre');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva de paquete no encontrada'
      });
    }
    
    // Verificar que esté pendiente
    if (reserva.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: `No se puede rechazar una reserva con estado: ${reserva.estado}`
      });
    }
    
    // Actualizar reserva
    reserva.estado = 'cancelada';
    reserva.fechaCancelacion = new Date();
    reserva.motivoCancelacion = motivoRechazo;
    if (notasHotel) {
      reserva.notasHotel = notasHotel;
    }
    
    await reserva.save();
    
    console.log('❌ Reserva de paquete rechazada exitosamente');
    
    res.json({
      success: true,
      message: 'Reserva de paquete rechazada exitosamente',
      reserva: {
        _id: reserva._id,
        numeroReserva: reserva.numeroReserva,
        estado: reserva.estado,
        fechaCancelacion: reserva.fechaCancelacion,
        motivoCancelacion: reserva.motivoCancelacion
      }
    });
    
  } catch (error) {
    console.error('💥 Error al rechazar reserva de paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la reserva de paquete',
      error: error.message
    });
  }
};

module.exports = {
  listarPaquetesDisponibles,
  obtenerDetallePaquete,
  crearReservaPaquete,
  listarMisReservasPaquetes,
  obtenerDetalleReserva,
  cancelarReservaPaquete,
  modificarReservaPaquete,
  // Funciones para administradores
  listarReservasHotel,
  confirmarReservaPaquete,
  rechazarReservaPaquete
};