const Reserva = require('../models/Reserva');
const Salon = require('../models/Salon');

/**
 * HU19: GESTIONAR LISTA DE ASISTENTES
 * Como empresa Quiero gestionar una lista de asistentes Para controlar participación
 */

/**
 * HU19 CA1: Alta de asistente
 * Agregar un nuevo asistente a la lista de una reserva
 */
const agregarAsistente = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { nombre, correo, notas } = req.body;

    // Validaciones básicas
    if (!nombre || !correo) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y correo son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico no es válido'
      });
    }

    // Buscar la reserva
    const reserva = await Reserva.findById(reservaId).populate('salon');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Verificar que la reserva esté confirmada (CA1)
    if (reserva.estado !== 'confirmada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden agregar asistentes a reservas confirmadas',
        estadoActual: reserva.estado
      });
    }

    // CA4: Verificar límite de capacidad del salón
    let capacidadMaxima = null;
    
    if (reserva.salon) {
      // Si es reserva de salón, usar capacidad del salón
      capacidadMaxima = reserva.salon.capacidad;
    } else if (reserva.datosPaquete && reserva.datosPaquete.salon) {
      // Si es paquete corporativo, obtener el salón
      const salon = await Salon.findById(reserva.datosPaquete.salon);
      if (salon) {
        capacidadMaxima = salon.capacidad;
      }
    } else if (reserva.datosEvento && reserva.datosEvento.capacidadLayout) {
      // Si tiene layout seleccionado, usar esa capacidad
      capacidadMaxima = reserva.datosEvento.capacidadLayout;
    }

    // CA4: Validar que no se supere la capacidad
    if (capacidadMaxima) {
      const cantidadActual = reserva.listaAsistentes ? reserva.listaAsistentes.length : 0;
      
      if (cantidadActual >= capacidadMaxima) {
        return res.status(400).json({
          success: false,
          message: `No se pueden agregar más asistentes. Capacidad máxima alcanzada: ${capacidadMaxima} personas`,
          capacidadMaxima: capacidadMaxima,
          cantidadActual: cantidadActual,
          bloqueado: true // CA4: Sistema bloquea nuevas altas
        });
      }
    }

    // Verificar si el correo ya existe en la lista
    const asistenteExistente = reserva.listaAsistentes.find(a => a.correo === correo);
    if (asistenteExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un asistente con este correo electrónico',
        asistenteExistente: {
          nombre: asistenteExistente.nombre,
          correo: asistenteExistente.correo
        }
      });
    }

    // CA1: Agregar nuevo asistente a la lista
    const nuevoAsistente = {
      nombre: nombre,
      correo: correo,
      confirmado: false,
      fechaRegistro: new Date(),
      notas: notas || ''
    };

    if (!reserva.listaAsistentes) {
      reserva.listaAsistentes = [];
    }

    reserva.listaAsistentes.push(nuevoAsistente);
    await reserva.save();

    // Obtener el asistente agregado con su ID
    const asistenteAgregado = reserva.listaAsistentes[reserva.listaAsistentes.length - 1];

    res.status(201).json({
      success: true,
      message: 'Asistente agregado exitosamente',
      asistente: {
        _id: asistenteAgregado._id,
        nombre: asistenteAgregado.nombre,
        correo: asistenteAgregado.correo,
        confirmado: asistenteAgregado.confirmado,
        fechaRegistro: asistenteAgregado.fechaRegistro,
        notas: asistenteAgregado.notas
      },
      estadisticas: {
        totalAsistentes: reserva.listaAsistentes.length,
        capacidadMaxima: capacidadMaxima,
        espaciosDisponibles: capacidadMaxima ? capacidadMaxima - reserva.listaAsistentes.length : null
      }
    });

  } catch (err) {
    console.error('Error al agregar asistente:', err);
    res.status(500).json({
      success: false,
      message: 'Error al agregar el asistente',
      error: err.message
    });
  }
};

/**
 * HU19 CA2: Edición de asistente
 * Actualizar datos de un asistente existente
 */
const editarAsistente = async (req, res) => {
  try {
    const { reservaId, asistenteId } = req.params;
    const { nombre, correo, confirmado, notas } = req.body;

    // Buscar la reserva
    const reserva = await Reserva.findById(reservaId);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // CA2: Buscar el asistente existente
    const asistente = reserva.listaAsistentes.id(asistenteId);
    
    if (!asistente) {
      return res.status(404).json({
        success: false,
        message: 'Asistente no encontrado en esta reserva'
      });
    }

    // Si se está actualizando el correo, verificar que no exista otro asistente con ese correo
    if (correo && correo !== asistente.correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del correo electrónico no es válido'
        });
      }

      const correoExistente = reserva.listaAsistentes.find(
        a => a._id.toString() !== asistenteId && a.correo === correo
      );
      
      if (correoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro asistente con este correo electrónico'
        });
      }
    }

    // CA2: Actualizar datos del asistente
    if (nombre !== undefined) asistente.nombre = nombre;
    if (correo !== undefined) asistente.correo = correo;
    if (confirmado !== undefined) asistente.confirmado = confirmado;
    if (notas !== undefined) asistente.notas = notas;
    
    asistente.fechaModificacion = new Date();

    await reserva.save();

    res.json({
      success: true,
      message: 'Asistente actualizado exitosamente',
      asistente: {
        _id: asistente._id,
        nombre: asistente.nombre,
        correo: asistente.correo,
        confirmado: asistente.confirmado,
        fechaRegistro: asistente.fechaRegistro,
        fechaModificacion: asistente.fechaModificacion,
        notas: asistente.notas
      }
    });

  } catch (err) {
    console.error('Error al editar asistente:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el asistente',
      error: err.message
    });
  }
};

/**
 * HU19 CA3: Eliminación de asistente
 * Remover un asistente de la lista
 */
const eliminarAsistente = async (req, res) => {
  try {
    const { reservaId, asistenteId } = req.params;

    // Buscar la reserva
    const reserva = await Reserva.findById(reservaId);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // CA3: Buscar y eliminar el asistente
    const asistente = reserva.listaAsistentes.id(asistenteId);
    
    if (!asistente) {
      return res.status(404).json({
        success: false,
        message: 'Asistente no encontrado en esta reserva'
      });
    }

    // Guardar datos del asistente antes de eliminarlo
    const asistenteEliminado = {
      nombre: asistente.nombre,
      correo: asistente.correo
    };

    // CA3: Remover de la lista
    asistente.deleteOne();
    await reserva.save();

    res.json({
      success: true,
      message: 'Asistente eliminado exitosamente',
      asistenteEliminado: asistenteEliminado,
      estadisticas: {
        totalAsistentes: reserva.listaAsistentes.length
      }
    });

  } catch (err) {
    console.error('Error al eliminar asistente:', err);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el asistente',
      error: err.message
    });
  }
};

/**
 * Obtener lista completa de asistentes de una reserva
 */
const obtenerAsistentes = async (req, res) => {
  try {
    const { reservaId } = req.params;

    // Buscar la reserva con el salón poblado
    const reserva = await Reserva.findById(reservaId).populate('salon');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Calcular capacidad máxima
    let capacidadMaxima = null;
    
    if (reserva.salon) {
      capacidadMaxima = reserva.salon.capacidad;
    } else if (reserva.datosPaquete && reserva.datosPaquete.salon) {
      const salon = await Salon.findById(reserva.datosPaquete.salon);
      if (salon) {
        capacidadMaxima = salon.capacidad;
      }
    } else if (reserva.datosEvento && reserva.datosEvento.capacidadLayout) {
      capacidadMaxima = reserva.datosEvento.capacidadLayout;
    }

    const listaAsistentes = reserva.listaAsistentes || [];
    const totalAsistentes = listaAsistentes.length;
    const confirmados = listaAsistentes.filter(a => a.confirmado).length;
    const pendientes = totalAsistentes - confirmados;

    res.json({
      success: true,
      reserva: {
        _id: reserva._id,
        codigoReserva: reserva.codigoReserva,
        nombreEvento: reserva.datosEvento?.nombreEvento || reserva.datosPaquete?.codigoPaquete || 'Sin nombre',
        estado: reserva.estado
      },
      asistentes: listaAsistentes.map(a => ({
        _id: a._id,
        nombre: a.nombre,
        correo: a.correo,
        confirmado: a.confirmado,
        fechaRegistro: a.fechaRegistro,
        fechaModificacion: a.fechaModificacion,
        notas: a.notas
      })),
      estadisticas: {
        totalAsistentes: totalAsistentes,
        confirmados: confirmados,
        pendientes: pendientes,
        capacidadMaxima: capacidadMaxima,
        espaciosDisponibles: capacidadMaxima ? capacidadMaxima - totalAsistentes : null,
        porcentajeOcupacion: capacidadMaxima ? Math.round((totalAsistentes / capacidadMaxima) * 100) : null,
        bloqueado: capacidadMaxima ? totalAsistentes >= capacidadMaxima : false // CA4
      }
    });

  } catch (err) {
    console.error('Error al obtener asistentes:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de asistentes',
      error: err.message
    });
  }
};

/**
 * Confirmar asistencia de un asistente
 */
const confirmarAsistencia = async (req, res) => {
  try {
    const { reservaId, asistenteId } = req.params;

    const reserva = await Reserva.findById(reservaId);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    const asistente = reserva.listaAsistentes.id(asistenteId);
    
    if (!asistente) {
      return res.status(404).json({
        success: false,
        message: 'Asistente no encontrado'
      });
    }

    asistente.confirmado = true;
    asistente.fechaModificacion = new Date();
    
    await reserva.save();

    res.json({
      success: true,
      message: 'Asistencia confirmada',
      asistente: {
        _id: asistente._id,
        nombre: asistente.nombre,
        correo: asistente.correo,
        confirmado: asistente.confirmado
      }
    });

  } catch (err) {
    console.error('Error al confirmar asistencia:', err);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar asistencia',
      error: err.message
    });
  }
};

/**
 * Importar lista de asistentes desde un array
 */
const importarAsistentes = async (req, res) => {
  try {
    const { reservaId } = req.params;
    const { asistentes } = req.body; // Array de { nombre, correo, notas }

    if (!Array.isArray(asistentes) || asistentes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de asistentes'
      });
    }

    const reserva = await Reserva.findById(reservaId).populate('salon');
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    if (reserva.estado !== 'confirmada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden agregar asistentes a reservas confirmadas'
      });
    }

    // Calcular capacidad
    let capacidadMaxima = null;
    if (reserva.salon) {
      capacidadMaxima = reserva.salon.capacidad;
    } else if (reserva.datosPaquete && reserva.datosPaquete.salon) {
      const salon = await Salon.findById(reserva.datosPaquete.salon);
      if (salon) capacidadMaxima = salon.capacidad;
    } else if (reserva.datosEvento && reserva.datosEvento.capacidadLayout) {
      capacidadMaxima = reserva.datosEvento.capacidadLayout;
    }

    const cantidadActual = reserva.listaAsistentes ? reserva.listaAsistentes.length : 0;
    const cantidadNuevos = asistentes.length;
    const totalFinal = cantidadActual + cantidadNuevos;

    // CA4: Validar capacidad
    if (capacidadMaxima && totalFinal > capacidadMaxima) {
      return res.status(400).json({
        success: false,
        message: `No se pueden importar todos los asistentes. Capacidad máxima: ${capacidadMaxima}`,
        capacidadMaxima: capacidadMaxima,
        cantidadActual: cantidadActual,
        cantidadNuevos: cantidadNuevos,
        exceso: totalFinal - capacidadMaxima,
        bloqueado: true
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const agregados = [];
    const errores = [];

    for (const [index, asistenteData] of asistentes.entries()) {
      try {
        if (!asistenteData.nombre || !asistenteData.correo) {
          errores.push({
            indice: index,
            error: 'Nombre y correo son obligatorios',
            datos: asistenteData
          });
          continue;
        }

        if (!emailRegex.test(asistenteData.correo)) {
          errores.push({
            indice: index,
            error: 'Formato de correo inválido',
            datos: asistenteData
          });
          continue;
        }

        // Verificar duplicados
        const existente = reserva.listaAsistentes.find(a => a.correo === asistenteData.correo);
        if (existente) {
          errores.push({
            indice: index,
            error: 'Correo ya existe en la lista',
            datos: asistenteData
          });
          continue;
        }

        const nuevoAsistente = {
          nombre: asistenteData.nombre,
          correo: asistenteData.correo,
          confirmado: false,
          fechaRegistro: new Date(),
          notas: asistenteData.notas || ''
        };

        reserva.listaAsistentes.push(nuevoAsistente);
        agregados.push(nuevoAsistente);

      } catch (err) {
        errores.push({
          indice: index,
          error: err.message,
          datos: asistenteData
        });
      }
    }

    await reserva.save();

    res.status(201).json({
      success: true,
      message: `${agregados.length} asistentes importados exitosamente`,
      agregados: agregados.length,
      errores: errores.length,
      detalleErrores: errores,
      estadisticas: {
        totalAsistentes: reserva.listaAsistentes.length,
        capacidadMaxima: capacidadMaxima,
        espaciosDisponibles: capacidadMaxima ? capacidadMaxima - reserva.listaAsistentes.length : null
      }
    });

  } catch (err) {
    console.error('Error al importar asistentes:', err);
    res.status(500).json({
      success: false,
      message: 'Error al importar asistentes',
      error: err.message
    });
  }
};

module.exports = {
  agregarAsistente,
  editarAsistente,
  eliminarAsistente,
  obtenerAsistentes,
  confirmarAsistencia,
  importarAsistentes
};
