const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  habitacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' },
  salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
  paquete: { type: mongoose.Schema.Types.ObjectId, ref: 'Paquete' },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  asistentes: [{ type: String }], // solo para eventos empresariales
  estado: { type: String, enum: ['pendiente', 'confirmada', 'cancelada'], default: 'pendiente' }
});

module.exports = mongoose.model('Reserva', reservaSchema);