const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  nombre: { type: String, required: true },
  capacidad: { type: Number, required: true },
  equipamiento: [String], // audio, proyección, catering, etc.
  disponible: { type: Boolean, default: true },
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }]
});

module.exports = mongoose.model('Salon', salonSchema);