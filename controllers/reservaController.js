const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');

// Lógica para crear reserva y actualizar inventario
exports.crearReserva = async (req, res) => {
  try {
    const { usuario, hotel, habitacion, salon, paquete, fechaInicio, fechaFin, asistentes } = req.body;
    // Validar disponibilidad de habitación
    if (habitacion) {
      const hab = await Habitacion.findById(habitacion);
      if (!hab || !hab.disponible) return res.status(400).json({ msg: 'Habitación no disponible' });
      hab.disponible = false;
      await hab.save();
    }
    // Validar disponibilidad de salón
    if (salon) {
      const sal = await Salon.findById(salon);
      if (!sal || !sal.disponible) return res.status(400).json({ msg: 'Salón no disponible' });
      sal.disponible = false;
      await sal.save();
    }
    // Crear reserva
    const reserva = new Reserva({ usuario, hotel, habitacion, salon, paquete, fechaInicio, fechaFin, asistentes, estado: 'confirmada' });
    await reserva.save();
    res.status(201).json(reserva);
  } catch (err) {
    res.status(500).json({ msg: 'Error al crear reserva', error: err });
  }
};

// Cancelar reserva y liberar recursos
exports.cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.findById(id);
    if (!reserva) return res.status(404).json({ msg: 'Reserva no encontrada' });
    reserva.estado = 'cancelada';
    await reserva.save();
    // Liberar habitación si aplica
    if (reserva.habitacion) {
      const hab = await Habitacion.findById(reserva.habitacion);
      if (hab) {
        hab.disponible = true;
        await hab.save();
      }
    }
    // Liberar salón si aplica
    if (reserva.salon) {
      const sal = await Salon.findById(reserva.salon);
      if (sal) {
        sal.disponible = true;
        await sal.save();
      }
    }
    res.json({ msg: 'Reserva cancelada y recursos liberados', reserva });
  } catch (err) {
    res.status(500).json({ msg: 'Error al cancelar reserva', error: err });
  }
};
