const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  // Relaciones
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }, // Opcional para huéspedes sin cuenta
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  habitacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' },
  salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
  paquete: { type: mongoose.Schema.Types.ObjectId, ref: 'Paquete' },
  
  // Fechas
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  
  // HU08: Datos del huésped (para usuarios no registrados)
  datosHuesped: {
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true },
    telefono: { type: String, required: true },
    documento: { type: String },
    pais: { type: String, default: 'Colombia' },
    ciudad: { type: String }
  },
  
  // HU08 CA2: Código de reserva único
  codigoReserva: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  
  // Detalles de la reserva
  huespedes: { type: Number, required: true },
  noches: { type: Number, required: true },
  
  // HU08 CA2: Información de pago
  tarifa: {
    precioPorNoche: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    impuestos: { type: Number, required: true },
    total: { type: Number, required: true },
    moneda: { type: String, default: 'COP' }
  },
  
  // Estado
  estado: { 
    type: String, 
    enum: ['pendiente', 'confirmada', 'cancelada', 'completada'], 
    default: 'pendiente' 
  },
  
  // HU08 CA4: Aceptación de políticas
  politicasAceptadas: { type: Boolean, default: false },
  fechaPoliticasAceptadas: { type: Date },
  
  // Notas y solicitudes especiales
  notas: { type: String },
  
  // Eventos empresariales (opcional)
  asistentes: [{ type: String }],
  
  // HU09: Historial de modificaciones
  historialModificaciones: [{
    fechaModificacion: { type: Date, default: Date.now },
    fechaInicioAnterior: { type: Date },
    fechaFinAnterior: { type: Date },
    fechaInicioNueva: { type: Date },
    fechaFinNueva: { type: Date },
    tarifaAnterior: { type: Number },
    tarifaNueva: { type: Number },
    motivoRechazo: { type: String }
  }],
  
  // HU10: Información de cancelación
  cancelacion: {
    fechaCancelacion: { type: Date },
    motivo: { type: String },
    realizadaPor: { type: String }, // 'cliente' o 'hotel'
    penalizacion: { type: Number, default: 0 }, // Monto de penalización
    reembolso: { type: Number }, // Monto a reembolsar
    dentroVentanaGratuita: { type: Boolean }, // CA1: Si fue dentro de ventana gratuita
    horasAntesCancelacion: { type: Number }, // Horas antes del check-in
    notificacionEnviada: { type: Boolean, default: false } // CA4: Email enviado
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar updatedAt
reservaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método estático para generar código de reserva único
reservaSchema.statics.generarCodigoReserva = async function() {
  let codigo;
  let existe = true;
  
  while (existe) {
    // Generar código: RES + 8 caracteres alfanuméricos
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    codigo = 'RES';
    for (let i = 0; i < 8; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Verificar si ya existe
    const reservaExistente = await this.findOne({ codigoReserva: codigo });
    existe = !!reservaExistente;
  }
  
  return codigo;
};

module.exports = mongoose.model('Reserva', reservaSchema);