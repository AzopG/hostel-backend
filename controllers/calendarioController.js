const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Reserva = require('../models/Reserva');
const Evento = require('../models/Evento');

exports.calendario = async (req, res) => {
  try {
    const { hotel, mes, anio } = req.query;
    if (!hotel || !mes || !anio) return res.status(400).json({ msg: 'hotel, mes y anio son requeridos' });
    // Obtener reservas y eventos para el mes/año en el hotel
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59);
    const reservas = await Reserva.find({ hotel, fechaInicio: { $lte: fechaFin }, fechaFin: { $gte: fechaInicio } });
    const eventos = await Evento.find({ hotel, fecha: { $gte: fechaInicio, $lte: fechaFin } });
    // Opcional: obtener habitaciones y salones
    const habitaciones = await Habitacion.find({ hotel });
    const salones = await Salon.find({ hotel });
    res.json({ reservas, eventos, habitaciones, salones });
  } catch (err) {
    res.status(500).json({ msg: 'Error al consultar calendario', error: err });
  }
};
