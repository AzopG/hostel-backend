const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');

exports.disponibilidad = async (req, res) => {
  try {
    const { hotel, fechaInicio, fechaFin, tipo, capacidad } = req.query;
    // Buscar habitaciones disponibles
    let filtroHab = { disponible: true };
    if (hotel) filtroHab.hotel = hotel;
    if (tipo) filtroHab.tipo = tipo;
    if (capacidad) filtroHab.capacidad = capacidad;
    const habitaciones = await Habitacion.find(filtroHab);
    // Buscar salones disponibles
    let filtroSal = { disponible: true };
    if (hotel) filtroSal.hotel = hotel;
    if (capacidad) filtroSal.capacidad = capacidad;
    const salones = await Salon.find(filtroSal);
    res.json({ habitaciones, salones });
  } catch (err) {
    res.status(500).json({ msg: 'Error al consultar disponibilidad', error: err });
  }
};
