 /**
  * HU09: Modificar fechas de una reserva vigente por código
  * CA1: Apertura de modificación (estado activa + antes de límite)
  * CA2: Disponibilidad válida (actualiza reserva e inventario)
  * CA3: Falta disponibilidad (mensaje de error)
  * CA4: Restricción temporal (menos de 24 horas para check-in)
  */
 exports.modificarFechasReservaPorCodigo = async (req, res) => {
   try {
     const { codigo } = req.params;
     const { fechaInicioNueva, fechaFinNueva } = req.body;

     // Validaciones básicas
     if (!fechaInicioNueva || !fechaFinNueva) {
       return res.status(400).json({
         success: false,
         message: 'Debe proporcionar fechaInicioNueva y fechaFinNueva'
       });
     }

     // Buscar reserva por código
     const reserva = await Reserva.findOne({ codigoReserva: codigo.toUpperCase() }).populate('habitacion hotel');

     if (!reserva) {
       return res.status(404).json({
         success: false,
         message: 'Reserva no encontrada por código'
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
         message: 'La habitación no está disponible para las nuevas fechas'
       });
     }

     // CA2: Actualizar reserva
     reserva.fechaInicio = inicio;
     reserva.fechaFin = fin;
     reserva.noches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
     // Recalcular tarifa
     const precioPorNoche = reserva.tarifa.precioPorNoche;
     const subtotal = precioPorNoche * reserva.noches;
     const impuestos = Math.round(subtotal * 0.19);
     reserva.tarifa = {
       precioPorNoche,
       subtotal,
       impuestos,
       total: subtotal + impuestos,
       moneda: 'COP'
     };

     // Guardar modificación en historial
     reserva.historialModificaciones = reserva.historialModificaciones || [];
     reserva.historialModificaciones.push({
       fechaModificacion: new Date(),
       fechaInicioAnterior: reserva.fechaInicio,
       fechaFinAnterior: reserva.fechaFin,
       fechaInicioNueva: inicio,
       fechaFinNueva: fin,
       tarifaAnterior: reserva.tarifa.total,
       tarifaNueva: subtotal + impuestos
     });

     await reserva.save();

     res.json({
       success: true,
       message: 'Reserva modificada exitosamente',
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
     console.error('Error al modificar reserva por código:', err);
     res.status(500).json({
       success: false,
       message: 'Error al modificar la reserva por código',
       error: err.message
     });
   }
 };
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
 * Obtener mis reservas (filtradas por usuario o email del huésped)
 */
exports.obtenerMisReservas = async (req, res) => {
  try {
    // Obtener datos del usuario autenticado
    const usuarioId = req.usuario.id;
    const usuarioEmail = req.usuario.email;

    // Asociar reservas antiguas (usuario: null, email coincide) al usuario actual
    await Reserva.updateMany(
      { usuario: null, 'datosHuesped.email': usuarioEmail },
      { $set: { usuario: usuarioId } }
    );

    // Buscar reservas asociadas al usuario
    const reservas = await Reserva.find({ usuario: usuarioId })
      .populate('habitacion', 'numero tipo capacidad servicios precio')
      .populate('hotel', 'nombre ciudad departamento direccion telefono email politicas')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      reservas,
      total: reservas.length
    });
  } catch (err) {
    console.error('Error al obtener mis reservas:', err);
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

// =====================================================
// HU17: RESERVAR UN SALÓN
// =====================================================

/**
 * HU17 CA1: Iniciar reserva de salón
 * Muestra resumen del salón y formulario para datos del evento
 */
exports.iniciarReservaSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { fechaInicio, fechaFin, layoutId } = req.body;

    // Validaciones básicas
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    // Obtener información del salón
    const salon = await Salon.findById(salonId).populate('hotel');
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    // Validar que el salón esté disponible
    if (!salon.disponible) {
      return res.status(400).json({
        success: false,
        message: 'Este salón no está disponible actualmente'
      });
    }

    // Buscar el layout seleccionado (si se proporcionó)
    let layoutSeleccionado = null;
    if (layoutId && salon.layouts && salon.layouts.length > 0) {
      layoutSeleccionado = salon.layouts.find(
        layout => layout._id.toString() === layoutId
      );
    }

    // Calcular días de reserva
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    // Calcular tarifa estimada
    const tarifaEstimada = {
      precioPorDia: salon.precio || 500000,
      dias: dias,
      subtotal: (salon.precio || 500000) * dias,
      impuestos: Math.round((salon.precio || 500000) * dias * 0.19),
      total: (salon.precio || 500000) * dias + Math.round((salon.precio || 500000) * dias * 0.19),
      moneda: 'COP'
    };

    // CA1: Respuesta con resumen del salón y tarifa
    res.json({
      success: true,
      message: 'Salón disponible para reserva',
      salon: {
        _id: salon._id,
        nombre: salon.nombre,
        capacidad: salon.capacidad,
        area: salon.area,
        precio: salon.precio,
        equipamiento: salon.equipamiento,
        imagenes: salon.imagenes,
        descripcion: salon.descripcion,
        hotel: {
          _id: salon.hotel._id,
          nombre: salon.hotel.nombre,
          ciudad: salon.hotel.ciudad,
          direccion: salon.hotel.direccion,
          telefono: salon.hotel.telefono,
          email: salon.hotel.email
        },
        layouts: salon.layouts
      },
      layoutSeleccionado: layoutSeleccionado,
      fechas: {
        inicio: fechaInicio,
        fin: fechaFin,
        dias: dias
      },
      tarifaEstimada: tarifaEstimada,
      formulario: {
        campos: [
          'nombreEvento',
          'tipoEvento',
          'horarioInicio',
          'horarioFin',
          'responsable',
          'cargoResponsable',
          'telefonoResponsable'
        ]
      }
    });

  } catch (err) {
    console.error('Error al iniciar reserva de salón:', err);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar reserva de salón',
      error: err.message
    });
  }
};

/**
 * HU17 CA2: Verificar disponibilidad en tiempo real
 * Previene conflictos con otras reservas simultáneas
 */
exports.verificarDisponibilidadSalonTiempoReal = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { fechaInicio, fechaFin, horarioInicio, horarioFin } = req.body;

    // Validaciones
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    const salon = await Salon.findById(salonId);
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    // CA2: Buscar reservas que se solapen con las fechas/horarios solicitados
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    const reservasConflicto = await Reserva.find({
      salon: salonId,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        {
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio }
        }
      ]
    });

    // Si hay horarios específicos, verificar solapamiento detallado
    let disponible = reservasConflicto.length === 0;
    let motivoConflicto = null;
    let reservasEnConflicto = [];

    if (reservasConflicto.length > 0) {
      // CA2: Analizar cada conflicto
      for (const reserva of reservasConflicto) {
        // Si las fechas son exactamente las mismas, verificar horarios
        if (horarioInicio && horarioFin && 
            reserva.datosEvento && 
            reserva.datosEvento.horarioInicio && 
            reserva.datosEvento.horarioFin) {
          
          // Comparar horarios (formato "HH:MM")
          const horaSolicitadaInicio = horarioInicio.replace(':', '');
          const horaSolicitadaFin = horarioFin.replace(':', '');
          const horaReservaInicio = reserva.datosEvento.horarioInicio.replace(':', '');
          const horaReservaFin = reserva.datosEvento.horarioFin.replace(':', '');

          // Verificar solapamiento de horarios
          if (!(horaSolicitadaFin <= horaReservaInicio || horaSolicitadaInicio >= horaReservaFin)) {
            disponible = false;
            reservasEnConflicto.push({
              codigoReserva: reserva.codigoReserva,
              fechaInicio: reserva.fechaInicio,
              fechaFin: reserva.fechaFin,
              horarioInicio: reserva.datosEvento.horarioInicio,
              horarioFin: reserva.datosEvento.horarioFin,
              evento: reserva.datosEvento.nombreEvento
            });
          }
        } else {
          // Sin horarios detallados, asumimos conflicto por fecha
          disponible = false;
          reservasEnConflicto.push({
            codigoReserva: reserva.codigoReserva,
            fechaInicio: reserva.fechaInicio,
            fechaFin: reserva.fechaFin
          });
        }
      }

      if (!disponible) {
        motivoConflicto = reservasEnConflicto.length > 1
          ? `Hay ${reservasEnConflicto.length} reservas confirmadas que se solapan con las fechas/horarios solicitados`
          : 'Hay otra reserva confirmada que se solapa con las fechas/horarios solicitados';
      }
    }

    // CA2: Respuesta según disponibilidad
    if (!disponible) {
      return res.status(409).json({
        success: false,
        disponible: false,
        conflicto: true,
        message: 'El salón ya no está disponible para las fechas/horarios seleccionados',
        motivo: motivoConflicto,
        reservasEnConflicto: reservasEnConflicto,
        sugerencia: 'Otro usuario realizó una reserva mientras completabas el formulario. Por favor, regresa a la búsqueda para encontrar otras opciones.'
      });
    }

    // Disponible
    res.json({
      success: true,
      disponible: true,
      message: 'El salón está disponible para las fechas/horarios seleccionados',
      salon: {
        _id: salon._id,
        nombre: salon.nombre
      },
      fechas: {
        inicio: fechaInicio,
        fin: fechaFin,
        horarioInicio: horarioInicio || 'Todo el día',
        horarioFin: horarioFin || 'Todo el día'
      }
    });

  } catch (err) {
    console.error('Error al verificar disponibilidad en tiempo real:', err);
    res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad',
      error: err.message
    });
  }
};

/**
 * HU17 CA3: Confirmar reserva de salón
 * Genera código de reserva y bloquea el horario
 * CA4: Valida que se hayan aceptado las políticas
 */
exports.confirmarReservaSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const {
      usuario, // Opcional para empresas sin cuenta
      fechaInicio,
      fechaFin,
      datosEvento, // CA1: Datos del evento
      datosContacto, // Datos de quien reserva
      politicasAceptadas, // CA4: Aceptación de políticas
      notas
    } = req.body;

    // Validaciones básicas
    if (!fechaInicio || !fechaFin || !datosEvento || !datosContacto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: fechaInicio, fechaFin, datosEvento, datosContacto'
      });
    }

    // CA1: Validar datos del evento
    if (!datosEvento.nombreEvento || !datosEvento.horarioInicio || 
        !datosEvento.horarioFin || !datosEvento.responsable) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos del evento: nombreEvento, horarioInicio, horarioFin, responsable'
      });
    }

    // CA4: Validar que se aceptaron las políticas
    if (!politicasAceptadas) {
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar las políticas de reserva para continuar'
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

    // Obtener el salón
    const salon = await Salon.findById(salonId).populate('hotel');
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    // CA2: VALIDACIÓN FINAL DE DISPONIBILIDAD (prevenir conflictos de concurrencia)
    const reservasConflicto = await Reserva.find({
      salon: salonId,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        {
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio }
        }
      ]
    });

    if (reservasConflicto.length > 0) {
      // CA2: Conflicto detectado justo antes de confirmar
      return res.status(409).json({
        success: false,
        message: 'Lo sentimos, el salón ya no está disponible para las fechas seleccionadas',
        conflicto: true,
        motivo: 'Otro usuario confirmó una reserva mientras completabas el proceso',
        sugerencia: 'Por favor, regresa a la búsqueda para encontrar otras opciones'
      });
    }

    // Calcular días
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    // CA3: Generar código de reserva único
    const codigoReserva = await Reserva.generarCodigoReserva();

    // Calcular tarifa
    const precioPorDia = salon.precio || 500000;
    const subtotal = precioPorDia * dias;
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    // Buscar el layout seleccionado
    let layoutSeleccionado = null;
    let capacidadLayout = null;
    if (datosEvento.layoutSeleccionado && salon.layouts && salon.layouts.length > 0) {
      const layout = salon.layouts.find(l => l.nombre === datosEvento.layoutSeleccionado);
      if (layout) {
        layoutSeleccionado = layout.nombre;
        capacidadLayout = layout.capacidad;
      }
    }

    // CA3: Crear la reserva de salón
    const reserva = new Reserva({
      usuario: usuario || null,
      hotel: salon.hotel._id,
      salon: salonId, // Campo específico para salones
      fechaInicio: inicio,
      fechaFin: fin,
      noches: 0, // N/A para salones
      codigoReserva,
      datosHuesped: {
        nombre: datosContacto.nombre,
        apellido: datosContacto.apellido || '',
        email: datosContacto.email,
        telefono: datosContacto.telefono,
        documento: datosContacto.documento || '',
        pais: datosContacto.pais || 'Colombia',
        ciudad: datosContacto.ciudad || ''
      },
      datosEvento: {
        nombreEvento: datosEvento.nombreEvento,
        tipoEvento: datosEvento.tipoEvento || 'Corporativo',
        horarioInicio: datosEvento.horarioInicio,
        horarioFin: datosEvento.horarioFin,
        responsable: datosEvento.responsable,
        cargoResponsable: datosEvento.cargoResponsable || '',
        telefonoResponsable: datosEvento.telefonoResponsable || datosContacto.telefono,
        layoutSeleccionado: layoutSeleccionado,
        capacidadLayout: capacidadLayout,
        serviciosAdicionales: datosEvento.serviciosAdicionales || [],
        requiremientosEspeciales: datosEvento.requiremientosEspeciales || ''
      },
      tarifa: {
        precioPorNoche: 0, // N/A para salones
        precioPorDia: precioPorDia,
        dias: dias,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total,
        moneda: 'COP'
      },
      estado: 'confirmada',
      politicasAceptadas: true,
      fechaPoliticasAceptadas: new Date(),
      notas: notas || ''
    });

    await reserva.save();

    // Poblar datos para la respuesta
    await reserva.populate('salon');
    await reserva.populate('hotel');

    // CA3: Enviar email de confirmación (sin bloquear respuesta)
    const { sendReservaSalonConfirmacionEmail } = require('../config/email');
    
    sendReservaSalonConfirmacionEmail({
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
      salon: {
        nombre: reserva.salon.nombre,
        capacidad: reserva.salon.capacidad,
        area: reserva.salon.area
      },
      evento: reserva.datosEvento,
      fechaInicio: reserva.fechaInicio,
      fechaFin: reserva.fechaFin,
      dias: dias,
      tarifa: reserva.tarifa
    })
    .then(resultado => {
      if (resultado.success) {
        reserva.notificaciones = {
          confirmacionEnviada: true,
          confirmacionFecha: new Date(),
          confirmacionMessageId: resultado.messageId
        };
        reserva.save();
        console.log(`✅ Email de confirmación enviado para reserva de salón ${reserva.codigoReserva}`);
      }
    })
    .catch(err => {
      console.error(`❌ Error al enviar email de confirmación:`, err);
      reserva.incidentesEmail = reserva.incidentesEmail || [];
      reserva.incidentesEmail.push({
        tipo: 'ERROR_ENVIO_EMAIL',
        fecha: new Date(),
        detalle: err.message,
        email: reserva.datosHuesped.email
      });
      reserva.save();
    });

    // CA3: Respuesta con código de reserva
    res.status(201).json({
      success: true,
      message: '¡Reserva de salón confirmada exitosamente!',
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        datosHuesped: reserva.datosHuesped,
        datosEvento: reserva.datosEvento,
        salon: {
          _id: reserva.salon._id,
          nombre: reserva.salon.nombre,
          capacidad: reserva.salon.capacidad,
          equipamiento: reserva.salon.equipamiento
        },
        hotel: {
          _id: reserva.hotel._id,
          nombre: reserva.hotel.nombre,
          ciudad: reserva.hotel.ciudad,
          direccion: reserva.hotel.direccion,
          telefono: reserva.hotel.telefono
        },
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        dias: dias,
        tarifa: reserva.tarifa,
        estado: reserva.estado,
        createdAt: reserva.createdAt
      }
    });

  } catch (err) {
    console.error('Error al confirmar reserva de salón:', err);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la reserva',
      error: err.message
    });
  }
};

/**
 * HU17 CA4: Obtener políticas de reserva de salones
 * Muestra condiciones antes de confirmar
 */
exports.obtenerPoliticasReservaSalon = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Si se proporciona hotelId, obtener políticas específicas
    let politicasHotel = null;
    if (hotelId) {
      const hotel = await Hotel.findById(hotelId);
      if (hotel && hotel.politicas) {
        politicasHotel = hotel.politicas;
      }
    }

    // CA4: Políticas de reserva de salones
    const politicas = {
      cancelacion: {
        titulo: 'Política de Cancelación',
        ventanaGratuita: {
          plazo: '48 horas',
          penalizacion: '0%',
          descripcion: 'Cancelación gratuita con más de 48 horas de anticipación. Se reembolsa el 100% del monto pagado.'
        },
        ventanaParcial: {
          plazo: '24-48 horas',
          penalizacion: '50%',
          descripcion: 'Cancelación entre 24 y 48 horas antes del evento. Se aplica penalización del 50%.'
        },
        ventanaTotal: {
          plazo: 'Menos de 24 horas',
          penalizacion: '100%',
          descripcion: 'Cancelación con menos de 24 horas. Se aplica penalización del 100%. No hay reembolso.'
        }
      },
      modificacion: {
        titulo: 'Política de Modificación',
        descripcion: 'Las modificaciones de fecha/horario están sujetas a disponibilidad y deben realizarse con al menos 24 horas de anticipación.',
        restricciones: [
          'Solo se permite 1 modificación sin costo',
          'Modificaciones adicionales tienen un cargo del 10% del valor',
          'No se permiten modificaciones con menos de 24 horas'
        ]
      },
      uso: {
        titulo: 'Condiciones de Uso',
        normas: [
          'El horario de uso debe respetarse estrictamente',
          'La capacidad máxima del layout seleccionado no debe excederse',
          'Se debe mantener el orden y limpieza del salón',
          'No se permite fumar dentro de las instalaciones',
          'El montaje y desmontaje deben hacerse en los horarios acordados'
        ]
      },
      servicios: {
        titulo: 'Servicios Incluidos',
        incluidos: [
          'Uso del equipamiento básico (proyector, pantalla, sonido)',
          'WiFi de alta velocidad',
          'Aire acondicionado',
          'Servicio de limpieza',
          'Soporte técnico básico'
        ],
        adicionales: [
          'Catering (bajo cotización)',
          'Decoración especial (bajo cotización)',
          'Equipo audiovisual adicional (bajo cotización)',
          'Personal de apoyo extra (bajo cotización)'
        ]
      },
      pago: {
        titulo: 'Política de Pago',
        descripcion: 'Se requiere el pago del 100% para confirmar la reserva.',
        formasPago: ['Transferencia bancaria', 'Tarjeta de crédito', 'PSE'],
        notasImportantes: [
          'Los precios incluyen IVA (19%)',
          'Las reservas están sujetas a disponibilidad',
          'El código de reserva es único e intransferible'
        ]
      }
    };

    // Agregar políticas específicas del hotel si existen
    if (politicasHotel) {
      politicas.hotelEspecificas = politicasHotel;
    }

    res.json({
      success: true,
      politicas: politicas,
      actualizacion: new Date(),
      version: '1.0'
    });

  } catch (err) {
    console.error('Error al obtener políticas:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener políticas de reserva',
      error: err.message
    });
  }
};

// =====================================================
// HU11: RECIBOS Y COMPROBANTES
// =====================================================

/**
 * HU11 CA1: Obtener recibo de una reserva (JSON para visualización)
 */
exports.obtenerReciboReserva = async (req, res) => {
  try {
    const { reservaId } = req.params;

    // Buscar reserva
    const reserva = await Reserva.findById(reservaId)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Validar que la reserva esté confirmada
    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo las reservas confirmadas tienen recibo disponible'
      });
    }

    // Generar datos del recibo
    const recibo = {
      fechaEmision: new Date(),
      hotel: {
        nombre: reserva.hotel.nombre,
        ciudad: reserva.hotel.ciudad,
        direccion: reserva.hotel.direccion,
        telefono: reserva.hotel.telefono,
        email: reserva.hotel.email
      },
      noches: reserva.noches,
      precioBase: reserva.tarifa.precioPorNoche,
      subtotal: reserva.tarifa.subtotal,
      impuestos: reserva.tarifa.impuestos,
      porcentajeImpuesto: 19,
      descuentos: 0,
      serviciosAdicionales: [],
      metodoPago: 'Tarjeta de Crédito',
      fechaPago: reserva.createdAt,
      transaccionId: `TXN-${reserva.codigoReserva}`
    };

    res.json({
      success: true,
      recibo,
      reserva
    });

  } catch (err) {
    console.error('Error al obtener recibo:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener recibo',
      error: err.message
    });
  }
};

/**
 * HU11 CA2: Descargar recibo en PDF
 */
exports.descargarReciboPDF = async (req, res) => {
  try {
    const { reservaId } = req.params;

    // Buscar reserva
    const reserva = await Reserva.findById(reservaId)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo las reservas confirmadas tienen recibo disponible'
      });
    }

    // Generar PDF usando el controlador de comprobantes
    const comprobanteController = require('./comprobanteController');
    
    // Simular request con codigoReserva
    const fakeReq = {
      params: { codigoReserva: reserva.codigoReserva },
      query: { idioma: 'es' }
    };

    return comprobanteController.descargarComprobantePDF(fakeReq, res);

  } catch (err) {
    console.error('Error al descargar PDF:', err);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: err.message
    });
  }
};

/**
 * HU11: Enviar recibo por email
 */
exports.enviarReciboPorEmail = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Buscar reserva
    const reserva = await Reserva.findById(reservaId)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo las reservas confirmadas tienen recibo disponible'
      });
    }

    // Enviar por email usando el sistema de emails
    const { sendReservaConfirmacionEmail } = require('../config/email');

    const emailData = {
      email: email,
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
      tarifa: {
        precioPorNoche: reserva.tarifa.precioPorNoche,
        subtotal: reserva.tarifa.subtotal,
        impuestos: reserva.tarifa.impuestos,
        total: reserva.tarifa.total,
        moneda: reserva.tarifa.moneda || 'COP'
      },
      checkInTime: '15:00',
      checkOutTime: '12:00'
    };

    const resultado = await sendReservaConfirmacionEmail(emailData);

    if (resultado.success) {
      res.json({
        success: true,
        message: `Recibo enviado exitosamente a ${email}`,
        messageId: resultado.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al enviar el recibo por email',
        error: resultado.error
      });
    }

  } catch (err) {
    console.error('Error al enviar recibo por email:', err);
    res.status(500).json({
      success: false,
      message: 'Error al enviar recibo por email',
      error: err.message
    });
  }
};

/**
 * HU12: Reenviar email de confirmación
 */
exports.reenviarEmailConfirmacion = async (req, res) => {
  try {
    const { reservaId } = req.params;

    // Buscar reserva
    const reserva = await Reserva.findById(reservaId)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede reenviar confirmación de reservas confirmadas'
      });
    }

    // Reenviar email usando los mismos datos
    const { sendReservaConfirmacionEmail } = require('../config/email');

    const emailData = {
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
      tarifa: {
        precioPorNoche: reserva.tarifa.precioPorNoche,
        subtotal: reserva.tarifa.subtotal,
        impuestos: reserva.tarifa.impuestos,
        total: reserva.tarifa.total,
        moneda: reserva.tarifa.moneda || 'COP'
      },
      checkInTime: '15:00',
      checkOutTime: '12:00'
    };

    const resultado = await sendReservaConfirmacionEmail(emailData);

    if (resultado.success) {
      res.json({
        success: true,
        message: 'Email de confirmación reenviado exitosamente',
        messageId: resultado.messageId,
        destinatario: reserva.datosHuesped.email
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al reenviar email de confirmación',
        error: resultado.error
      });
    }

  } catch (err) {
    console.error('Error al reenviar email:', err);
    res.status(500).json({
      success: false,
      message: 'Error al reenviar email de confirmación',
      error: err.message
    });
  }
};
