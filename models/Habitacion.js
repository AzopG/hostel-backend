const mongoose = require('mongoose');

const habitacionSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  numero: { type: String, required: true },
  tipo: { type: String, required: true }, // estándar, doble, suite, etc.
  capacidad: { type: Number, required: true },
  servicios: [String],
  disponible: { type: Boolean, default: true },
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }]
});

module.exports = mongoose.model('Habitacion', habitacionSchema);