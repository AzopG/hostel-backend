const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tipo: { type: String, enum: ['cliente', 'empresa', 'admin_hotel', 'admin_central'], required: true },
  empresa: String, // solo si es tipo empresa
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }]
});

module.exports = mongoose.model('Usuario', usuarioSchema);