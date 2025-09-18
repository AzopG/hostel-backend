const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  ciudad: { type: String, required: true },
  direccion: String,
  telefono: String,
  habitaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' }],
  salones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }]
});

module.exports = mongoose.model('Hotel', hotelSchema);