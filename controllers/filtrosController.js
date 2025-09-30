const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Reserva = require('../models/Reserva');
const Hotel = require('../models/Hotel');

/**
 * HU05 + HU06: Filtrar habitaciones por fechas, huéspedes y servicios
 * HU05 - CA1, CA2, CA3, CA4: Filtros básicos
 * HU06 - CA1, CA2, CA3: Filtros por servicios adicionales
 */
exports.filtrarHabitaciones = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, huespedes, ciudad, servicios } = req.query;

    // CA2: Validar que las fechas sean válidas
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        msg: 'Las fechas de inicio y fin son requeridas'
      });
    }

    // Parsear fechas
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');

    // CA2: Validar que fecha fin no sea anterior a fecha inicio
    if (fin <= inicio) {
      return res.status(400).json({
        success: false,
        msg: 'La fecha de fin debe ser posterior a la fecha de inicio',
        error: 'FECHA_INVALIDA'
      });
    }

    // Validar que las fechas sean válidas
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return res.status(400).json({
        success: false,
        msg: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'FORMATO_INVALIDO'
      });
    }

    // CA4: Validar número de huéspedes
    const numHuespedes = parseInt(huespedes) || 1;
    if (numHuespedes < 1) {
      return res.status(400).json({
        success: false,
        msg: 'El número de huéspedes debe ser al menos 1'
      });
    }

    // CA4: Validar límite máximo de huéspedes (capacidad máxima general)
    const CAPACIDAD_MAXIMA = 10; // Límite global del sistema
    if (numHuespedes > CAPACIDAD_MAXIMA) {
      return res.status(400).json({
        success: false,
        msg: `El número máximo de huéspedes es ${CAPACIDAD_MAXIMA}`,
        error: 'CAPACIDAD_MAXIMA_EXCEDIDA',
        limite: CAPACIDAD_MAXIMA
      });
    }

    // Construir filtro base de habitaciones
    let filtroHabitacion = {
      disponible: true,
      capacidad: { $gte: numHuespedes } // HU05 CA1: Solo habitaciones que soporten la ocupación
    };

    // HU06 CA1: Filtrar por servicios (TODOS los servicios deben estar presentes)
    if (servicios) {
      const serviciosArray = Array.isArray(servicios) ? servicios : servicios.split(',');
      if (serviciosArray.length > 0) {
        filtroHabitacion.servicios = { $all: serviciosArray };
      }
    }

    // Filtro opcional por ciudad
    let hotelesIds = null;
    if (ciudad) {
      const hoteles = await Hotel.find({ ciudad: ciudad });
      if (hoteles.length === 0) {
        return res.json({
          success: true,
          msg: 'No hay habitaciones disponibles con esos criterios',
          habitaciones: [],
          total: 0
        });
      }
      hotelesIds = hoteles.map(h => h._id);
      filtroHabitacion.hotel = { $in: hotelesIds };
    }

    // Buscar todas las habitaciones que cumplen con capacidad
    const habitacionesCandidatas = await Habitacion.find(filtroHabitacion)
      .populate('hotel', 'nombre ciudad direccion');

    if (habitacionesCandidatas.length === 0) {
      // CA3: Sin resultados
      return res.json({
        success: true,
        msg: 'No hay habitaciones disponibles con esos criterios',
        habitaciones: [],
        total: 0
      });
    }

    // CA1: Filtrar por disponibilidad en el rango de fechas
    // Buscar reservas que se solapan con el rango solicitado
    const reservasEnRango = await Reserva.find({
      habitacion: { $in: habitacionesCandidatas.map(h => h._id) },
      estado: { $ne: 'cancelada' },
      $or: [
        // Reserva que empieza durante el rango
        {
          fechaInicio: { $gte: inicio, $lt: fin }
        },
        // Reserva que termina durante el rango
        {
          fechaFin: { $gt: inicio, $lte: fin }
        },
        // Reserva que engloba todo el rango
        {
          fechaInicio: { $lte: inicio },
          fechaFin: { $gte: fin }
        }
      ]
    });

    // IDs de habitaciones reservadas
    const habitacionesReservadasIds = reservasEnRango.map(r => r.habitacion.toString());

    // Filtrar habitaciones disponibles (que no están reservadas)
    const habitacionesDisponibles = habitacionesCandidatas.filter(
      hab => !habitacionesReservadasIds.includes(hab._id.toString())
    );

    // CA3: Si no hay resultados después del filtro de fechas
    if (habitacionesDisponibles.length === 0) {
      return res.json({
        success: true,
        msg: 'No hay habitaciones disponibles con esos criterios',
        habitaciones: [],
        total: 0
      });
    }

    // HU05 CA1 + HU06: Retornar habitaciones disponibles
    res.json({
      success: true,
      msg: `${habitacionesDisponibles.length} habitación(es) disponible(s)`,
      habitaciones: habitacionesDisponibles.map(hab => ({
        _id: hab._id,
        numero: hab.numero,
        tipo: hab.tipo,
        precio: hab.precio,
        capacidad: hab.capacidad,
        descripcion: hab.descripcion,
        servicios: hab.servicios,
        hotel: hab.hotel
      })),
      total: habitacionesDisponibles.length,
      filtros: {
        fechaInicio,
        fechaFin,
        huespedes: numHuespedes,
        ciudad: ciudad || 'Todas',
        servicios: servicios ? (Array.isArray(servicios) ? servicios : servicios.split(',')) : []
      }
    });

  } catch (err) {
    console.error('Error filtrando habitaciones:', err);
    res.status(500).json({
      success: false,
      msg: 'Error al filtrar habitaciones',
      error: err.message
    });
  }
};

exports.filtrosAvanzados = async (req, res) => {
  try {
    const { ciudad, tipoHabitacion, servicios, capacidadSalon, equipamiento } = req.query;
    let filtroHab = {};
    let filtroSal = {};
    if (ciudad) filtroHab.ciudad = ciudad;
    if (tipoHabitacion) filtroHab.tipo = tipoHabitacion;
    if (servicios) filtroHab.servicios = { $all: servicios.split(',') };
    if (capacidadSalon) filtroSal.capacidad = capacidadSalon;
    if (equipamiento) filtroSal.equipamiento = { $all: equipamiento.split(',') };
    const habitaciones = await Habitacion.find(filtroHab);
    const salones = await Salon.find(filtroSal);
    res.json({ habitaciones, salones });
  } catch (err) {
    res.status(500).json({ msg: 'Error al aplicar filtros avanzados', error: err });
  }
};
