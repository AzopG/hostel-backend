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

    // HU12 CA1: Enviar email de confirmación (sin bloquear la respuesta)
    const { sendReservaConfirmacionEmail } = require('../config/email');
    
    // Ejecutar envío de email en segundo plano
    sendReservaConfirmacionEmail({
      email: reserva.datosHuesped.email,
      nombre: reserva.datosHuesped.nombre,
      apellido: reserva.datosHuesped.apellido,
      codigoReserva: reserva.codigoReserva,
      hotel: {
        nombre: reserva.hotel.nombre,
        ciudad: reserva.hotel.ciudad,
        direccion: reserva.hotel.direccion,
        telefono: reserva.hotel.telefono,
        email: reserva.hotel.email
      },
      habitacion: {
        tipo: reserva.habitacion.tipo,
        numero: reserva.habitacion.numero
      },
      fechaInicio: reserva.fechaInicio,
      fechaFin: reserva.fechaFin,
      noches: reserva.noches,
      huespedes: reserva.huespedes,
      tarifa: reserva.tarifa,
      checkInTime: reserva.hotel.checkInTime,
      checkOutTime: reserva.hotel.checkOutTime,
      politicas: reserva.hotel.politicas
    })
    .then(resultado => {
      // CA1: Email enviado exitosamente
      if (resultado.success) {
        reserva.notificaciones = {
          confirmacionEnviada: true,
          confirmacionFecha: new Date(),
          confirmacionMessageId: resultado.messageId
        };
        reserva.save();
        console.log(`✅ Email de confirmación enviado para reserva ${reserva.codigoReserva}`);
      }
    })
    .catch(err => {
      // CA2: Error de envío - Registrar incidente
      console.error(`❌ Error al enviar email de confirmación para ${reserva.codigoReserva}:`, err);
      reserva.incidentesEmail = reserva.incidentesEmail || [];
      reserva.incidentesEmail.push({
        tipo: 'ERROR_ENVIO_EMAIL',
        fecha: new Date(),
        detalle: err.message,
        email: reserva.datosHuesped.email
      });
      reserva.notificaciones = {
        ...reserva.notificaciones,
        confirmacionEnviada: false
      };
      reserva.save();
    });

    // CA2: Respuesta con código de reserva (incluye aviso si hay incidentes previos)
    const respuesta = {
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
    };

    // CA2: Agregar aviso sobre email si hay problemas conocidos
    // (Este mensaje solo aparece si ya se intentó enviar y falló)
    if (reserva.incidentesEmail && reserva.incidentesEmail.length > 0) {
      respuesta.avisoEmail = 'No pudimos enviar el correo, verifique su comprobante en la plataforma';
    }

    res.status(201).json(respuesta);

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
 * Obtener todas las reservas
 * Nota: En producción, filtrar por usuario autenticado
 */
exports.obtenerTodasReservas = async (req, res) => {
  try {
    const reservas = await Reserva.find()
      .populate('habitacion', 'numero tipo capacidad servicios precio')
      .populate('hotel', 'nombre ciudad departamento direccion telefono email politicas')
      .sort({ createdAt: -1 }) // Más recientes primero
      .lean();

    res.json({
      success: true,
      reservas,
      total: reservas.length
    });

  } catch (err) {
    console.error('Error al obtener reservas:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las reservas',
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
      .populate('hotel', 'nombre ciudad departamento direccion telefono email politicas')
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
 * HU10: Verificar políticas de cancelación antes de cancelar
 * CA2: Muestra si hay penalización
 */
exports.verificarPoliticasCancelacion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const reserva = await Reserva.findById(id)
      .populate('habitacion', 'numero tipo')
      .populate('hotel', 'nombre ciudad politicas');
    
    // CA3: Validar que exista
    if (!reserva) {
      return res.status(404).json({ 
        success: false,
        message: 'Reserva no encontrada' 
      });
    }

    // CA3: Validar que no esté ya cancelada
    if (reserva.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        puedeCancelar: false,
        motivo: 'ya_cancelada',
        mensaje: 'Esta reserva ya fue cancelada previamente',
        estadoActual: reserva.estado,
        fechaCancelacion: reserva.cancelacion?.fechaCancelacion
      });
    }

    // Validar que no sea una reserva completada
    if (reserva.estado === 'completada') {
      return res.status(400).json({
        success: false,
        puedeCancelar: false,
        motivo: 'reserva_completada',
        mensaje: 'No se puede cancelar una reserva ya completada',
        estadoActual: reserva.estado
      });
    }

    // Calcular horas hasta el check-in
    const ahora = new Date();
    const fechaInicio = new Date(reserva.fechaInicio);
    const milisegundosHastaCheckIn = fechaInicio.getTime() - ahora.getTime();
    const horasHastaCheckIn = milisegundosHastaCheckIn / (1000 * 60 * 60);

    // Si ya pasó el check-in
    if (horasHastaCheckIn < 0) {
      return res.status(400).json({
        success: false,
        puedeCancelar: false,
        motivo: 'checkin_pasado',
        mensaje: 'No se puede cancelar una reserva cuyo check-in ya pasó'
      });
    }

    // CA1 + CA2: Determinar ventana de cancelación y penalización
    // Política: 
    // - Gratuita si se cancela con más de 48 horas de anticipación
    // - 50% de penalización si se cancela entre 24-48 horas
    // - 100% de penalización si se cancela con menos de 24 horas
    
    const HORAS_VENTANA_GRATUITA = 48;
    const HORAS_VENTANA_PENALIZACION_50 = 24;
    
    let dentroVentanaGratuita = false;
    let porcentajePenalizacion = 0;
    let montoPenalizacion = 0;
    let montoReembolso = 0;
    let mensaje = '';

    if (horasHastaCheckIn >= HORAS_VENTANA_GRATUITA) {
      // CA1: Cancelación gratuita
      dentroVentanaGratuita = true;
      porcentajePenalizacion = 0;
      montoPenalizacion = 0;
      montoReembolso = reserva.tarifa.total;
      mensaje = 'Cancelación gratuita. Se reembolsará el 100% del monto pagado.';
    } else if (horasHastaCheckIn >= HORAS_VENTANA_PENALIZACION_50) {
      // CA2: Penalización del 50%
      dentroVentanaGratuita = false;
      porcentajePenalizacion = 50;
      montoPenalizacion = Math.round(reserva.tarifa.total * 0.50);
      montoReembolso = reserva.tarifa.total - montoPenalizacion;
      mensaje = `Se aplicará una penalización del 50% (${formatearPrecio(montoPenalizacion)} COP). Se reembolsará ${formatearPrecio(montoReembolso)} COP.`;
    } else {
      // CA2: Penalización del 100%
      dentroVentanaGratuita = false;
      porcentajePenalizacion = 100;
      montoPenalizacion = reserva.tarifa.total;
      montoReembolso = 0;
      mensaje = 'Se aplicará una penalización del 100%. No habrá reembolso.';
    }

    res.json({ 
      success: true,
      puedeCancelar: true,
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        hotel: reserva.hotel.nombre,
        habitacion: reserva.habitacion.tipo,
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        total: reserva.tarifa.total,
        estado: reserva.estado
      },
      politicaCancelacion: {
        dentroVentanaGratuita,
        horasHastaCheckIn: Math.floor(horasHastaCheckIn),
        diasHastaCheckIn: Math.floor(horasHastaCheckIn / 24),
        porcentajePenalizacion,
        montoPenalizacion,
        montoReembolso,
        mensaje,
        detalles: {
          ventanaGratuita: `${HORAS_VENTANA_GRATUITA} horas (${HORAS_VENTANA_GRATUITA / 24} días)`,
          penalizacion50: `Entre ${HORAS_VENTANA_PENALIZACION_50}-${HORAS_VENTANA_GRATUITA} horas`,
          penalizacion100: `Menos de ${HORAS_VENTANA_PENALIZACION_50} horas`
        }
      }
    });

  } catch (err) {
    console.error('Error al verificar políticas de cancelación:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al verificar políticas de cancelación', 
      error: err.message 
    });
  }
};

/**
 * HU10: Cancelar reserva con cálculo de penalización
 * CA1: Cancelación dentro de ventana gratuita
 * CA2: Penalización informada y aplicada
 * CA3: Validaciones de estado
 * CA4: Notificación por correo
 */
exports.cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, confirmacionPenalizacion } = req.body;
    
    const reserva = await Reserva.findById(id)
      .populate('habitacion', 'numero tipo')
      .populate('hotel', 'nombre ciudad email telefono politicas');
    
    // CA3: Validar que exista
    if (!reserva) {
      return res.status(404).json({ 
        success: false,
        message: 'Reserva no encontrada' 
      });
    }

    // CA3: Validar que no esté ya cancelada
    if (reserva.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        message: 'Esta reserva ya fue cancelada previamente',
        estadoActual: 'cancelada',
        fechaCancelacion: reserva.cancelacion?.fechaCancelacion,
        yaCancelada: true // CA3: Flag para UI
      });
    }

    // Validar que no sea completada
    if (reserva.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una reserva completada'
      });
    }

    // Calcular horas hasta check-in
    const ahora = new Date();
    const fechaInicio = new Date(reserva.fechaInicio);
    const horasHastaCheckIn = (fechaInicio.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    // Si ya pasó el check-in
    if (horasHastaCheckIn < 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar una reserva cuyo check-in ya pasó'
      });
    }

    // CA1 + CA2: Calcular penalización
    const HORAS_VENTANA_GRATUITA = 48;
    const HORAS_VENTANA_PENALIZACION_50 = 24;
    
    let dentroVentanaGratuita = false;
    let porcentajePenalizacion = 0;
    let montoPenalizacion = 0;
    let montoReembolso = 0;

    if (horasHastaCheckIn >= HORAS_VENTANA_GRATUITA) {
      // CA1: Cancelación gratuita
      dentroVentanaGratuita = true;
      porcentajePenalizacion = 0;
      montoPenalizacion = 0;
      montoReembolso = reserva.tarifa.total;
    } else if (horasHastaCheckIn >= HORAS_VENTANA_PENALIZACION_50) {
      // CA2: Penalización del 50%
      porcentajePenalizacion = 50;
      montoPenalizacion = Math.round(reserva.tarifa.total * 0.50);
      montoReembolso = reserva.tarifa.total - montoPenalizacion;
    } else {
      // CA2: Penalización del 100%
      porcentajePenalizacion = 100;
      montoPenalizacion = reserva.tarifa.total;
      montoReembolso = 0;
    }

    // CA2: Si hay penalización, verificar que el usuario la confirmó
    if (montoPenalizacion > 0 && !confirmacionPenalizacion) {
      return res.status(400).json({
        success: false,
        requiereConfirmacion: true,
        message: 'Debes confirmar que aceptas la penalización',
        penalizacion: {
          porcentaje: porcentajePenalizacion,
          monto: montoPenalizacion,
          reembolso: montoReembolso
        }
      });
    }

    // Actualizar estado y agregar información de cancelación
    reserva.estado = 'cancelada';
    
    // HU10: Guardar información completa de cancelación
    reserva.cancelacion = {
      fechaCancelacion: new Date(),
      motivo: motivo || 'No especificado',
      realizadaPor: 'cliente',
      penalizacion: montoPenalizacion,
      reembolso: montoReembolso,
      dentroVentanaGratuita,
      horasAntesCancelacion: Math.floor(horasHastaCheckIn),
      notificacionEnviada: false // Se actualizará después de enviar email
    };
    
    // Agregar a notas
    if (motivo) {
      const notaCancelacion = `[CANCELACIÓN ${new Date().toISOString()}] Motivo: ${motivo}. Penalización: ${porcentajePenalizacion}% (${formatearPrecio(montoPenalizacion)} COP). Reembolso: ${formatearPrecio(montoReembolso)} COP.`;
      reserva.notas = reserva.notas 
        ? `${reserva.notas}\n${notaCancelacion}` 
        : notaCancelacion;
    }
    
    await reserva.save();

    // HU12 CA4: Enviar notificación por correo de cancelación
    const { sendReservaCancelacionEmail } = require('../config/email');
    
    // Ejecutar envío de email en segundo plano
    sendReservaCancelacionEmail({
      email: reserva.datosHuesped.email,
      nombre: reserva.datosHuesped.nombre,
      apellido: reserva.datosHuesped.apellido,
      codigoReserva: reserva.codigoReserva,
      hotel: {
        nombre: reserva.hotel.nombre,
        ciudad: reserva.hotel.ciudad
      },
      habitacion: {
        tipo: reserva.habitacion.tipo,
        numero: reserva.habitacion.numero
      },
      fechaInicio: reserva.fechaInicio,
      fechaFin: reserva.fechaFin,
      fechaCancelacion: reserva.cancelacion.fechaCancelacion,
      motivo: reserva.cancelacion.motivo,
      penalizacion: montoPenalizacion,
      reembolso: montoReembolso,
      dentroVentanaGratuita,
      tarifa: reserva.tarifa
    })
    .then(resultado => {
      // CA4: Email de cancelación enviado exitosamente
      if (resultado.success) {
        reserva.cancelacion.notificacionEnviada = true;
        reserva.notificaciones = {
          ...reserva.notificaciones,
          cancelacionEnviada: true,
          cancelacionFecha: new Date(),
          cancelacionMessageId: resultado.messageId
        };
        reserva.save();
        console.log(`✅ Email de cancelación enviado para reserva ${reserva.codigoReserva}`);
      }
    })
    .catch(err => {
      // CA2: Error de envío - Registrar incidente
      console.error(`❌ Error al enviar email de cancelación para ${reserva.codigoReserva}:`, err);
      reserva.incidentesEmail = reserva.incidentesEmail || [];
      reserva.incidentesEmail.push({
        tipo: 'ERROR_ENVIO_EMAIL_CANCELACION',
        fecha: new Date(),
        detalle: err.message,
        email: reserva.datosHuesped.email
      });
      reserva.cancelacion.notificacionEnviada = false;
      reserva.save();
    });

    // CA1: Mensaje según ventana
    const mensajeExito = dentroVentanaGratuita
      ? 'Reserva cancelada exitosamente. Recibirás el reembolso completo en 5-7 días hábiles.'
      : `Reserva cancelada. Se aplicó una penalización del ${porcentajePenalizacion}%. Recibirás ${formatearPrecio(montoReembolso)} COP en 5-7 días hábiles.`;

    res.json({ 
      success: true,
      message: mensajeExito,
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        estado: reserva.estado,
        hotel: reserva.hotel.nombre,
        habitacion: reserva.habitacion.tipo,
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin
      },
      cancelacion: {
        fechaCancelacion: reserva.cancelacion.fechaCancelacion,
        dentroVentanaGratuita,
        porcentajePenalizacion,
        montoPenalizacion,
        montoReembolso,
        horasAntesCancelacion: Math.floor(horasHastaCheckIn),
        notificacionEnviada: reserva.cancelacion.notificacionEnviada
      }
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

// Función auxiliar para formatear precios
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(precio);
}

/**
 * HU09: Modificar fechas de una reserva vigente
 * CA1: Apertura de modificación (estado activa + antes de límite)
 * CA2: Disponibilidad válida (actualiza reserva e inventario)
 * CA3: Falta disponibilidad (mensaje de error)
 * CA4: Restricción temporal (menos de 24 horas para check-in)
 */
exports.modificarFechasReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaInicioNueva, fechaFinNueva } = req.body;

    // Validaciones básicas
    if (!fechaInicioNueva || !fechaFinNueva) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicioNueva y fechaFinNueva'
      });
    }

    // Buscar reserva
    const reserva = await Reserva.findById(id).populate('habitacion hotel');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // CA1: Verificar que la reserva esté en estado "confirmada" (activa)
    if (reserva.estado !== 'confirmada') {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar una reserva en estado "${reserva.estado}". Solo reservas confirmadas pueden modificarse.`,
        puedeModificar: false,
        motivo: 'estado_invalido'
      });
    }

    // CA4: Restricción temporal - No permitir modificación si faltan menos de 24 horas
    const ahora = new Date();
    const horasHastaCheckIn = (new Date(reserva.fechaInicio) - ahora) / (1000 * 60 * 60);
    const HORAS_LIMITE = 24;

    if (horasHastaCheckIn < HORAS_LIMITE) {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar la reserva. Faltan menos de ${HORAS_LIMITE} horas para el check-in.`,
        puedeModificar: false,
        motivo: 'restriccion_temporal',
        horasRestantes: Math.max(0, horasHastaCheckIn.toFixed(1))
      });
    }

    // Validar fechas nuevas
    const inicio = new Date(fechaInicioNueva);
    const fin = new Date(fechaFinNueva);

    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    if (inicio < ahora) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio no puede ser en el pasado'
      });
    }

    // CA3: Verificar disponibilidad para las nuevas fechas
    // Buscar reservas que NO sean la actual y que tengan solapamiento
    const reservasConflicto = await Reserva.find({
      _id: { $ne: reserva._id }, // Excluir la reserva actual
      habitacion: reserva.habitacion._id,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }
      ]
    });

    if (reservasConflicto.length > 0) {
      // CA3: Falta disponibilidad
      return res.status(409).json({
        success: false,
        message: 'La habitación no está disponible para las nuevas fechas seleccionadas',
        conflicto: true,
        disponible: false,
        reservasConflicto: reservasConflicto.length,
        sugerencia: 'Por favor, selecciona otras fechas'
      });
    }

    // CA2: Disponibilidad válida - Calcular nueva tarifa
    const nochesNuevas = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    const precioPorNoche = reserva.tarifa.precioPorNoche;
    const subtotalNuevo = precioPorNoche * nochesNuevas;
    const impuestosNuevos = Math.round(subtotalNuevo * 0.19); // IVA 19%
    const totalNuevo = subtotalNuevo + impuestosNuevos;

    // Guardar en historial
    const modificacion = {
      fechaModificacion: new Date(),
      fechaInicioAnterior: reserva.fechaInicio,
      fechaFinAnterior: reserva.fechaFin,
      fechaInicioNueva: inicio,
      fechaFinNueva: fin,
      tarifaAnterior: reserva.tarifa.total,
      tarifaNueva: totalNuevo
    };

    if (!reserva.historialModificaciones) {
      reserva.historialModificaciones = [];
    }
    reserva.historialModificaciones.push(modificacion);

    // CA2: Actualizar la reserva
    reserva.fechaInicio = inicio;
    reserva.fechaFin = fin;
    reserva.noches = nochesNuevas;
    reserva.tarifa.subtotal = subtotalNuevo;
    reserva.tarifa.impuestos = impuestosNuevos;
    reserva.tarifa.total = totalNuevo;
    reserva.updatedAt = new Date();

    await reserva.save();

    // Repoblar para respuesta completa
    await reserva.populate('habitacion hotel');

    res.json({
      success: true,
      message: 'Fechas de reserva modificadas exitosamente',
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        noches: reserva.noches,
        tarifa: reserva.tarifa,
        habitacion: {
          _id: reserva.habitacion._id,
          numero: reserva.habitacion.numero,
          tipo: reserva.habitacion.tipo
        },
        hotel: {
          _id: reserva.hotel._id,
          nombre: reserva.hotel.nombre,
          ciudad: reserva.hotel.ciudad
        },
        modificacion: {
          fechasAnteriores: {
            inicio: modificacion.fechaInicioAnterior,
            fin: modificacion.fechaFinAnterior
          },
          fechasNuevas: {
            inicio: modificacion.fechaInicioNueva,
            fin: modificacion.fechaFinNueva
          },
          diferenciaTarifa: totalNuevo - modificacion.tarifaAnterior
        }
      }
    });

  } catch (err) {
    console.error('Error al modificar fechas de reserva:', err);
    res.status(500).json({
      success: false,
      message: 'Error al modificar fechas de reserva',
      error: err.message
    });
  }
};

/**
 * HU09 CA1: Verificar si una reserva puede ser modificada
 */
exports.verificarPuedeModificar = async (req, res) => {
  try {
    const { id } = req.params;

    const reserva = await Reserva.findById(id);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar estado
    if (reserva.estado !== 'confirmada') {
      return res.json({
        success: true,
        puedeModificar: false,
        motivo: 'estado_invalido',
        mensaje: `No se puede modificar una reserva en estado "${reserva.estado}"`
      });
    }

    // CA4: Verificar restricción temporal
    const ahora = new Date();
    const horasHastaCheckIn = (new Date(reserva.fechaInicio) - ahora) / (1000 * 60 * 60);
    const HORAS_LIMITE = 24;

    if (horasHastaCheckIn < HORAS_LIMITE) {
      return res.json({
        success: true,
        puedeModificar: false,
        motivo: 'restriccion_temporal',
        mensaje: `No se puede modificar. Faltan menos de ${HORAS_LIMITE} horas para el check-in.`,
        horasRestantes: Math.max(0, horasHastaCheckIn.toFixed(1))
      });
    }

    // Puede modificar
    res.json({
      success: true,
      puedeModificar: true,
      horasHastaCheckIn: horasHastaCheckIn.toFixed(1),
      fechaLimite: new Date(new Date(reserva.fechaInicio).getTime() - (HORAS_LIMITE * 60 * 60 * 1000))
    });

  } catch (err) {
    console.error('Error al verificar si puede modificar:', err);
    res.status(500).json({
      success: false,
      message: 'Error al verificar si puede modificar',
      error: err.message
    });
  }
};
