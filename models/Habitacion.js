const mongoose = require('mongoose');

const habitacionSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  numero: { type: String, required: true },
  tipo: { type: String, required: true }, // estándar, doble, suite, etc.
  capacidad: { type: Number, required: true },
  servicios: [String],
  disponible: { type: Boolean, default: true },
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }],
  
  // HU07: Campos adicionales para detalle de habitación
  descripcion: { type: String, default: '' },
  fotos: [{ type: String }], // URLs de las fotos
  precio: { type: Number, required: true, default: 100000 }, // Precio por noche en COP
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar updatedAt
habitacionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Habitacion', habitacionSchema);