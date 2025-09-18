const Reserva = require('../models/Reserva');
const Evento = require('../models/Evento');
const Paquete = require('../models/Paquete');
const Hotel = require('../models/Hotel');

exports.reporteOcupacion = async (req, res) => {
  try {
    const { ciudad, fechaInicio, fechaFin } = req.query;
    let filtroHotel = {};
    if (ciudad) filtroHotel.ciudad = ciudad;
    const hoteles = await Hotel.find(filtroHotel);
    const hotelIds = hoteles.map(h => h._id);
    let filtroReserva = { hotel: { $in: hotelIds } };
    if (fechaInicio && fechaFin) filtroReserva.fechaInicio = { $gte: fechaInicio, $lte: fechaFin };
    const reservas = await Reserva.find(filtroReserva);
    res.json({ reservas });
  } catch (err) {
    res.status(500).json({ msg: 'Error al generar reporte de ocupación', error: err });
  }
};

exports.reporteEventos = async (req, res) => {
  try {
    const { ciudad, fechaInicio, fechaFin } = req.query;
    let filtroHotel = {};
    if (ciudad) filtroHotel.ciudad = ciudad;
    const hoteles = await Hotel.find(filtroHotel);
    const hotelIds = hoteles.map(h => h._id);
    let filtroEvento = { hotel: { $in: hotelIds } };
    if (fechaInicio && fechaFin) filtroEvento.fecha = { $gte: fechaInicio, $lte: fechaFin };
    const eventos = await Evento.find(filtroEvento);
    res.json({ eventos });
  } catch (err) {
    res.status(500).json({ msg: 'Error al generar reporte de eventos', error: err });
  }
};

exports.reportePaquetes = async (req, res) => {
  try {
    const { ciudad } = req.query;
    let filtroHotel = {};
    if (ciudad) filtroHotel.ciudad = ciudad;
    const hoteles = await Hotel.find(filtroHotel);
    const hotelIds = hoteles.map(h => h._id);
    const paquetes = await Paquete.find({ hoteles: { $in: hotelIds } });
    res.json({ paquetes });
  } catch (err) {
    res.status(500).json({ msg: 'Error al generar reporte de paquetes', error: err });
  }
};
