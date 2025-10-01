const Reserva = require('../models/Reserva');
const Salon = require('../models/Salon');
const Habitacion = require('../models/Habitacion');
const Hotel = require('../models/Hotel');

/**
 * HU18: RESERVAR UN PAQUETE CORPORATIVO
 * Salón + Habitaciones + Catering
 */

/**
 * HU18 CA1: Iniciar selección de paquete corporativo
 * Permite elegir salón, número de habitaciones y catering
 */
exports.iniciarPaqueteCorporativo = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { fechaInicio, fechaFin } = req.body;

    // Validaciones básicas
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    // Obtener hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }

    // CA1: Obtener salones disponibles del hotel
    const salones = await Salon.find({ hotel: hotelId, disponible: true });

    // CA1: Obtener habitaciones disponibles del hotel
    const habitaciones = await Habitacion.find({ hotel: hotelId, disponible: true });

    // Agrupar habitaciones por tipo
    const habitacionesPorTipo = habitaciones.reduce((acc, hab) => {
      const tipo = hab.tipo || 'Estándar';
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo: tipo,
          cantidad: 0,
          precio: hab.precio,
          capacidad: hab.capacidad,
          ejemplos: []
        };
      }
      acc[tipo].cantidad++;
      if (acc[tipo].ejemplos.length < 3) {
        acc[tipo].ejemplos.push({
          _id: hab._id,
          numero: hab.numero,
          capacidad: hab.capacidad
        });
      }
      return acc;
    }, {});

    // CA1: Opciones de catering disponibles
    const opcionesCatering = [
      {
        tipo: 'Coffee Break',
        descripcion: 'Café, té, jugos, pasabocas dulces y salados',
        precioPorPersona: 15000,
        duracion: '30 minutos'
      },
      {
        tipo: 'Desayuno Ejecutivo',
        descripcion: 'Desayuno completo buffet con frutas, jugos, café, pan, huevos',
        precioPorPersona: 25000,
        duracion: '1 hora'
      },
      {
        tipo: 'Almuerzo Corporativo',
        descripcion: 'Menú de 3 tiempos: entrada, plato fuerte, postre y bebida',
        precioPorPersona: 45000,
        duracion: '1.5 horas'
      },
      {
        tipo: 'Cena de Gala',
        descripcion: 'Menú premium de 4 tiempos con vino',
        precioPorPersona: 85000,
        duracion: '2 horas'
      },
      {
        tipo: 'Paquete Día Completo',
        descripcion: 'Coffee Break AM + Almuerzo + Coffee Break PM',
        precioPorPersona: 75000,
        duracion: 'Todo el día'
      }
    ];

    // Calcular días
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    // CA1: Respuesta con opciones disponibles
    res.json({
      success: true,
      message: 'Opciones de paquete corporativo disponibles',
      hotel: {
        _id: hotel._id,
        nombre: hotel.nombre,
        ciudad: hotel.ciudad,
        direccion: hotel.direccion,
        telefono: hotel.telefono,
        email: hotel.email
      },
      fechas: {
        inicio: fechaInicio,
        fin: fechaFin,
        dias: dias
      },
      componentes: {
        salones: salones.map(s => ({
          _id: s._id,
          nombre: s.nombre,
          capacidad: s.capacidad,
          area: s.area,
          precio: s.precio,
          equipamiento: s.equipamiento,
          layouts: s.layouts
        })),
        habitaciones: Object.values(habitacionesPorTipo),
        catering: opcionesCatering
      },
      descuentoPaquete: 10, // 10% de descuento por paquete completo
      notasImportantes: [
        'El paquete incluye 10% de descuento sobre el total',
        'Se requiere reservar todos los componentes juntos',
        'Las habitaciones incluyen desayuno',
        'El catering debe confirmarse con 48 horas de anticipación'
      ]
    });

  } catch (err) {
    console.error('Error al iniciar paquete corporativo:', err);
    res.status(500).json({
      success: false,
      message: 'Error al cargar opciones de paquete',
      error: err.message
    });
  }
};

/**
 * HU18 CA2: Validar disponibilidad conjunta de todos los componentes
 * CA3: Detectar inconsistencias y ofrecer alternativas
 */
exports.validarDisponibilidadPaquete = async (req, res) => {
  try {
    const {
      hotelId,
      salonId,
      habitaciones, // Array: [{ tipo, cantidad }]
      catering, // { tipo, numeroPersonas }
      fechaInicio,
      fechaFin,
      horarioEvento
    } = req.body;

    // Validaciones básicas
    if (!hotelId || !salonId || !habitaciones || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para validar disponibilidad'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const inconsistencias = [];
    let todosDisponibles = true;

    // ========== CA2: VALIDAR SALÓN ==========
    const salon = await Salon.findById(salonId);
    let salonDisponible = false;

    if (!salon) {
      inconsistencias.push({
        componente: 'salon',
        motivo: 'Salón no encontrado',
        alternativaOfrecida: null
      });
      todosDisponibles = false;
    } else if (!salon.disponible) {
      inconsistencias.push({
        componente: 'salon',
        motivo: 'Salón no disponible actualmente',
        alternativaOfrecida: null
      });
      todosDisponibles = false;
    } else {
      // Verificar reservas del salón en las fechas solicitadas
      const reservasSalon = await Reserva.find({
        salon: salonId,
        estado: { $in: ['confirmada', 'pendiente'] },
        $or: [
          { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }
        ]
      });

      // Si hay horarios específicos, verificar solapamiento
      if (horarioEvento && horarioEvento.inicio && horarioEvento.fin && reservasSalon.length > 0) {
        for (const reserva of reservasSalon) {
          if (reserva.datosEvento && reserva.datosEvento.horarioInicio && reserva.datosEvento.horarioFin) {
            const horaInicio = horarioEvento.inicio.replace(':', '');
            const horaFin = horarioEvento.fin.replace(':', '');
            const horaReservaInicio = reserva.datosEvento.horarioInicio.replace(':', '');
            const horaReservaFin = reserva.datosEvento.horarioFin.replace(':', '');

            if (!(horaFin <= horaReservaInicio || horaInicio >= horaReservaFin)) {
              // Hay solapamiento
              inconsistencias.push({
                componente: 'salon',
                motivo: `Salón ocupado de ${reserva.datosEvento.horarioInicio} a ${reserva.datosEvento.horarioFin}`,
                alternativaOfrecida: 'Cambie el horario o seleccione otro salón'
              });
              todosDisponibles = false;
              break;
            }
          }
        }
      } else if (reservasSalon.length > 0) {
        inconsistencias.push({
          componente: 'salon',
          motivo: 'Salón tiene reservas en las fechas seleccionadas',
          alternativaOfrecida: 'Seleccione otras fechas o cambiar el horario'
        });
        todosDisponibles = false;
      }

      if (inconsistencias.filter(i => i.componente === 'salon').length === 0) {
        salonDisponible = true;
      }
    }

    // CA3: Si el salón no está disponible, buscar alternativas
    let salonesAlternativos = [];
    if (!salonDisponible) {
      salonesAlternativos = await Salon.find({
        hotel: hotelId,
        disponible: true,
        _id: { $ne: salonId }
      }).limit(3);
    }

    // ========== CA2: VALIDAR HABITACIONES ==========
    let habitacionesDisponibles = true;
    const habitacionesValidadas = [];

    for (const solicitud of habitaciones) {
      // Buscar habitaciones del tipo solicitado
      const habitacionesTipo = await Habitacion.find({
        hotel: hotelId,
        tipo: solicitud.tipo,
        disponible: true
      });

      // Verificar cuántas están realmente disponibles en las fechas
      let disponiblesEnFechas = 0;
      const idsDisponibles = [];

      for (const hab of habitacionesTipo) {
        // Buscar reservas de esta habitación en las fechas
        const reservasHab = await Reserva.find({
          habitacion: hab._id,
          estado: { $in: ['confirmada', 'pendiente'] },
          $or: [
            { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }
          ]
        });

        if (reservasHab.length === 0) {
          disponiblesEnFechas++;
          idsDisponibles.push(hab._id);
        }

        if (disponiblesEnFechas >= solicitud.cantidad) {
          break;
        }
      }

      habitacionesValidadas.push({
        tipo: solicitud.tipo,
        solicitadas: solicitud.cantidad,
        disponibles: disponiblesEnFechas,
        suficientes: disponiblesEnFechas >= solicitud.cantidad,
        ids: idsDisponibles.slice(0, solicitud.cantidad)
      });

      if (disponiblesEnFechas < solicitud.cantidad) {
        inconsistencias.push({
          componente: 'habitaciones',
          motivo: `Solo hay ${disponiblesEnFechas} habitaciones tipo ${solicitud.tipo} disponibles (solicitaste ${solicitud.cantidad})`,
          alternativaOfrecida: disponiblesEnFechas > 0 
            ? `Reservar ${disponiblesEnFechas} habitaciones o cambiar fechas`
            : 'Seleccione otras fechas o tipo de habitación'
        });
        habitacionesDisponibles = false;
        todosDisponibles = false;
      }
    }

    // CA3: Si faltan habitaciones, buscar alternativas
    let habitacionesAlternativas = [];
    if (!habitacionesDisponibles) {
      // Buscar otros tipos de habitaciones disponibles
      const todasHabitaciones = await Habitacion.find({
        hotel: hotelId,
        disponible: true
      });

      const tiposDisponibles = {};
      for (const hab of todasHabitaciones) {
        const reservas = await Reserva.find({
          habitacion: hab._id,
          estado: { $in: ['confirmada', 'pendiente'] },
          $or: [
            { fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }
          ]
        });

        if (reservas.length === 0) {
          const tipo = hab.tipo || 'Estándar';
          if (!tiposDisponibles[tipo]) {
            tiposDisponibles[tipo] = {
              tipo: tipo,
              cantidad: 0,
              precio: hab.precio
            };
          }
          tiposDisponibles[tipo].cantidad++;
        }
      }

      habitacionesAlternativas = Object.values(tiposDisponibles);
    }

    // ========== CA2: VALIDAR CATERING ==========
    let cateringDisponible = true;

    if (catering && catering.tipo) {
      // Validar capacidad de cocina/personal
      // Por simplicidad, asumimos disponible si hay menos de 200 personas
      if (catering.numeroPersonas > 200) {
        inconsistencias.push({
          componente: 'catering',
          motivo: 'Capacidad máxima de catering es 200 personas',
          alternativaOfrecida: 'Reducir número de asistentes o contratar catering externo'
        });
        cateringDisponible = false;
        todosDisponibles = false;
      }

      // Validar que se solicite con anticipación mínima (48 horas)
      const horasHastaEvento = (inicio - new Date()) / (1000 * 60 * 60);
      if (horasHastaEvento < 48) {
        inconsistencias.push({
          componente: 'catering',
          motivo: 'El catering debe solicitarse con mínimo 48 horas de anticipación',
          alternativaOfrecida: 'Seleccione una fecha posterior o renuncie al catering'
        });
        cateringDisponible = false;
        todosDisponibles = false;
      }
    }

    // ========== RESPUESTA ==========
    const respuesta = {
      success: todosDisponibles,
      todosDisponibles: todosDisponibles,
      validacion: {
        salonDisponible: salonDisponible,
        habitacionesDisponibles: habitacionesDisponibles,
        cateringDisponible: cateringDisponible,
        fechaValidacion: new Date()
      },
      detalles: {
        salon: salonDisponible ? {
          _id: salon._id,
          nombre: salon.nombre,
          disponible: true
        } : null,
        habitaciones: habitacionesValidadas,
        catering: cateringDisponible ? {
          tipo: catering?.tipo,
          numeroPersonas: catering?.numeroPersonas,
          disponible: true
        } : null
      }
    };

    // CA3: Agregar inconsistencias y alternativas si las hay
    if (!todosDisponibles) {
      respuesta.inconsistencias = inconsistencias;
      respuesta.alternativas = {
        salones: salonesAlternativos.length > 0 ? salonesAlternativos.map(s => ({
          _id: s._id,
          nombre: s.nombre,
          capacidad: s.capacidad,
          precio: s.precio
        })) : [],
        habitaciones: habitacionesAlternativas,
        mensaje: 'Revise los componentes no disponibles y considere las alternativas ofrecidas'
      };

      return res.status(409).json(respuesta);
    }

    // CA2: Todo disponible
    respuesta.message = 'Todos los componentes del paquete están disponibles';
    res.json(respuesta);

  } catch (err) {
    console.error('Error al validar disponibilidad de paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al validar disponibilidad',
      error: err.message
    });
  }
};

/**
 * HU18 CA4: Confirmar paquete corporativo
 * Genera código único y bloquea todos los recursos
 */
exports.confirmarPaqueteCorporativo = async (req, res) => {
  try {
    const {
      hotelId,
      salonId,
      habitaciones, // Array con IDs específicos: [{ habitacionId, tipo }]
      catering,
      fechaInicio,
      fechaFin,
      datosEvento,
      datosContacto,
      politicasAceptadas
    } = req.body;

    // Validaciones básicas
    if (!politicasAceptadas) {
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar las políticas para continuar'
      });
    }

    if (!datosEvento || !datosEvento.nombreEvento || !datosEvento.responsable) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos del evento'
      });
    }

    if (!datosContacto || !datosContacto.email || !datosContacto.telefono) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos de contacto'
      });
    }

    // Obtener datos del hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }

    // CA2: VALIDACIÓN FINAL DE DISPONIBILIDAD
    // (Prevenir race conditions)
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Validar salón
    const reservasSalon = await Reserva.find({
      salon: salonId,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [{ fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }]
    });

    if (reservasSalon.length > 0) {
      return res.status(409).json({
        success: false,
        conflicto: true,
        message: 'El salón ya no está disponible',
        sugerencia: 'Otro usuario reservó mientras completabas el proceso'
      });
    }

    // Validar habitaciones
    for (const habSolicitud of habitaciones) {
      const reservasHab = await Reserva.find({
        habitacion: habSolicitud.habitacionId,
        estado: { $in: ['confirmada', 'pendiente'] },
        $or: [{ fechaInicio: { $lte: fin }, fechaFin: { $gte: inicio } }]
      });

      if (reservasHab.length > 0) {
        return res.status(409).json({
          success: false,
          conflicto: true,
          message: `Una de las habitaciones ya no está disponible (${habSolicitud.tipo})`,
          sugerencia: 'Vuelva a validar disponibilidad'
        });
      }
    }

    // CA4: GENERAR CÓDIGOS ÚNICOS
    const codigoReserva = await Reserva.generarCodigoReserva();
    const codigoPaquete = await Reserva.generarCodigoPaquete();

    // Calcular días y noches
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    const noches = dias;

    // Obtener datos del salón
    const salon = await Salon.findById(salonId);

    // Calcular tarifas
    let costoSalon = (salon.precio || 500000) * dias;
    let costoHabitaciones = 0;
    const habitacionesDetalles = [];

    for (const habSolicitud of habitaciones) {
      const hab = await Habitacion.findById(habSolicitud.habitacionId);
      const costo = hab.precio * noches;
      costoHabitaciones += costo;
      habitacionesDetalles.push({
        habitacion: hab._id,
        cantidad: 1,
        tipo: hab.tipo
      });
    }

    let costoCatering = 0;
    if (catering && catering.incluido) {
      const precioPorPersona = catering.precioPorPersona || 45000;
      costoCatering = precioPorPersona * (catering.numeroPersonas || 0);
    }

    // Calcular total
    const totalSinDescuento = costoSalon + costoHabitaciones + costoCatering;
    const descuentoPorcentaje = 10; // 10% de descuento por paquete
    const descuentoMonto = Math.round(totalSinDescuento * (descuentoPorcentaje / 100));
    const subtotal = totalSinDescuento - descuentoMonto;
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    // CA4: CREAR RESERVA DE PAQUETE
    const reservaPaquete = new Reserva({
      hotel: hotelId,
      salon: salonId,
      fechaInicio: inicio,
      fechaFin: fin,
      datosHuesped: {
        nombre: datosContacto.nombre,
        apellido: datosContacto.apellido || '',
        email: datosContacto.email,
        telefono: datosContacto.telefono,
        documento: datosContacto.documento || '',
        pais: datosContacto.pais || 'Colombia',
        ciudad: datosContacto.ciudad || ''
      },
      codigoReserva: codigoReserva,
      huespedes: catering?.numeroPersonas || salon.capacidad,
      noches: noches,
      tarifa: {
        precioPorNoche: 0,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total,
        moneda: 'COP'
      },
      estado: 'confirmada',
      politicasAceptadas: true,
      fechaPoliticasAceptadas: new Date(),
      datosEvento: {
        nombreEvento: datosEvento.nombreEvento,
        tipoEvento: datosEvento.tipoEvento || 'Corporativo',
        horarioInicio: datosEvento.horarioInicio,
        horarioFin: datosEvento.horarioFin,
        responsable: datosEvento.responsable,
        cargoResponsable: datosEvento.cargoResponsable || '',
        telefonoResponsable: datosEvento.telefonoResponsable || datosContacto.telefono,
        layoutSeleccionado: datosEvento.layoutSeleccionado,
        capacidadLayout: datosEvento.capacidadLayout,
        serviciosAdicionales: datosEvento.serviciosAdicionales || [],
        requiremientosEspeciales: datosEvento.requiremientosEspeciales || ''
      },
      datosPaquete: {
        esPaquete: true,
        salon: salonId,
        habitaciones: habitacionesDetalles,
        catering: catering || { incluido: false },
        validacionDisponibilidad: {
          salonDisponible: true,
          habitacionesDisponibles: true,
          cateringDisponible: catering?.incluido || false,
          todosDisponibles: true,
          fechaValidacion: new Date()
        },
        codigoPaquete: codigoPaquete,
        descuentoPaquete: descuentoPorcentaje,
        totalSinDescuento: totalSinDescuento,
        totalConDescuento: total
      }
    });

    await reservaPaquete.save();

    // CA4: CREAR RESERVAS INDIVIDUALES PARA CADA HABITACIÓN
    // (Para bloquear el inventario)
    const reservasHabitaciones = [];
    for (const habSolicitud of habitaciones) {
      const hab = await Habitacion.findById(habSolicitud.habitacionId);
      const codigoHabitacion = await Reserva.generarCodigoReserva();

      const reservaHab = new Reserva({
        hotel: hotelId,
        habitacion: hab._id,
        fechaInicio: inicio,
        fechaFin: fin,
        datosHuesped: {
          nombre: datosContacto.nombre,
          apellido: datosContacto.apellido || '',
          email: datosContacto.email,
          telefono: datosContacto.telefono,
          documento: datosContacto.documento || '',
          pais: datosContacto.pais || 'Colombia',
          ciudad: datosContacto.ciudad || ''
        },
        codigoReserva: codigoHabitacion,
        huespedes: hab.capacidad,
        noches: noches,
        tarifa: {
          precioPorNoche: hab.precio,
          subtotal: hab.precio * noches,
          impuestos: Math.round(hab.precio * noches * 0.19),
          total: hab.precio * noches + Math.round(hab.precio * noches * 0.19),
          moneda: 'COP'
        },
        estado: 'confirmada',
        politicasAceptadas: true,
        fechaPoliticasAceptadas: new Date(),
        notas: `Parte del paquete corporativo ${codigoPaquete}`
      });

      await reservaHab.save();
      reservasHabitaciones.push({
        codigo: codigoHabitacion,
        habitacion: hab.numero,
        tipo: hab.tipo
      });
    }

    // Poblar datos para respuesta
    await reservaPaquete.populate('salon');
    await reservaPaquete.populate('hotel');

    // CA4: Respuesta con código único de paquete
    res.status(201).json({
      success: true,
      message: '¡Paquete corporativo confirmado exitosamente!',
      paquete: {
        _id: reservaPaquete._id,
        codigoReserva: reservaPaquete.codigoReserva,
        codigoPaquete: codigoPaquete,
        datosHuesped: reservaPaquete.datosHuesped,
        datosEvento: reservaPaquete.datosEvento,
        componentes: {
          salon: {
            _id: reservaPaquete.salon._id,
            nombre: reservaPaquete.salon.nombre,
            capacidad: reservaPaquete.salon.capacidad
          },
          habitaciones: reservasHabitaciones,
          catering: reservaPaquete.datosPaquete.catering
        },
        hotel: {
          _id: reservaPaquete.hotel._id,
          nombre: reservaPaquete.hotel.nombre,
          ciudad: reservaPaquete.hotel.ciudad,
          direccion: reservaPaquete.hotel.direccion,
          telefono: reservaPaquete.hotel.telefono
        },
        fechaInicio: reservaPaquete.fechaInicio,
        fechaFin: reservaPaquete.fechaFin,
        dias: dias,
        desglose: {
          costoSalon: costoSalon,
          costoHabitaciones: costoHabitaciones,
          costoCatering: costoCatering,
          totalSinDescuento: totalSinDescuento,
          descuento: descuentoMonto,
          descuentoPorcentaje: descuentoPorcentaje,
          subtotal: subtotal,
          impuestos: impuestos,
          total: total
        },
        tarifa: reservaPaquete.tarifa,
        estado: reservaPaquete.estado,
        createdAt: reservaPaquete.createdAt
      }
    });

  } catch (err) {
    console.error('Error al confirmar paquete corporativo:', err);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el paquete',
      error: err.message
    });
  }
};

module.exports = {
  iniciarPaqueteCorporativo,
  validarDisponibilidadPaquete,
  confirmarPaqueteCorporativo
};
