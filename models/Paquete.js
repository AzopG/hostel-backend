const mongoose = require('mongoose');

const paqueteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  hoteles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }],
  habitacionesIncluidas: Number,
  salonesIncluidos: Number,
  servicios: [String], // catering, transporte, etc.
  precio: Number
});

module.exports = mongoose.model('Paquete', paqueteSchema);