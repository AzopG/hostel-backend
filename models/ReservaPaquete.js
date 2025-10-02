const mongoose = require('mongoose');

const reservaPaqueteSchema = new mongoose.Schema({
  // Información básica de la reserva
  numeroReserva: {
    type: String,
    unique: true
  },
  
  // Referencias principales
  paquete: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Paquete', 
    required: true 
  },
  hotel: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hotel', 
    required: true 
  },
  usuario: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuario', 
    required: true 
  },
  
  // Información del evento
  nombreEvento: { type: String, required: true },
  descripcionEvento: String,
  tipoEvento: { 
    type: String, 
    enum: ['evento_corporativo', 'reunion_negocios', 'congreso', 'capacitacion', 'celebracion_empresarial'],
    required: true
  },
  
  // Fechas y duración
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  horaInicio: { type: String, required: true }, // formato "HH:mm"
  horaFin: { type: String, required: true },
  
  // Capacidad y asistentes
  numeroAsistentes: { type: Number, required: true, min: 1 },
  detallesAsistentes: {
    ejecutivos: { type: Number, default: 0 },
    empleados: { type: Number, default: 0 },
    invitados: { type: Number, default: 0 }
  },
  
  // Configuración de habitaciones reservadas
  habitacionesReservadas: [{
    tipo: String,
    cantidad: Number,
    noches: Number,
    fechaCheckIn: Date,
    fechaCheckOut: Date,
    huespedes: [{
      nombre: String,
      documento: String,
      cargo: String,
      empresa: String
    }],
    precioTotal: Number
  }],
  
  // Configuración de salones reservados
  salonesReservados: [{
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
    nombre: String,
    fecha: Date,
    horaInicio: String,
    horaFin: String,
    configuracion: String,
    equipamientoAdicional: [String],
    precioTotal: Number
  }],
  
  // Servicios adicionales seleccionados
  serviciosAdicionales: [{
    categoria: String,
    nombre: String,
    descripcion: String,
    cantidad: { type: Number, default: 1 },
    precioUnitario: Number,
    precioTotal: Number
  }],
  
  // Catering seleccionado
  cateringSeleccionado: [{
    tipo: String,
    descripcion: String,
    fecha: Date,
    horario: String,
    numeroPersonas: Number,
    precioPorPersona: Number,
    precioTotal: Number,
    observaciones: String
  }],
  
  // Información financiera
  precios: {
    subtotalPaquete: { type: Number, required: true },
    subtotalHabitaciones: { type: Number, default: 0 },
    subtotalSalones: { type: Number, default: 0 },
    subtotalServicios: { type: Number, default: 0 },
    subtotalCatering: { type: Number, default: 0 },
    descuentos: { type: Number, default: 0 },
    impuestos: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  
  // Información de pago (opcional)
  metodoPago: {
    tipo: { 
      type: String, 
      enum: ['transferencia', 'tarjeta_credito', 'cheque', 'credito_empresarial'],
      required: false
    },
    anticipoPorcentaje: { type: Number, default: 50 },
    montoAnticipo: { type: Number, required: false },
    montoRestante: { type: Number, required: false },
    fechaLimitePago: Date
  },
  
  // Información de la empresa
  datosEmpresa: {
    razonSocial: { type: String, required: true },
    nit: { type: String, required: true },
    direccion: String,
    telefono: String,
    email: String,
    contactoPrincipal: {
      nombre: String,
      cargo: String,
      telefono: String,
      email: String
    }
  },
  
  // Requerimientos especiales
  requerimientosEspeciales: {
    alimentarios: [String], // restricciones alimentarias
    accesibilidad: [String], // necesidades especiales
    tecnologia: [String], // requerimientos técnicos
    seguridad: [String], // requerimientos de seguridad
    otros: String
  },
  
  // Cronograma del evento
  cronograma: [{
    hora: String,
    actividad: String,
    salon: String,
    responsable: String,
    notas: String
  }],
  
  // Estados y seguimiento
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  
  estadoPago: {
    type: String,
    enum: ['pendiente', 'anticipo_pagado', 'pagado_completo', 'vencido'],
    default: 'pendiente'
  },
  
  // Comunicaciones y notas
  notas: String,
  notasInternas: String,
  
  // Historial de cambios
  historial: [{
    fecha: { type: Date, default: Date.now },
    accion: String,
    usuario: String,
    detalles: String
  }],
  
  // Archivos adjuntos
  documentos: [{
    nombre: String,
    tipo: String,
    url: String,
    fechaSubida: { type: Date, default: Date.now }
  }]
  
}, {
  timestamps: true
});

// Middleware para generar número de reserva
reservaPaqueteSchema.pre('save', async function(next) {
  if (this.isNew) {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    
    // Buscar el último número de reserva del día
    const ultimaReserva = await this.constructor.findOne({
      numeroReserva: new RegExp(`^PKG${año}${mes}${dia}`)
    }).sort({ numeroReserva: -1 });
    
    let secuencial = 1;
    if (ultimaReserva) {
      const ultimoNumero = parseInt(ultimaReserva.numeroReserva.slice(-3));
      secuencial = ultimoNumero + 1;
    }
    
    this.numeroReserva = `PKG${año}${mes}${dia}${secuencial.toString().padStart(3, '0')}`;
  }
  next();
});

// Índices para optimizar consultas
reservaPaqueteSchema.index({ usuario: 1, fechaInicio: -1 });
reservaPaqueteSchema.index({ hotel: 1, fechaInicio: 1 });
reservaPaqueteSchema.index({ paquete: 1 });
reservaPaqueteSchema.index({ estado: 1 });
reservaPaqueteSchema.index({ numeroReserva: 1 });

module.exports = mongoose.model('ReservaPaquete', reservaPaqueteSchema);