const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  ciudad: { type: String, required: true },
  direccion: String,
  telefono: String,
  email: String,
  habitaciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' }],
  salones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }],
  
  // HU07: Campos adicionales para detalle
  fotos: [{ type: String }], // URLs de fotos del hotel
  calificacion: { type: Number, min: 0, max: 5, default: 0 },
  politicas: {
    checkIn: { type: String, default: '15:00' },
    checkOut: { type: String, default: '12:00' },
    cancelacion: { type: String, default: '24 horas antes sin cargo' },
    mascotas: { type: Boolean, default: false },
    fumadores: { type: Boolean, default: false },
    adicionales: [String] // Políticas adicionales personalizadas
  }
});

module.exports = mongoose.model('Hotel', hotelSchema);