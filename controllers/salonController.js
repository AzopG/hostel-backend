const Salon = require('../models/Salon');
const Reserva = require('../models/Reserva');
const Hotel = require('../models/Hotel');

/**
 * HU14 - CA1: Búsqueda de salones por capacidad y fechas
 * Buscar salones disponibles que cumplan con la capacidad mínima requerida
 * y que estén disponibles en el rango de fechas solicitado
 */
exports.buscarSalonesDisponibles = async (req, res) => {
  try {
    const { 
      hotelId, 
      capacidadMinima, 
      fechaInicio, 
      fechaFin,
      equipamiento, // Opcional: filtrar por equipamiento
      ordenarPor = 'capacidad_asc' // CA4: Ordenamiento
    } = req.query;

    // Validación de parámetros requeridos
    if (!hotelId || !capacidadMinima || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos: hotelId, capacidadMinima, fechaInicio, fechaFin'
      });
    }

    // Validar que las fechas sean válidas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use formato ISO: YYYY-MM-DD'
      });
    }

    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Construir filtro base
    const filtro = {
      hotel: hotelId,
      capacidad: { $gte: parseInt(capacidadMinima) }, // CA1: Capacidad >= requerida
      disponible: true
    };

    // Filtro opcional por equipamiento
    if (equipamiento) {
      const equipamientoArray = Array.isArray(equipamiento) 
        ? equipamiento 
        : [equipamiento];
      filtro.equipamiento = { $all: equipamientoArray };
    }

    // Buscar todos los salones que cumplan el filtro básico
    let salones = await Salon.find(filtro)
      .populate('hotel', 'nombre ciudad direccion')
      .lean();

    // CA1: Filtrar salones disponibles en el rango de fechas
    // Buscar salones que NO tengan reservas confirmadas que se solapen
    const salonesDisponibles = [];
    
    for (const salon of salones) {
      // Buscar reservas confirmadas del salón que se solapen con las fechas solicitadas
      const reservasConflicto = await Reserva.find({
        salon: salon._id,
        estado: { $in: ['confirmada', 'pendiente'] }, // Considerar confirmadas y pendientes
        $or: [
          // La reserva existente empieza durante el periodo solicitado
          {
            fechaInicio: { $gte: inicio, $lt: fin }
          },
          // La reserva existente termina durante el periodo solicitado
          {
            fechaFin: { $gt: inicio, $lte: fin }
          },
          // La reserva existente envuelve completamente el periodo solicitado
          {
            fechaInicio: { $lte: inicio },
            fechaFin: { $gte: fin }
          }
        ]
      });

      // Si no hay conflictos, el salón está disponible
      if (reservasConflicto.length === 0) {
        // Calcular precio total para el periodo
        const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        const precioTotal = (salon.precioPorDia || 0) * dias;
        
        salonesDisponibles.push({
          ...salon,
          dias,
          precioTotal,
          disponibleParaFechas: true
        });
      }
    }

    // CA2: Si no hay resultados, devolver mensaje con sugerencias
    if (salonesDisponibles.length === 0) {
      // Buscar salones sin restricción de fechas para sugerencias
      const salonesTotales = await Salon.countDocuments(filtro);
      
      return res.status(200).json({
        success: true,
        message: 'No se encontraron salones disponibles',
        sugerencias: {
          mensaje: salonesTotales > 0 
            ? `Hay ${salonesTotales} salón(es) con la capacidad requerida, pero no están disponibles en las fechas solicitadas.`
            : `No hay salones con capacidad para ${capacidadMinima} personas en este hotel.`,
          recomendaciones: [
            'Intente con fechas diferentes',
            'Reduzca la capacidad requerida si es posible',
            'Consulte otros hoteles de la cadena',
            'Contacte directamente con el hotel para opciones personalizadas'
          ]
        },
        salones: [],
        total: 0,
        filtrosAplicados: {
          hotelId,
          capacidadMinima: parseInt(capacidadMinima),
          fechaInicio: inicio.toISOString(),
          fechaFin: fin.toISOString(),
          equipamiento: equipamiento || null
        }
      });
    }

    // CA4: Ordenar resultados según criterio
    const criteriosOrdenamiento = {
      'capacidad_asc': (a, b) => a.capacidad - b.capacidad,
      'capacidad_desc': (a, b) => b.capacidad - a.capacidad,
      'precio_asc': (a, b) => (a.precioTotal || 0) - (b.precioTotal || 0),
      'precio_desc': (a, b) => (b.precioTotal || 0) - (a.precioTotal || 0),
      'nombre': (a, b) => a.nombre.localeCompare(b.nombre)
    };

    const funcionOrdenamiento = criteriosOrdenamiento[ordenarPor] || criteriosOrdenamiento['capacidad_asc'];
    salonesDisponibles.sort(funcionOrdenamiento);

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: `Se encontraron ${salonesDisponibles.length} salón(es) disponible(s)`,
      salones: salonesDisponibles,
      total: salonesDisponibles.length,
      filtrosAplicados: {
        hotelId,
        capacidadMinima: parseInt(capacidadMinima),
        fechaInicio: inicio.toISOString(),
        fechaFin: fin.toISOString(),
        equipamiento: equipamiento || null,
        ordenarPor
      }
    });

  } catch (error) {
    console.error('Error en búsqueda de salones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar salones disponibles',
      error: error.message
    });
  }
};

/**
 * Obtener detalles completos de un salón específico
 */
exports.obtenerSalonDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const salon = await Salon.findById(id)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate({
        path: 'reservas',
        match: { estado: { $in: ['confirmada', 'pendiente'] } },
        select: 'fechaInicio fechaFin estado'
      });

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      salon
    });

  } catch (error) {
    console.error('Error al obtener detalle del salón:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del salón',
      error: error.message
    });
  }
};

/**
 * HU14 - CA3: Verificar disponibilidad específica de un salón
 * Endpoint auxiliar para recalcular cuando el usuario cambie las fechas
 */
exports.verificarDisponibilidadSalon = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros: fechaInicio y fechaFin son requeridos'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido'
      });
    }

    const salon = await Salon.findById(id);
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    if (!salon.disponible) {
      return res.status(200).json({
        success: true,
        disponible: false,
        mensaje: 'El salón no está disponible actualmente'
      });
    }

    // Buscar conflictos de reservas
    const reservasConflicto = await Reserva.find({
      salon: id,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        { fechaInicio: { $gte: inicio, $lt: fin } },
        { fechaFin: { $gt: inicio, $lte: fin } },
        { fechaInicio: { $lte: inicio }, fechaFin: { $gte: fin } }
      ]
    }).select('fechaInicio fechaFin estado');

    const disponible = reservasConflicto.length === 0;
    
    // Calcular precio
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    const precioTotal = (salon.precioPorDia || 0) * dias;

    res.status(200).json({
      success: true,
      disponible,
      mensaje: disponible 
        ? 'El salón está disponible para las fechas seleccionadas'
        : 'El salón no está disponible en ese rango de fechas',
      conflictos: disponible ? [] : reservasConflicto.map(r => ({
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin,
        estado: r.estado
      })),
      precioInfo: {
        dias,
        precioPorDia: salon.precioPorDia || 0,
        precioTotal
      }
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
 * Listar todos los salones de un hotel (sin filtros de disponibilidad)
 */
exports.listarSalonesHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;

    const salones = await Salon.find({ hotel: hotelId })
      .populate('hotel', 'nombre ciudad')
      .sort({ capacidad: 1 });

    res.status(200).json({
      success: true,
      salones,
      total: salones.length
    });

  } catch (error) {
    console.error('Error al listar salones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener salones del hotel',
      error: error.message
    });
  }
};

/**
 * Listar todos los salones disponibles (para empresas)
 */
exports.listarTodosSalones = async (req, res) => {
  try {
    const salones = await Salon.find({ disponible: true })
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .sort({ 'hotel.nombre': 1, capacidad: 1 });

    res.status(200).json({
      success: true,
      salones,
      total: salones.length
    });

  } catch (error) {
    console.error('Error al listar todos los salones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener todos los salones',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo salón (solo administradores)
 */
exports.crearSalon = async (req, res) => {
  try {
    const nuevoSalon = new Salon(req.body);
    await nuevoSalon.save();

    const salonCompleto = await Salon.findById(nuevoSalon._id)
      .populate('hotel', 'nombre ciudad');

    res.status(201).json({
      success: true,
      message: 'Salón creado exitosamente',
      salon: salonCompleto
    });

  } catch (error) {
    console.error('Error al crear salón:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear salón',
      error: error.message
    });
  }
};

/**
 * HU16 - CA1: Obtener detalle completo de un salón
 * Muestra toda la información del salón: capacidad, equipamiento, layouts, fotos, tarifas
 */
exports.obtenerDetalleSalon = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar salón con información completa del hotel
    const salon = await Salon.findById(id)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .lean();

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    // CA1: Devolver toda la información del salón
    res.status(200).json({
      success: true,
      salon: {
        _id: salon._id,
        nombre: salon.nombre,
        descripcion: salon.descripcion,
        
        // Capacidad y layouts (CA3)
        capacidad: salon.capacidad, // Capacidad máxima
        layouts: salon.layouts || [], // Diferentes configuraciones
        
        // Equipamiento y servicios (CA1)
        equipamiento: salon.equipamiento || [],
        serviciosIncluidos: salon.serviciosIncluidos || [],
        
        // Información visual (CA1)
        fotos: salon.fotos || [],
        
        // Tarifas (CA1)
        precioPorDia: salon.precioPorDia,
        
        // Hotel asociado
        hotel: salon.hotel,
        
        // Metadata
        disponible: salon.disponible,
        createdAt: salon.createdAt,
        updatedAt: salon.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al obtener detalle del salón:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del salón',
      error: error.message
    });
  }
};

/**
 * HU16 - CA2: Verificar disponibilidad del salón en fechas específicas
 * Muestra si el salón está libre, parcialmente ocupado o totalmente bloqueado
 */
exports.verificarDisponibilidadDetallada = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    // Validación de parámetros
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros: fechaInicio y fechaFin son requeridos'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido'
      });
    }

    if (inicio >= fin) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    // Verificar que el salón existe
    const salon = await Salon.findById(id);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    // Buscar reservas confirmadas que se solapen con las fechas
    const reservasEnRango = await Reserva.find({
      salon: id,
      estado: { $in: ['confirmada', 'pendiente'] },
      $or: [
        { fechaInicio: { $gte: inicio, $lt: fin } },
        { fechaFin: { $gt: inicio, $lte: fin } },
        { fechaInicio: { $lte: inicio }, fechaFin: { $gte: fin } }
      ]
    }).select('fechaInicio fechaFin estado usuario')
      .populate('usuario', 'nombre email')
      .lean();

    // Determinar estado de disponibilidad (CA2)
    let estadoDisponibilidad;
    let mensaje;
    
    if (reservasEnRango.length === 0) {
      estadoDisponibilidad = 'libre';
      mensaje = 'El salón está completamente disponible en las fechas seleccionadas';
    } else if (reservasEnRango.length === 1) {
      estadoDisponibilidad = 'bloqueado';
      mensaje = 'El salón no está disponible en las fechas seleccionadas';
    } else {
      estadoDisponibilidad = 'parcial';
      mensaje = 'El salón tiene algunas fechas ocupadas en el rango seleccionado';
    }

    // CA2: Respuesta con estado detallado
    res.status(200).json({
      success: true,
      disponibilidad: {
        estado: estadoDisponibilidad, // 'libre', 'parcial', 'bloqueado'
        mensaje,
        fechaInicio: inicio,
        fechaFin: fin,
        reservasExistentes: reservasEnRango.length,
        detalleReservas: reservasEnRango.map(r => ({
          fechaInicio: r.fechaInicio,
          fechaFin: r.fechaFin,
          estado: r.estado
        }))
      }
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
 * Actualizar información de un salón
 */
exports.actualizarSalon = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizaciones = req.body;

    const salon = await Salon.findByIdAndUpdate(
      id,
      actualizaciones,
      { new: true, runValidators: true }
    ).populate('hotel', 'nombre ciudad');

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salón actualizado exitosamente',
      salon
    });

  } catch (error) {
    console.error('Error al actualizar salón:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar salón',
      error: error.message
    });
  }
};
