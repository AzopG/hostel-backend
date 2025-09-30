const PDFDocument = require('pdfkit');
const Reserva = require('../models/Reserva');

/**
 * HU11 CA1: Generar comprobante HTML (para visualización)
 */
exports.obtenerComprobanteHTML = async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    const { idioma = 'es' } = req.query; // CA3: Soporte multiidioma

    // Buscar reserva
    const reserva = await Reserva.findOne({ codigoReserva: codigoReserva.toUpperCase() })
      .populate('hotel', 'nombre ciudad departamento direccion telefono email logo')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // CA1: Validar que la reserva esté confirmada para ver comprobante
    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo las reservas confirmadas o completadas tienen comprobante disponible'
      });
    }

    // CA3: Traducciones
    const traducciones = getTraduccionesComprobante(idioma);

    // CA1: Preparar datos del comprobante
    const comprobante = {
      reserva: {
        codigo: reserva.codigoReserva,
        estado: reserva.estado,
        fechaCreacion: reserva.createdAt
      },
      hotel: {
        nombre: reserva.hotel.nombre,
        ciudad: reserva.hotel.ciudad,
        departamento: reserva.hotel.departamento || '',
        direccion: reserva.hotel.direccion,
        telefono: reserva.hotel.telefono,
        email: reserva.hotel.email
      },
      habitacion: {
        numero: reserva.habitacion.numero,
        tipo: reserva.habitacion.tipo,
        capacidad: reserva.habitacion.capacidad,
        servicios: reserva.habitacion.servicios || []
      },
      huesped: {
        nombre: `${reserva.datosHuesped.nombre} ${reserva.datosHuesped.apellido}`,
        email: reserva.datosHuesped.email,
        telefono: reserva.datosHuesped.telefono,
        documento: reserva.datosHuesped.documento || 'N/A'
      },
      fechas: {
        inicio: reserva.fechaInicio,
        fin: reserva.fechaFin,
        noches: reserva.noches
      },
      tarifa: {
        precioPorNoche: reserva.tarifa.precioPorNoche,
        subtotal: reserva.tarifa.subtotal,
        impuestos: reserva.tarifa.impuestos,
        total: reserva.tarifa.total,
        moneda: reserva.tarifa.moneda || 'COP'
      },
      huespedes: reserva.huespedes,
      traducciones
    };

    res.json({
      success: true,
      comprobante,
      idioma
    });

  } catch (err) {
    console.error('Error al obtener comprobante:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comprobante',
      error: err.message
    });
  }
};

/**
 * HU11 CA2: Generar comprobante PDF (para descarga)
 */
exports.descargarComprobantePDF = async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    const { idioma = 'es' } = req.query; // CA3: Soporte multiidioma

    // Buscar reserva
    const reserva = await Reserva.findOne({ codigoReserva: codigoReserva.toUpperCase() })
      .populate('hotel', 'nombre ciudad departamento direccion telefono email')
      .populate('habitacion', 'numero tipo capacidad servicios')
      .lean();

    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }

    // Validar estado
    if (reserva.estado !== 'confirmada' && reserva.estado !== 'completada') {
      return res.status(400).json({
        success: false,
        message: 'Solo las reservas confirmadas o completadas tienen comprobante disponible'
      });
    }

    // CA3: Obtener traducciones
    const t = getTraduccionesComprobante(idioma);

    // CA2: Crear documento PDF
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprobante-${reserva.codigoReserva}.pdf`);

    // Pipe el PDF a la respuesta
    doc.pipe(res);

    // ========== DISEÑO DEL COMPROBANTE PDF ==========

    // ENCABEZADO
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .text(t.titulo, { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(t.subtitulo, { align: 'center' })
       .moveDown(1);

    // LÍNEA SEPARADORA
    doc.strokeColor('#3498db')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke()
       .moveDown(1);

    // CÓDIGO DE RESERVA (DESTACADO)
    doc.fontSize(16)
       .fillColor('#e74c3c')
       .text(`${t.codigoReserva}: `, { continued: true })
       .fillColor('#2c3e50')
       .text(reserva.codigoReserva)
       .moveDown(0.5);

    // ESTADO Y FECHA
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`${t.estado}: `, { continued: true })
       .fillColor(getColorEstado(reserva.estado))
       .text(t.estados[reserva.estado] || reserva.estado)
       .moveDown(0.3);

    doc.fillColor('#7f8c8d')
       .text(`${t.fechaEmision}: `, { continued: true })
       .fillColor('#2c3e50')
       .text(formatearFechaComprobante(reserva.createdAt, idioma))
       .moveDown(1.5);

    // SECCIÓN: INFORMACIÓN DEL HOTEL
    agregarSeccion(doc, t.infoHotel);
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(`${t.hotel}: ${reserva.hotel.nombre}`, { indent: 20 })
       .text(`${t.ubicacion}: ${reserva.hotel.ciudad}, ${reserva.hotel.departamento || ''}`, { indent: 20 })
       .text(`${t.direccion}: ${reserva.hotel.direccion}`, { indent: 20 })
       .text(`${t.telefono}: ${reserva.hotel.telefono}`, { indent: 20 })
       .text(`${t.email}: ${reserva.hotel.email}`, { indent: 20 })
       .moveDown(1);

    // SECCIÓN: INFORMACIÓN DEL HUÉSPED
    agregarSeccion(doc, t.infoHuesped);
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(`${t.nombre}: ${reserva.datosHuesped.nombre} ${reserva.datosHuesped.apellido}`, { indent: 20 })
       .text(`${t.emailHuesped}: ${reserva.datosHuesped.email}`, { indent: 20 })
       .text(`${t.telefonoHuesped}: ${reserva.datosHuesped.telefono}`, { indent: 20 });
    
    if (reserva.datosHuesped.documento) {
      doc.text(`${t.documento}: ${reserva.datosHuesped.documento}`, { indent: 20 });
    }
    
    doc.moveDown(1);

    // SECCIÓN: DETALLES DE LA RESERVA
    agregarSeccion(doc, t.detallesReserva);
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(`${t.habitacion}: ${reserva.habitacion.tipo} - ${t.numeroHabitacion} ${reserva.habitacion.numero}`, { indent: 20 })
       .text(`${t.capacidad}: ${reserva.habitacion.capacidad} ${t.personas}`, { indent: 20 })
       .text(`${t.huespedes}: ${reserva.huespedes}`, { indent: 20 })
       .moveDown(0.5);

    // Servicios incluidos
    if (reserva.habitacion.servicios && reserva.habitacion.servicios.length > 0) {
      doc.text(`${t.servicios}:`, { indent: 20 })
         .fontSize(9)
         .fillColor('#7f8c8d');
      
      reserva.habitacion.servicios.slice(0, 5).forEach(servicio => {
        doc.text(`• ${servicio}`, { indent: 40 });
      });
      
      doc.moveDown(0.5);
    }

    // SECCIÓN: FECHAS DE ESTADÍA
    agregarSeccion(doc, t.fechasEstadia);
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(`${t.checkIn}: ${formatearFechaComprobante(reserva.fechaInicio, idioma)}`, { indent: 20 })
       .text(`${t.checkOut}: ${formatearFechaComprobante(reserva.fechaFin, idioma)}`, { indent: 20 })
       .text(`${t.noches}: ${reserva.noches}`, { indent: 20 })
       .moveDown(1);

    // SECCIÓN: DESGLOSE DE TARIFA
    agregarSeccion(doc, t.desglosePrecios);
    
    const moneda = reserva.tarifa.moneda === 'COP' ? '$' : reserva.tarifa.moneda;
    
    doc.fontSize(10)
       .fillColor('#2c3e50')
       .text(`${t.precioPorNoche}: ${moneda} ${formatearPrecio(reserva.tarifa.precioPorNoche)}`, { indent: 20 })
       .text(`${t.subtotal} (${reserva.noches} ${reserva.noches === 1 ? t.noche : t.noches}): ${moneda} ${formatearPrecio(reserva.tarifa.subtotal)}`, { indent: 20 })
       .text(`${t.impuestos} (19%): ${moneda} ${formatearPrecio(reserva.tarifa.impuestos)}`, { indent: 20 })
       .moveDown(0.5);

    // TOTAL (DESTACADO)
    doc.fontSize(14)
       .fillColor('#27ae60')
       .text(`${t.total}: ${moneda} ${formatearPrecio(reserva.tarifa.total)}`, { indent: 20, bold: true })
       .moveDown(1.5);

    // POLÍTICAS Y NOTAS
    agregarSeccion(doc, t.notasImportantes);
    
    doc.fontSize(9)
       .fillColor('#7f8c8d')
       .text(t.politicaCancelacion, { indent: 20, align: 'justify' })
       .moveDown(0.3)
       .text(t.horarios, { indent: 20 })
       .moveDown(0.3)
       .text(t.presentacion, { indent: 20 })
       .moveDown(1.5);

    // FOOTER
    doc.fontSize(8)
       .fillColor('#95a5a6')
       .text(t.footer, { align: 'center' })
       .moveDown(0.3)
       .text(t.generado + formatearFechaComprobante(new Date(), idioma), { align: 'center' });

    // Código QR simulado (cuadrado)
    const qrX = 250;
    const qrY = doc.y + 20;
    doc.rect(qrX, qrY, 100, 100)
       .stroke();
    
    doc.fontSize(7)
       .fillColor('#7f8c8d')
       .text('QR Code', qrX + 35, qrY + 45);

    // Finalizar PDF
    doc.end();

  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({
      success: false,
      message: 'Error al generar PDF',
      error: err.message
    });
  }
};

/**
 * HU11 CA4: Obtener historial de comprobantes del usuario
 */
exports.obtenerHistorialComprobantes = async (req, res) => {
  try {
    const { usuarioId } = req.params; // En producción, obtener del token JWT
    const { idioma = 'es' } = req.query;

    // Buscar todas las reservas confirmadas o completadas del usuario
    const reservas = await Reserva.find({
      $or: [
        { usuario: usuarioId },
        { 'datosHuesped.email': req.query.email } // Para usuarios sin cuenta
      ],
      estado: { $in: ['confirmada', 'completada'] }
    })
    .populate('hotel', 'nombre ciudad')
    .populate('habitacion', 'tipo')
    .sort({ createdAt: -1 })
    .lean();

    const t = getTraduccionesComprobante(idioma);

    const comprobantes = reservas.map(reserva => ({
      codigoReserva: reserva.codigoReserva,
      hotel: reserva.hotel.nombre,
      ciudad: reserva.hotel.ciudad,
      habitacion: reserva.habitacion.tipo,
      fechaInicio: reserva.fechaInicio,
      fechaFin: reserva.fechaFin,
      total: reserva.tarifa.total,
      moneda: reserva.tarifa.moneda,
      estado: reserva.estado,
      fechaCreacion: reserva.createdAt,
      urlVisualizacion: `/api/comprobantes/${reserva.codigoReserva}`,
      urlDescarga: `/api/comprobantes/${reserva.codigoReserva}/pdf`
    }));

    res.json({
      success: true,
      comprobantes,
      total: comprobantes.length,
      traducciones: t
    });

  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de comprobantes',
      error: err.message
    });
  }
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * CA3: Traducciones del comprobante según idioma
 */
function getTraduccionesComprobante(idioma) {
  const traducciones = {
    es: {
      titulo: 'COMPROBANTE DE RESERVA',
      subtitulo: 'Confirmación de su reserva hotelera',
      codigoReserva: 'Código de Reserva',
      estado: 'Estado',
      fechaEmision: 'Fecha de Emisión',
      infoHotel: 'INFORMACIÓN DEL HOTEL',
      hotel: 'Hotel',
      ubicacion: 'Ubicación',
      direccion: 'Dirección',
      telefono: 'Teléfono',
      email: 'Email',
      infoHuesped: 'INFORMACIÓN DEL HUÉSPED',
      nombre: 'Nombre',
      emailHuesped: 'Email',
      telefonoHuesped: 'Teléfono',
      documento: 'Documento',
      detallesReserva: 'DETALLES DE LA RESERVA',
      habitacion: 'Habitación',
      numeroHabitacion: 'No.',
      capacidad: 'Capacidad',
      personas: 'personas',
      huespedes: 'Número de Huéspedes',
      servicios: 'Servicios Incluidos',
      fechasEstadia: 'FECHAS DE ESTADÍA',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      noches: 'Noches',
      noche: 'noche',
      desglosePrecios: 'DESGLOSE DE PRECIOS',
      precioPorNoche: 'Precio por Noche',
      subtotal: 'Subtotal',
      impuestos: 'Impuestos',
      total: 'TOTAL A PAGAR',
      notasImportantes: 'NOTAS IMPORTANTES',
      politicaCancelacion: '• Política de Cancelación: Cancelación gratuita hasta 48 horas antes del check-in. Después se aplicarán penalizaciones según la política del hotel.',
      horarios: '• Horario de Check-in: 3:00 PM | Check-out: 12:00 PM',
      presentacion: '• Por favor, presente este comprobante junto con su documento de identidad al momento del check-in.',
      footer: 'Gracias por su preferencia. ¡Esperamos que disfrute su estadía!',
      generado: 'Documento generado el: ',
      estados: {
        confirmada: 'CONFIRMADA',
        completada: 'COMPLETADA',
        pendiente: 'PENDIENTE',
        cancelada: 'CANCELADA'
      }
    },
    en: {
      titulo: 'RESERVATION RECEIPT',
      subtitulo: 'Your hotel reservation confirmation',
      codigoReserva: 'Reservation Code',
      estado: 'Status',
      fechaEmision: 'Issue Date',
      infoHotel: 'HOTEL INFORMATION',
      hotel: 'Hotel',
      ubicacion: 'Location',
      direccion: 'Address',
      telefono: 'Phone',
      email: 'Email',
      infoHuesped: 'GUEST INFORMATION',
      nombre: 'Name',
      emailHuesped: 'Email',
      telefonoHuesped: 'Phone',
      documento: 'ID Document',
      detallesReserva: 'RESERVATION DETAILS',
      habitacion: 'Room',
      numeroHabitacion: 'No.',
      capacidad: 'Capacity',
      personas: 'people',
      huespedes: 'Number of Guests',
      servicios: 'Included Services',
      fechasEstadia: 'STAY DATES',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      noches: 'Nights',
      noche: 'night',
      desglosePrecios: 'PRICE BREAKDOWN',
      precioPorNoche: 'Price per Night',
      subtotal: 'Subtotal',
      impuestos: 'Taxes',
      total: 'TOTAL AMOUNT',
      notasImportantes: 'IMPORTANT NOTES',
      politicaCancelacion: '• Cancellation Policy: Free cancellation up to 48 hours before check-in. After that, penalties will apply according to hotel policy.',
      horarios: '• Check-in Time: 3:00 PM | Check-out: 12:00 PM',
      presentacion: '• Please present this receipt along with your ID document at check-in.',
      footer: 'Thank you for your preference. We hope you enjoy your stay!',
      generado: 'Document generated on: ',
      estados: {
        confirmada: 'CONFIRMED',
        completada: 'COMPLETED',
        pendiente: 'PENDING',
        cancelada: 'CANCELLED'
      }
    },
    pt: {
      titulo: 'COMPROVANTE DE RESERVA',
      subtitulo: 'Confirmação da sua reserva de hotel',
      codigoReserva: 'Código de Reserva',
      estado: 'Estado',
      fechaEmision: 'Data de Emissão',
      infoHotel: 'INFORMAÇÕES DO HOTEL',
      hotel: 'Hotel',
      ubicacion: 'Localização',
      direccion: 'Endereço',
      telefono: 'Telefone',
      email: 'Email',
      infoHuesped: 'INFORMAÇÕES DO HÓSPEDE',
      nombre: 'Nome',
      emailHuesped: 'Email',
      telefonoHuesped: 'Telefone',
      documento: 'Documento',
      detallesReserva: 'DETALHES DA RESERVA',
      habitacion: 'Quarto',
      numeroHabitacion: 'Nº',
      capacidad: 'Capacidade',
      personas: 'pessoas',
      huespedes: 'Número de Hóspedes',
      servicios: 'Serviços Incluídos',
      fechasEstadia: 'DATAS DA ESTADIA',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      noches: 'Noites',
      noche: 'noite',
      desglosePrecios: 'DETALHAMENTO DE PREÇOS',
      precioPorNoche: 'Preço por Noite',
      subtotal: 'Subtotal',
      impuestos: 'Impostos',
      total: 'TOTAL A PAGAR',
      notasImportantes: 'NOTAS IMPORTANTES',
      politicaCancelacion: '• Política de Cancelamento: Cancelamento gratuito até 48 horas antes do check-in. Depois disso, penalidades serão aplicadas de acordo com a política do hotel.',
      horarios: '• Horário de Check-in: 15:00 | Check-out: 12:00',
      presentacion: '• Por favor, apresente este comprovante junto com seu documento de identidade no momento do check-in.',
      footer: 'Obrigado pela sua preferência. Esperamos que você aproveite sua estadia!',
      generado: 'Documento gerado em: ',
      estados: {
        confirmada: 'CONFIRMADA',
        completada: 'CONCLUÍDA',
        pendiente: 'PENDENTE',
        cancelada: 'CANCELADA'
      }
    }
  };

  return traducciones[idioma] || traducciones['es'];
}

/**
 * Agregar sección al PDF con estilo
 */
function agregarSeccion(doc, titulo) {
  doc.fontSize(12)
     .fillColor('#3498db')
     .text(titulo, { underline: true })
     .moveDown(0.5);
}

/**
 * Formatear fecha para comprobante
 */
function formatearFechaComprobante(fecha, idioma = 'es') {
  const date = new Date(fecha);
  const opciones = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const locales = {
    es: 'es-ES',
    en: 'en-US',
    pt: 'pt-BR'
  };
  
  return date.toLocaleDateString(locales[idioma] || 'es-ES', opciones);
}

/**
 * Formatear precio
 */
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(precio);
}

/**
 * Obtener color según estado
 */
function getColorEstado(estado) {
  const colores = {
    confirmada: '#27ae60',
    completada: '#3498db',
    pendiente: '#f39c12',
    cancelada: '#e74c3c'
  };
  return colores[estado] || '#7f8c8d';
}

module.exports = exports;
