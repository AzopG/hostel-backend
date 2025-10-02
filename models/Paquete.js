const mongoose = require('mongoose');

const paqueteSchema = new mongoose.Schema({
  // Información básica
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  tipo: { 
    type: String, 
    enum: ['evento_corporativo', 'reunion_negocios', 'congreso', 'capacitacion', 'celebracion_empresarial'],
    default: 'evento_corporativo'
  },
  
  // Capacidad del paquete
  capacidadMinima: { type: Number, required: true, min: 1 },
  capacidadMaxima: { type: Number, required: true, min: 1 },
  
  // Configuración detallada de habitaciones
  habitaciones: [{
    tipo: { 
      type: String, 
      required: true,
      enum: ['individual', 'doble', 'triple', 'suite_junior', 'suite_ejecutiva', 'suite_presidencial']
    }, 
    cantidad: { type: Number, required: true, min: 1 },
    noches: { type: Number, required: true, min: 1, default: 1 },
    precioPorNoche: { type: Number, required: true },
    incluidoEnPaquete: { type: Boolean, default: true },
    descripcion: String
  }],
  
  // Configuración detallada de salones
  salones: [{
    salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
    nombre: String, // Para mostrar sin hacer populate
    capacidad: Number,
    horas: { type: Number, required: true, min: 1, default: 4 },
    configuracion: { 
      type: String, 
      enum: ['teatro', 'classroom', 'u_shape', 'boardroom', 'banquete', 'coctel'],
      default: 'teatro'
    },
    incluidoEnPaquete: { type: Boolean, default: true },
    precioPorHora: { type: Number, required: true },
    equipamientoIncluido: [{
      item: String,
      descripcion: String,
      incluido: { type: Boolean, default: true }
    }]
  }],
  
  // Servicios adicionales detallados
  servicios: [{
    categoria: { 
      type: String, 
      required: true,
      enum: ['audiovisual', 'tecnologia', 'personal', 'decoracion', 'transporte', 'entretenimiento', 'otro']
    },
    nombre: { type: String, required: true },
    descripcion: String,
    precio: { type: Number, required: true },
    unidad: { type: String, enum: ['por_evento', 'por_persona', 'por_hora', 'por_dia'], default: 'por_evento' },
    obligatorio: { type: Boolean, default: false },
    disponible: { type: Boolean, default: true }
  }],
  
  // Opciones de catering mejoradas
  catering: [{
    tipo: { 
      type: String, 
      required: true,
      enum: ['desayuno_continental', 'desayuno_americano', 'almuerzo_ejecutivo', 'almuerzo_buffet', 'cena_formal', 'coffee_break', 'coctel', 'brunch']
    },
    nombre: String,
    descripcion: String,
    precioPorPersona: { type: Number, required: true },
    minPersonas: { type: Number, default: 10 },
    maxPersonas: { type: Number, default: 200 },
    horariosSugeridos: [String],
    incluyeServicio: { type: Boolean, default: true },
    opciones: [{
      nombre: String,
      recargo: { type: Number, default: 0 }
    }]
  }],
  
  // Estructura de precios clara
  precios: {
    base: { type: Number, required: true, min: 0 },
    moneda: { type: String, default: 'COP', enum: ['COP', 'USD', 'EUR'] },
    calculoPor: { type: String, enum: ['paquete_completo', 'por_persona', 'por_dia'], default: 'paquete_completo' },
    incluyeIVA: { type: Boolean, default: false },
    incluyeServicio: { type: Boolean, default: false },
    descuentos: [{
      nombre: String,
      porcentaje: { type: Number, min: 0, max: 100 },
      condicion: String, // ej: "reservas con 30 días de anticipación"
      vigenciaHasta: Date
    }]
  },
  
  // Condiciones comerciales
  condiciones: {
    minDias: { type: Number, default: 1 },
    maxDias: { type: Number, default: 30 },
    anticipacionMinima: { type: Number, default: 7, min: 1 }, // días
    anticipacionMaxima: { type: Number, default: 365 }, // días
    anticipoRequerido: { type: Number, default: 50, min: 0, max: 100 }, // porcentaje
    formasPago: [{ 
      type: String, 
      enum: ['efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'credito_empresarial']
    }]
  },
  
  // Políticas específicas
  politicas: {
    cancelacion: {
      con48Horas: { type: Number, default: 25 }, // porcentaje de penalización
      con24Horas: { type: Number, default: 50 },
      menorA24Horas: { type: Number, default: 100 },
      detalles: String
    },
    modificaciones: {
      permitidas: { type: Boolean, default: true },
      costoModificacion: { type: Number, default: 0 },
      plazoLimite: { type: Number, default: 48 } // horas antes del evento
    }
  },
  
  // Disponibilidad
  disponibilidad: {
    diasSemana: [{ type: Number, min: 0, max: 6 }], // 0=domingo, 6=sábado
    horariosPreferidos: [{
      dia: String,
      horaInicio: String,
      horaFin: String
    }],
    fechasNoDisponibles: [Date],
    temporadaAlta: [{
      inicio: Date,
      fin: Date,
      recargo: Number // porcentaje adicional
    }]
  },
  
  // Estado y control
  estado: { 
    type: String, 
    enum: ['borrador', 'activo', 'pausado', 'inactivo', 'archivado'], 
    default: 'borrador' 
  },
  publicado: { type: Boolean, default: false },
  fechaPublicacion: Date,
  
  // Visibilidad y acceso
  visibilidad: {
    publico: { type: Boolean, default: false },
    soloEmpresas: { type: Boolean, default: true },
    empresasAutorizadas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }]
  },
  
  // Metadatos y seguimiento
  fechaCreacion: { type: Date, default: Date.now },
  ultimaModificacion: { type: Date, default: Date.now },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  modificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  version: { type: Number, default: 1 },
  
  // Estadísticas de uso
  estadisticas: {
    vecesReservado: { type: Number, default: 0 },
    ingresosTotales: { type: Number, default: 0 },
    calificacionPromedio: { type: Number, default: 0, min: 0, max: 5 },
    ultimaReserva: Date
  },
  
  // Notas y observaciones
  notasInternas: String,
  instruccionesEspeciales: String
});

// Índices para optimizar consultas
paqueteSchema.index({ hotel: 1, activo: 1 });
paqueteSchema.index({ fechaInicio: 1, fechaFin: 1 });

// Middleware para actualizar fecha de modificación
paqueteSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.ultimaModificacion = new Date();
  }
  next();
});

module.exports = mongoose.model('Paquete', paqueteSchema);