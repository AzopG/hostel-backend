const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
  fecha: { type: Date, required: true },
  asistentes: [{ type: String }],
  paquete: { type: mongoose.Schema.Types.ObjectId, ref: 'Paquete' }
});

module.exports = mongoose.model('Evento', eventoSchema);