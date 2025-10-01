const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  nombre: { type: String, required: true },
  capacidad: { type: Number, required: true }, // HU14: Capacidad máxima de personas
  equipamiento: [String], // audio, proyección, catering, etc.
  disponible: { type: Boolean, default: true },
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }],
  
  // HU14: Información adicional para eventos
  descripcion: { type: String },
  precioPorDia: { type: Number, default: 0 },
  serviciosIncluidos: [String], // WiFi, aire acondicionado, estacionamiento, etc.
  fotos: [String], // URLs de fotos
  
  // HU16: Layouts con capacidad por configuración
  layouts: [{
    nombre: { type: String, required: true }, // Ej: "Teatro", "Banquete", "Escuela"
    capacidad: { type: Number, required: true },
    descripcion: String,
    imagen: String // URL de imagen del layout
  }],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar updatedAt
salonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para búsquedas eficientes
salonSchema.index({ hotel: 1, capacidad: 1 });
salonSchema.index({ hotel: 1, disponible: 1 });

module.exports = mongoose.model('Salon', salonSchema);