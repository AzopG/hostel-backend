const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tipo: { type: String, enum: ['cliente', 'empresa', 'admin_hotel', 'admin_central'], required: true },
  
  // HU13: Campos para empresas
  empresa: String, // Nombre comercial (legacy)
  razonSocial: { type: String }, // CA1: Razón social legal
  nit: { 
    type: String, 
    unique: true, 
    sparse: true // Permite null, pero si existe debe ser único (CA3)
  },
  contactoEmpresa: { // CA1: Persona de contacto
    nombre: { type: String },
    cargo: { type: String },
    telefono: { type: String }
  },
  
  telefono: { type: String }, // Para clientes individuales también
  reservas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' }],
  
  // HU03: Campos para recuperación de contraseña
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar updatedAt
usuarioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validación personalizada: si es empresa, debe tener razón social y NIT
usuarioSchema.pre('save', function(next) {
  if (this.tipo === 'empresa') {
    if (!this.razonSocial) {
      return next(new Error('La razón social es requerida para usuarios tipo empresa'));
    }
    if (!this.nit) {
      return next(new Error('El NIT es requerido para usuarios tipo empresa'));
    }
  }
  next();
});

module.exports = mongoose.model('Usuario', usuarioSchema);