const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');

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
