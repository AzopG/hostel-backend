const Paquete = require('../models/Paquete');
const Hotel = require('../models/Hotel');
const Salon = require('../models/Salon');
const Habitacion = require('../models/Habitacion');

/**
 * GESTIÓN ADMINISTRATIVA DE PAQUETES
 * Para que admin de hotel cree y gestione paquetes corporativos
 */

/**
 * Listar paquetes de todos los hoteles (para admin_hotel que gestiona toda la red)
 */
const listarTodosPaquetes = async (req, res) => {
  try {
    const { activo } = req.query;

    // Construir filtro
    const filtro = {};
    if (activo !== undefined) {
      filtro.activo = activo === 'true';
    }

    const paquetes = await Paquete.find(filtro)
      .populate('hotel', 'nombre ciudad')
      .populate('salones.salonId', 'nombre capacidad')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      paquetes,
      total: paquetes.length
    });

  } catch (err) {
    console.error('Error al listar todos los paquetes:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los paquetes',
      error: err.message
    });
  }
};

/**
 * Listar todos los hoteles (para admins que gestionan toda la red)
 */
const listarTodosLosHoteles = async (req, res) => {
  try {
    const hoteles = await Hotel.find({ activo: true })
      .select('nombre ciudad direccion telefono')
      .sort({ nombre: 1 });

    res.json({
      success: true,
      hoteles,
      total: hoteles.length
    });

  } catch (err) {
    console.error('Error al listar hoteles:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los hoteles',
      error: err.message
    });
  }
};

/**
 * Listar todos los paquetes de un hotel (para admin)
 */
const listarPaquetesHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { activo } = req.query;

    // Construir filtro
    const filtro = { hotel: hotelId };
    if (activo !== undefined) {
      filtro.activo = activo === 'true';
    }

    const paquetes = await Paquete.find(filtro)
      .populate('hotel', 'nombre ciudad')
      .populate('salones.salonId', 'nombre capacidad')
      .populate('creadoPor', 'nombre email')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      paquetes,
      total: paquetes.length
    });

  } catch (err) {
    console.error('Error al listar paquetes:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los paquetes',
      error: err.message
    });
  }
};

/**
 * Obtener detalles de un paquete específico
 */
const obtenerPaquete = async (req, res) => {
  try {
    const { paqueteId } = req.params;

    const paquete = await Paquete.findById(paqueteId)
      .populate('hotel', 'nombre ciudad direccion telefono')
      .populate('salones.salonId', 'nombre capacidad equipamiento serviciosIncluidos precioPorDia')
      .populate('creadoPor', 'nombre email');

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

  } catch (err) {
    console.error('Error al obtener paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el paquete',
      error: err.message
    });
  }
};

/**
 * Crear nuevo paquete corporativo
 */
const crearPaquete = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      hotel,
      tipo = 'evento_corporativo',
      capacidadMinima = 1,
      capacidadMaxima = 100,
      habitaciones = [],
      salones = [],
      servicios = [],
      catering = [],
      // Estructura de precios
      precios,
      precioBase, // Para compatibilidad con frontend
      descuentoPorcentaje = 10,
      // Condiciones
      condiciones,
      minDias = 1,
      maxDias = 30,
      anticipacionMinima = 7,
      // Políticas
      politicas,
      politicaCancelacion,
      // Disponibilidad
      disponibilidad,
      fechaInicio,
      fechaFin,
      // Estado
      estado = 'borrador',
      activo = true,
      // Otros campos
      terminosEspeciales,
      notasInternas,
      instruccionesEspeciales
    } = req.body;

    // Validaciones básicas
    if (!nombre || !descripcion || !hotel) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: nombre, descripción, hotel'
      });
    }

    // Validar precio base (puede venir en precioBase o precios.base)
    const precioFinal = precioBase || (precios && precios.base);
    if (!precioFinal || precioFinal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio base es obligatorio y debe ser mayor a 0'
      });
    }

    // Verificar que el hotel existe
    const hotelExiste = await Hotel.findById(hotel);
    if (!hotelExiste) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }

    // Verificar salones si se especifican
    if (salones && salones.length > 0) {
      for (const salon of salones) {
        if (salon.salonId) {
          const salonExiste = await Salon.findOne({ _id: salon.salonId, hotel: hotel });
          if (!salonExiste) {
            return res.status(400).json({
              success: false,
              message: `Salón ${salon.salonId} no encontrado o no pertenece al hotel`
            });
          }
        }
      }
    }

    // Preparar estructura de precios
    const estructuraPrecios = precios || {
      base: precioFinal,
      moneda: 'COP',
      calculoPor: 'paquete_completo',
      incluyeIVA: false,
      incluyeServicio: false,
      descuentos: descuentoPorcentaje > 0 ? [{
        nombre: 'Descuento estándar',
        porcentaje: descuentoPorcentaje,
        condicion: 'Aplicable según condiciones'
      }] : []
    };

    // Preparar condiciones
    const condicionesFinales = condiciones || {
      minDias,
      maxDias,
      anticipacionMinima,
      anticipacionMaxima: 365,
      anticipoRequerido: 50,
      formasPago: ['transferencia', 'tarjeta_credito']
    };

    // Preparar políticas
    const politicasFinales = politicas || {
      cancelacion: {
        con48Horas: 25,
        con24Horas: 50,
        menorA24Horas: 100,
        detalles: politicaCancelacion || 'Políticas estándar de cancelación'
      },
      modificaciones: {
        permitidas: true,
        costoModificacion: 0,
        plazoLimite: 48
      }
    };

    // Preparar disponibilidad
    const disponibilidadFinal = disponibilidad || {
      diasSemana: [1, 2, 3, 4, 5], // Lunes a viernes por defecto
      horariosPreferidos: [],
      fechasNoDisponibles: [],
      temporadaAlta: []
    };

    // Crear el paquete con el nuevo modelo
    const nuevoPaquete = new Paquete({
      nombre,
      descripcion,
      hotel,
      tipo,
      capacidadMinima,
      capacidadMaxima,
      habitaciones,
      salones,
      servicios,
      catering,
      precios: estructuraPrecios,
      condiciones: condicionesFinales,
      politicas: politicasFinales,
      disponibilidad: disponibilidadFinal,
      estado: activo ? 'activo' : estado,
      publicado: false,
      visibilidad: {
        publico: false,
        soloEmpresas: true,
        empresasAutorizadas: []
      },
      creadoPor: req.usuario.id,
      version: 1,
      estadisticas: {
        vecesReservado: 0,
        ingresosTotales: 0,
        calificacionPromedio: 0
      },
      notasInternas,
      instruccionesEspeciales,
      
      // Campos legacy para compatibilidad
      precioBase: precioFinal,
      descuentoPorcentaje,
      precioMinimo: precioFinal * (1 - (descuentoPorcentaje / 100)),
      minDias,
      maxDias,
      anticipacionMinima,
      activo,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      terminosEspeciales,
      politicaCancelacion
    });

    await nuevoPaquete.save();

    // Poblar los datos para la respuesta
    await nuevoPaquete.populate('hotel', 'nombre ciudad');
    if (nuevoPaquete.salones && nuevoPaquete.salones.length > 0) {
      await nuevoPaquete.populate('salones.salonId', 'nombre capacidad');
    }

    res.status(201).json({
      success: true,
      message: 'Paquete corporativo creado exitosamente',
      paquete: nuevoPaquete
    });

  } catch (err) {
    console.error('Error al crear paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear el paquete',
      error: err.message
    });
  }
};

/**
 * Actualizar paquete existente
 */
const actualizarPaquete = async (req, res) => {
  try {
    const { paqueteId } = req.params;
    const datosActualizacion = req.body;

    // Verificar que el paquete existe
    const paquete = await Paquete.findById(paqueteId);
    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Si se está actualizando el precio base, recalcular precio mínimo
    if (datosActualizacion.precioBase || datosActualizacion.descuentoPorcentaje) {
      const nuevoPrecioBase = datosActualizacion.precioBase || paquete.precioBase;
      const nuevoDescuento = datosActualizacion.descuentoPorcentaje || paquete.descuentoPorcentaje;
      datosActualizacion.precioMinimo = nuevoPrecioBase * (1 - (nuevoDescuento / 100));
    }

    // Si se están actualizando los salones, verificar que existen
    if (datosActualizacion.salones) {
      for (const salon of datosActualizacion.salones) {
        const salonExiste = await Salon.findOne({ _id: salon.salonId, hotel: paquete.hotel });
        if (!salonExiste) {
          return res.status(400).json({
            success: false,
            message: `Salón ${salon.salonId} no encontrado o no pertenece al hotel`
          });
        }
      }
    }

    // Actualizar fechas si se proporcionan
    if (datosActualizacion.fechaInicio) {
      datosActualizacion.fechaInicio = new Date(datosActualizacion.fechaInicio);
    }
    if (datosActualizacion.fechaFin) {
      datosActualizacion.fechaFin = new Date(datosActualizacion.fechaFin);
    }

    // Actualizar el paquete
    const paqueteActualizado = await Paquete.findByIdAndUpdate(
      paqueteId,
      datosActualizacion,
      { new: true }
    )
    .populate('hotel', 'nombre ciudad')
    .populate('salones.salonId', 'nombre capacidad');

    res.json({
      success: true,
      message: 'Paquete actualizado exitosamente',
      paquete: paqueteActualizado
    });

  } catch (err) {
    console.error('Error al actualizar paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el paquete',
      error: err.message
    });
  }
};

/**
 * Eliminar/desactivar paquete
 */
const eliminarPaquete = async (req, res) => {
  try {
    const { paqueteId } = req.params;
    const { eliminarDefinitivamente } = req.query;

    const paquete = await Paquete.findById(paqueteId);
    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    if (eliminarDefinitivamente === 'true') {
      // Eliminar definitivamente
      await Paquete.findByIdAndDelete(paqueteId);
      res.json({
        success: true,
        message: 'Paquete eliminado definitivamente'
      });
    } else {
      // Solo desactivar
      paquete.activo = false;
      await paquete.save();
      res.json({
        success: true,
        message: 'Paquete desactivado exitosamente'
      });
    }

  } catch (err) {
    console.error('Error al eliminar paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el paquete',
      error: err.message
    });
  }
};

/**
 * Activar/desactivar paquete
 */
const cambiarEstadoPaquete = async (req, res) => {
  try {
    const { paqueteId } = req.params;
    const { activo } = req.body;

    const paquete = await Paquete.findById(paqueteId);
    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    paquete.activo = activo;
    await paquete.save();

    res.json({
      success: true,
      message: `Paquete ${activo ? 'activado' : 'desactivado'} exitosamente`,
      paquete
    });

  } catch (err) {
    console.error('Error al cambiar estado del paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del paquete',
      error: err.message
    });
  }
};

/**
 * Obtener opciones para crear un paquete (salones y tipos de habitación disponibles)
 */
const obtenerOpcionesPaquete = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Obtener salones del hotel
    const salones = await Salon.find({ hotel: hotelId, disponible: true })
      .select('nombre capacidad equipamiento serviciosIncluidos precioPorDia');

    // Obtener tipos de habitaciones disponibles con ejemplos
    const habitaciones = await Habitacion.aggregate([
      { $match: { hotel: hotelId, disponible: true } },
      {
        $group: {
          _id: '$tipo',
          cantidad: { $sum: 1 },
          precioPromedio: { $avg: '$precio' },
          capacidadPromedio: { $avg: '$capacidad' },
          ejemplos: { 
            $push: { 
              _id: '$_id', 
              numero: '$numero', 
              capacidad: '$capacidad',
              precio: '$precio',
              servicios: '$servicios'
            }
          }
        }
      },
      {
        $project: {
          tipo: '$_id',
          cantidad: 1,
          precioPromedio: { $round: ['$precioPromedio', 0] },
          capacidadPromedio: { $round: ['$capacidadPromedio', 0] },
          ejemplos: { $slice: ['$ejemplos', 3] } // Solo 3 ejemplos
        }
      }
    ]);

    // Servicios estándar disponibles
    const serviciosEstandar = [
      { nombre: 'WiFi Premium', descripcion: 'Internet de alta velocidad', precio: 0 },
      { nombre: 'Aire Acondicionado', descripcion: 'Climatización personalizada', precio: 0 },
      { nombre: 'Servicio de Limpieza Extra', descripcion: 'Limpieza adicional durante la estadía', precio: 50000 },
      { nombre: 'Transporte Aeropuerto', descripcion: 'Traslado desde/hacia el aeropuerto', precio: 80000 },
      { nombre: 'Conserje 24/7', descripcion: 'Servicio de conserje las 24 horas', precio: 100000 },
      { nombre: 'Valet Parking', descripcion: 'Servicio de parqueadero con valet', precio: 30000 }
    ];

    // Opciones de catering estándar
    const cateringEstandar = [
      { tipo: 'Desayuno Ejecutivo', descripcion: 'Desayuno buffet continental', precioPorPersona: 25000, minPersonas: 10, maxPersonas: 100 },
      { tipo: 'Coffee Break AM', descripción: 'Pausa café matutina con pasabocas', precioPorPersona: 15000, minPersonas: 5, maxPersonas: 50 },
      { tipo: 'Almuerzo Corporativo', descripcion: 'Almuerzo tipo buffet empresarial', precioPorPersona: 35000, minPersonas: 15, maxPersonas: 150 },
      { tipo: 'Coffee Break PM', descripcion: 'Pausa café vespertina', precioPorPersona: 15000, minPersonas: 5, maxPersonas: 50 },
      { tipo: 'Cena de Gala', descripcion: 'Cena formal de tres tiempos', precioPorPersona: 80000, minPersonas: 20, maxPersonas: 100 },
      { tipo: 'Cocktail Networking', descripcion: 'Cocktail con canapés y bebidas', precioPorPersona: 45000, minPersonas: 30, maxPersonas: 200 }
    ];

    res.json({
      success: true,
      opciones: {
        salones,
        habitaciones,
        serviciosEstandar,
        cateringEstandar
      }
    });

  } catch (err) {
    console.error('Error al obtener opciones de paquete:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener opciones para crear paquete',
      error: err.message
    });
  }
};

module.exports = {
  listarTodosLosHoteles,
  listarTodosPaquetes,
  listarPaquetesHotel,
  obtenerPaquete,
  crearPaquete,
  actualizarPaquete,
  eliminarPaquete,
  cambiarEstadoPaquete,
  obtenerOpcionesPaquete
};