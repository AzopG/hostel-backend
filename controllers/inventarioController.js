const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Reserva = require('../models/Reserva');

exports.actualizarInventario = async (req, res) => {
  try {
    // Actualiza inventario de habitaciones y salones según reservas activas
    const reservas = await Reserva.find({ estado: 'confirmada' });
    for (const reserva of reservas) {
      if (reserva.habitacion) {
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { disponible: false });
      }
      if (reserva.salon) {
        await Salon.findByIdAndUpdate(reserva.salon, { disponible: false });
      }
    }
    // Libera habitaciones y salones de reservas canceladas
    const reservasCanceladas = await Reserva.find({ estado: 'cancelada' });
    for (const reserva of reservasCanceladas) {
      if (reserva.habitacion) {
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { disponible: true });
      }
      if (reserva.salon) {
        await Salon.findByIdAndUpdate(reserva.salon, { disponible: true });
      }
    }
    res.json({ msg: 'Inventario actualizado según reservas.' });
  } catch (err) {
    res.status(500).json({ msg: 'Error al actualizar inventario', error: err });
  }
};
