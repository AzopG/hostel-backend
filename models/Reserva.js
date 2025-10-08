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
  
  // HU17: Información específica para eventos empresariales
  datosEvento: {
    nombreEvento: { type: String }, // CA1: Nombre del evento
    tipoEvento: { type: String }, // Conferencia, Capacitación, etc.
    horarioInicio: { type: String }, // CA1: Hora de inicio (ej: "09:00")
    horarioFin: { type: String }, // CA1: Hora de fin (ej: "18:00")
    responsable: { type: String }, // CA1: Nombre del responsable del evento
    cargoResponsable: { type: String }, // Cargo del responsable
    telefonoResponsable: { type: String }, // Teléfono de contacto
    layoutSeleccionado: { type: String }, // CA1: Layout elegido (Teatro, Banquete, etc.)
    capacidadLayout: { type: Number }, // Capacidad del layout seleccionado
    serviciosAdicionales: [{ type: String }], // Catering, decoración, etc.
    requiremientosEspeciales: { type: String } // Requerimientos adicionales
  },
  
  // HU18: Información específica para paquetes corporativos
  datosPaquete: {
    esPaquete: { type: Boolean, default: false }, // CA1: Marca si es reserva de paquete
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }, // CA1: Salón del paquete
    habitaciones: [{ // CA1: Habitaciones del paquete
      habitacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion' },
      cantidad: { type: Number },
      tipo: { type: String }
    }],
    catering: { // CA1: Información de catering
      incluido: { type: Boolean, default: false },
      tipoCatering: { type: String }, // Desayuno, Almuerzo, Cena, Coffee Break
      numeroPersonas: { type: Number },
      menuSeleccionado: { type: String },
      restriccionesAlimentarias: { type: String },
      costoTotal: { type: Number }
    },
    serviciosAdicionales: [{ // Servicios extra del paquete
      nombre: { type: String },
      descripcion: { type: String },
      costo: { type: Number }
    }],
    // CA2: Validación de disponibilidad conjunta
    validacionDisponibilidad: {
      salonDisponible: { type: Boolean },
      habitacionesDisponibles: { type: Boolean },
      cateringDisponible: { type: Boolean },
      todosDisponibles: { type: Boolean },
      fechaValidacion: { type: Date }
    },
    // CA3: Registro de inconsistencias
    inconsistencias: [{
      componente: { type: String, enum: ['salon', 'habitaciones', 'catering'] },
      motivo: { type: String },
      fechaDeteccion: { type: Date, default: Date.now },
      alternativaOfrecida: { type: String }
    }],
    // CA4: Código único de paquete
    codigoPaquete: { type: String, unique: true, sparse: true, uppercase: true },
    descuentoPaquete: { type: Number, default: 0 }, // Descuento por ser paquete (%)
    totalSinDescuento: { type: Number },
    totalConDescuento: { type: Number }
  },
  
  
  // Eventos empresariales (opcional - legacy)
  
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
  
  // HU12: Notificaciones por email
  notificaciones: {
    confirmacionEnviada: { type: Boolean, default: false },
    confirmacionFecha: { type: Date },
    confirmacionMessageId: { type: String },
    cancelacionEnviada: { type: Boolean, default: false },
    cancelacionFecha: { type: Date },
    cancelacionMessageId: { type: String }
  },
  
  // HU12 CA2: Registro de incidentes de email
  incidentesEmail: [{
    tipo: { type: String, enum: ['ERROR_ENVIO_EMAIL', 'ERROR_ENVIO_EMAIL_CANCELACION'] },
    fecha: { type: Date, default: Date.now },
    detalle: { type: String },
    email: { type: String }
  }],
  
  // Gestión de hotel
  fechaConfirmacion: { type: Date },
  fechaCancelacion: { type: Date },
  fechaCompletado: { type: Date },
  motivoCancelacion: { type: String },
  canceladoPor: { type: String, enum: ['cliente', 'hotel'] },
  notasHotel: { type: String },
  
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

// HU18: Método estático para generar código de paquete único
reservaSchema.statics.generarCodigoPaquete = async function() {
  let codigo;
  let existe = true;
  
  while (existe) {
    // Generar código: PKG + 8 caracteres alfanuméricos
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    codigo = 'PKG';
    for (let i = 0; i < 8; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Verificar si ya existe
    const paqueteExistente = await this.findOne({ 'datosPaquete.codigoPaquete': codigo });
    existe = !!paqueteExistente;
  }
  
  return codigo;
};

module.exports = mongoose.model('Reserva', reservaSchema);