const nodemailer = require('nodemailer');

/**
 * Configuración del transportador de emails
 * En desarrollo usa MailTrap o Gmail
 * En producción usa SendGrid, AWS SES, o similar
 */

// Configuración para desarrollo con Ethereal (emails de prueba)
const createTestTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

// Configuración para producción con Gmail
const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // App Password de Gmail
    }
  });
};

// Configuración para producción con SendGrid
const createSendGridTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
};

/**
 * Obtener el transportador según el entorno
 */
const getTransporter = async () => {
  const environment = process.env.NODE_ENV || 'development';
  
  // Prioridad 1: SendGrid para producción con API key
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Usando SendGrid para emails');
    return createSendGridTransporter();
  }
  
  // Prioridad 2: Gmail para desarrollo y producción
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('📧 Usando Gmail para emails reales');
    return createGmailTransporter();
  }
  
  // Fallback: Ethereal solo si no hay otras opciones
  console.log('⚠️  Usando Ethereal (emails de prueba - NO LLEGAN A BANDEJA REAL)');
  console.log('   Para enviar emails reales, configura Gmail en .env:');
  console.log('   EMAIL_USER=tusemail@gmail.com');
  console.log('   EMAIL_PASS=tu_app_password');
  return await createTestTransporter();
};

/**
 * Enviar email de recuperación de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} resetUrl - URL de recuperación
 * @param {string} nombre - Nombre del usuario (opcional)
 */
const sendPasswordResetEmail = async (email, resetUrl, nombre = 'Usuario') => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema Hotelero" <noreply@hotel.com>',
      to: email,
      subject: 'Recuperación de Contraseña - Sistema Hotelero',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de Contraseña</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              padding: 14px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
            }
            .code {
              background-color: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 Sistema Hotelero</h1>
            </div>
            
            <div class="content">
              <h2>Hola ${nombre},</h2>
              
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
              
              <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
              
              <center>
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </center>
              
              <p>O copia y pega este enlace en tu navegador:</p>
              <p class="code">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en <strong>1 hora</strong>.
              </div>
              
              <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo válida.</p>
              
              <p>Por razones de seguridad, nunca compartas este enlace con nadie.</p>
            </div>
            
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>&copy; 2025 Sistema Hotelero. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hola ${nombre},
        
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
        
        Para crear una nueva contraseña, visita el siguiente enlace:
        ${resetUrl}
        
        IMPORTANTE: Este enlace expirará en 1 hora.
        
        Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
        
        Por razones de seguridad, nunca compartas este enlace con nadie.
        
        ---
        Sistema Hotelero
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado:', info.messageId);
    
    // En desarrollo con Ethereal, mostrar URL de preview
    if (process.env.NODE_ENV !== 'production' && nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    throw new Error('No se pudo enviar el email de recuperación');
  }
};

/**
 * Enviar email de confirmación de cambio de contraseña
 * @param {string} email - Email del destinatario
 * @param {string} nombre - Nombre del usuario
 */
const sendPasswordChangedEmail = async (email, nombre = 'Usuario') => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema Hotelero" <noreply@hotel.com>',
      to: email,
      subject: 'Contraseña Actualizada - Sistema Hotelero',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contraseña Actualizada</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #28a745;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 8px;
            }
            .success-icon {
              font-size: 48px;
              text-align: center;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #f8d7da;
              border-left: 4px solid #dc3545;
              padding: 12px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 Sistema Hotelero</h1>
            </div>
            
            <div class="content">
              <div class="success-icon">✅</div>
              
              <h2>Hola ${nombre},</h2>
              
              <p>Te confirmamos que tu contraseña ha sido actualizada exitosamente.</p>
              
              <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
              
              <div class="warning">
                <strong>⚠️ ¿No fuiste tú?</strong><br>
                Si no realizaste este cambio, por favor contacta con soporte inmediatamente.
              </div>
              
              <p>Fecha y hora del cambio: <strong>${new Date().toLocaleString('es-ES')}</strong></p>
            </div>
            
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>&copy; 2025 Sistema Hotelero. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hola ${nombre},
        
        Te confirmamos que tu contraseña ha sido actualizada exitosamente.
        
        Ya puedes iniciar sesión con tu nueva contraseña.
        
        ¿No fuiste tú?
        Si no realizaste este cambio, por favor contacta con soporte inmediatamente.
        
        Fecha y hora del cambio: ${new Date().toLocaleString('es-ES')}
        
        ---
        Sistema Hotelero
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmación enviado:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error al enviar email de confirmación:', error);
    // No lanzar error aquí, es solo una notificación
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * HU12 CA1: Enviar email de confirmación de reserva
 * @param {Object} reservaData - Datos de la reserva
 */
const sendReservaConfirmacionEmail = async (reservaData) => {
  try {
    const transporter = await getTransporter();
    
    const {
      email,
      nombre,
      apellido,
      codigoReserva,
      hotel,
      habitacion,
      fechaInicio,
      fechaFin,
      noches,
      huespedes,
      tarifa,
      checkInTime,
      checkOutTime,
      politicas
    } = reservaData;

    const nombreCompleto = `${nombre} ${apellido}`;
    const fechaInicioFormatted = new Date(fechaInicio).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const fechaFinFormatted = new Date(fechaFin).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema Hotelero" <reservas@hotel.com>',
      to: email,
      subject: `✅ Reserva Confirmada - ${codigoReserva}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de Reserva</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .success-badge {
              display: inline-block;
              background-color: rgba(255,255,255,0.2);
              padding: 8px 20px;
              border-radius: 20px;
              margin-top: 15px;
              font-size: 14px;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #2c3e50;
            }
            .codigo-reserva {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 25px 0;
            }
            .codigo-reserva .label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.9;
            }
            .codigo-reserva .code {
              font-size: 32px;
              font-weight: bold;
              margin-top: 5px;
              letter-spacing: 2px;
            }
            .section {
              margin: 30px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #667eea;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #555;
            }
            .info-value {
              color: #333;
              text-align: right;
            }
            .price-total {
              background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
              color: white;
              padding: 15px 20px;
              border-radius: 8px;
              text-align: center;
              margin: 25px 0;
            }
            .price-total .amount {
              font-size: 36px;
              font-weight: bold;
            }
            .button {
              display: inline-block;
              padding: 15px 35px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
              text-align: center;
            }
            .button:hover {
              opacity: 0.9;
            }
            .important-notes {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .important-notes h4 {
              margin-top: 0;
              color: #856404;
            }
            .important-notes ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .important-notes li {
              margin: 8px 0;
              color: #856404;
            }
            .footer {
              background-color: #2c3e50;
              color: #ecf0f1;
              padding: 30px;
              text-align: center;
            }
            .footer p {
              margin: 8px 0;
              font-size: 13px;
            }
            .footer a {
              color: #3498db;
              text-decoration: none;
            }
            .icon {
              font-size: 20px;
              margin-right: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 ¡Reserva Confirmada!</h1>
              <div class="success-badge">
                ✓ Tu reserva ha sido procesada exitosamente
              </div>
            </div>
            
            <div class="content">
              <p class="greeting">
                <strong>Hola ${nombreCompleto},</strong>
              </p>
              
              <p>¡Excelentes noticias! Tu reserva ha sido confirmada exitosamente. Estamos emocionados de recibirte pronto.</p>
              
              <div class="codigo-reserva">
                <div class="label">Código de Reserva</div>
                <div class="code">${codigoReserva}</div>
              </div>
              
              <p style="text-align: center; color: #666;">
                <em>Guarda este código para consultar tu reserva en cualquier momento</em>
              </p>
              
              <div class="section">
                <div class="section-title">📍 Información del Hotel</div>
                <div class="info-row">
                  <span class="info-label">Hotel:</span>
                  <span class="info-value">${hotel.nombre}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Dirección:</span>
                  <span class="info-value">${hotel.direccion || 'Ver en mapa'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ciudad:</span>
                  <span class="info-value">${hotel.ciudad}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Teléfono:</span>
                  <span class="info-value">${hotel.telefono || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${hotel.email || 'N/A'}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">🛏️ Detalles de la Habitación</div>
                <div class="info-row">
                  <span class="info-label">Tipo:</span>
                  <span class="info-value">${habitacion.tipo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Número:</span>
                  <span class="info-value">#${habitacion.numero}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Huéspedes:</span>
                  <span class="info-value">${huespedes} persona${huespedes > 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">📅 Fechas de Estadía</div>
                <div class="info-row">
                  <span class="info-label">Check-in:</span>
                  <span class="info-value">${fechaInicioFormatted} - ${checkInTime || '14:00'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Check-out:</span>
                  <span class="info-value">${fechaFinFormatted} - ${checkOutTime || '12:00'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Noches:</span>
                  <span class="info-value">${noches} noche${noches > 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">💰 Resumen de Precios</div>
                <div class="info-row">
                  <span class="info-label">Precio por noche:</span>
                  <span class="info-value">$${tarifa.precioPorNoche.toLocaleString('es-CO')} ${tarifa.moneda}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Subtotal (${noches} noche${noches > 1 ? 's' : ''}):</span>
                  <span class="info-value">$${tarifa.subtotal.toLocaleString('es-CO')} ${tarifa.moneda}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Impuestos y cargos:</span>
                  <span class="info-value">$${tarifa.impuestos.toLocaleString('es-CO')} ${tarifa.moneda}</span>
                </div>
              </div>
              
              <div class="price-total">
                <div style="font-size: 14px; opacity: 0.9;">TOTAL PAGADO</div>
                <div class="amount">$${tarifa.total.toLocaleString('es-CO')} ${tarifa.moneda}</div>
              </div>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/comprobante/${codigoReserva}" class="button">
                  📄 Ver Comprobante Completo
                </a>
              </center>
              
              <div class="important-notes">
                <h4>⚠️ Información Importante</h4>
                <ul>
                  <li><strong>Cancelación gratuita:</strong> Hasta 24 horas antes del check-in</li>
                  <li><strong>Documento de identidad:</strong> Requerido al momento del check-in</li>
                  <li><strong>Tarjeta de crédito:</strong> Se solicitará como garantía</li>
                </ul>
              </div>
              
              <p>Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
              
              <p style="margin-top: 30px;">
                <strong>¡Esperamos verte pronto!</strong><br>
                Equipo de ${hotel.nombre}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>🏨 Sistema Hotelero</strong></p>
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>Para consultas, contacta directamente con el hotel.</p>
              <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                &copy; 2025 Sistema Hotelero. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
¡RESERVA CONFIRMADA!

Hola ${nombreCompleto},

Tu reserva ha sido confirmada exitosamente.

CÓDIGO DE RESERVA: ${codigoReserva}
(Guarda este código para consultar tu reserva)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 INFORMACIÓN DEL HOTEL
Hotel: ${hotel.nombre}
Dirección: ${hotel.direccion || 'Ver en plataforma'}
Ciudad: ${hotel.ciudad}
Teléfono: ${hotel.telefono || 'N/A'}
Email: ${hotel.email || 'N/A'}

🛏️ DETALLES DE LA HABITACIÓN
Tipo: ${habitacion.tipo}
Número: #${habitacion.numero}
Huéspedes: ${huespedes}

📅 FECHAS DE ESTADÍA
Check-in: ${fechaInicioFormatted} - ${checkInTime || '14:00'}
Check-out: ${fechaFinFormatted} - ${checkOutTime || '12:00'}
Noches: ${noches}

💰 RESUMEN DE PRECIOS
Precio por noche: $${tarifa.precioPorNoche.toLocaleString('es-CO')} ${tarifa.moneda}
Subtotal: $${tarifa.subtotal.toLocaleString('es-CO')} ${tarifa.moneda}
Impuestos: $${tarifa.impuestos.toLocaleString('es-CO')} ${tarifa.moneda}

TOTAL PAGADO: $${tarifa.total.toLocaleString('es-CO')} ${tarifa.moneda}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ INFORMACIÓN IMPORTANTE:
• Cancelación gratuita hasta 24 horas antes
• Documento de identidad requerido al check-in

Ver comprobante completo: ${process.env.FRONTEND_URL || 'http://localhost:4200'}/comprobante/${codigoReserva}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

¡Esperamos verte pronto!
Equipo de ${hotel.nombre}

---
Sistema Hotelero
Este es un correo automático. Para consultas, contacta con el hotel.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de confirmación de reserva enviado:', info.messageId);
    console.log('   → Destinatario:', email);
    console.log('   → Código reserva:', codigoReserva);
    
    // En desarrollo, mostrar preview
    if (process.env.NODE_ENV !== 'production' && nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error al enviar email de confirmación de reserva:', error);
    // HU12 CA2: Registrar incidente pero no fallar la reserva
    return {
      success: false,
      error: error.message,
      incidente: {
        tipo: 'ERROR_ENVIO_EMAIL',
        fecha: new Date(),
        detalle: error.message
      }
    };
  }
};

/**
 * HU12 CA4: Enviar email de cancelación de reserva
 * @param {Object} cancelacionData - Datos de la cancelación
 */
const sendReservaCancelacionEmail = async (cancelacionData) => {
  try {
    const transporter = await getTransporter();
    
    const {
      email,
      nombre,
      apellido,
      codigoReserva,
      hotel,
      habitacion,
      fechaInicio,
      fechaFin,
      fechaCancelacion,
      motivo,
      penalizacion,
      reembolso,
      dentroVentanaGratuita,
      tarifa
    } = cancelacionData;

    const nombreCompleto = `${nombre} ${apellido}`;
    const fechaCancelacionFormatted = new Date(fechaCancelacion).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Sistema Hotelero" <reservas@hotel.com>',
      to: email,
      subject: `❌ Reserva Cancelada - ${codigoReserva}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cancelación de Reserva</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .cancel-badge {
              display: inline-block;
              background-color: rgba(255,255,255,0.2);
              padding: 8px 20px;
              border-radius: 20px;
              margin-top: 15px;
              font-size: 14px;
            }
            .content {
              padding: 40px 30px;
            }
            .codigo-reserva {
              background: #f8f9fa;
              border-left: 4px solid #e74c3c;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
            }
            .codigo-reserva .label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #666;
            }
            .codigo-reserva .code {
              font-size: 24px;
              font-weight: bold;
              margin-top: 5px;
              color: #e74c3c;
            }
            .section {
              margin: 30px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #e74c3c;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #555;
            }
            .info-value {
              color: #333;
              text-align: right;
            }
            .reembolso-box {
              background: ${dentroVentanaGratuita ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin: 25px 0;
            }
            .reembolso-box .amount {
              font-size: 36px;
              font-weight: bold;
              margin: 10px 0;
            }
            .timestamp-box {
              background-color: #fff3cd;
              border: 2px solid #ffc107;
              padding: 15px;
              border-radius: 8px;
              margin: 25px 0;
              text-align: center;
            }
            .timestamp-box .icon {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .timestamp-box .time {
              font-size: 18px;
              font-weight: 600;
              color: #856404;
            }
            .footer {
              background-color: #2c3e50;
              color: #ecf0f1;
              padding: 30px;
              text-align: center;
            }
            .footer p {
              margin: 8px 0;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Reserva Cancelada</h1>
              <div class="cancel-badge">
                Tu reserva ha sido cancelada
              </div>
            </div>
            
            <div class="content">
              <p style="font-size: 18px;">
                <strong>Hola ${nombreCompleto},</strong>
              </p>
              
              <p>Te confirmamos que tu reserva ha sido <strong>cancelada exitosamente</strong>.</p>
              
              <div class="codigo-reserva">
                <div class="label">Código de Reserva Cancelada</div>
                <div class="code">${codigoReserva}</div>
              </div>
              
              <div class="timestamp-box">
                <div class="icon">🕐</div>
                <div style="font-size: 14px; color: #856404; margin-bottom: 5px;">
                  FECHA Y HORA DE CANCELACIÓN
                </div>
                <div class="time">${fechaCancelacionFormatted}</div>
              </div>
              
              <div class="section">
                <div class="section-title">📍 Reserva Cancelada</div>
                <div class="info-row">
                  <span class="info-label">Hotel:</span>
                  <span class="info-value">${hotel.nombre}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ciudad:</span>
                  <span class="info-value">${hotel.ciudad}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Habitación:</span>
                  <span class="info-value">${habitacion.tipo} #${habitacion.numero}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Check-in previsto:</span>
                  <span class="info-value">${new Date(fechaInicio).toLocaleDateString('es-ES')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Check-out previsto:</span>
                  <span class="info-value">${new Date(fechaFin).toLocaleDateString('es-ES')}</span>
                </div>
                ${motivo ? `
                <div class="info-row">
                  <span class="info-label">Motivo:</span>
                  <span class="info-value">${motivo}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="section">
                <div class="section-title">💰 Información Financiera</div>
                <div class="info-row">
                  <span class="info-label">Monto original:</span>
                  <span class="info-value">$${tarifa.total.toLocaleString('es-CO')} ${tarifa.moneda}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Penalización:</span>
                  <span class="info-value">${dentroVentanaGratuita ? 'Sin penalización ✓' : `$${penalizacion.toLocaleString('es-CO')} ${tarifa.moneda}`}</span>
                </div>
              </div>
              
              <div class="reembolso-box">
                <div style="font-size: 14px; opacity: 0.9;">
                  ${dentroVentanaGratuita ? '✓ REEMBOLSO COMPLETO' : 'MONTO A REEMBOLSAR'}
                </div>
                <div class="amount">$${reembolso.toLocaleString('es-CO')} ${tarifa.moneda}</div>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 10px;">
                  ${dentroVentanaGratuita 
                    ? 'Cancelaste dentro de la ventana gratuita (48+ horas antes)' 
                    : reembolso === 0 
                      ? 'Cancelaste con menos de 24 horas de anticipación' 
                      : 'Cancelaste entre 24-48 horas antes del check-in'}
                </div>
              </div>
              
              ${reembolso > 0 ? `
              <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #004085;">
                  <strong>💳 Proceso de reembolso:</strong> El monto será procesado en los próximos 5-7 días hábiles y aparecerá en tu método de pago original.
                </p>
              </div>
              ` : ''}
              
              <p style="margin-top: 30px;">
                Lamentamos que no puedas quedarte con nosotros en esta ocasión. Esperamos poder recibirte en el futuro.
              </p>
              
              <p>Si tienes alguna pregunta sobre esta cancelación, no dudes en contactarnos.</p>
              
              <p style="margin-top: 30px;">
                <strong>Gracias por tu preferencia</strong><br>
                Equipo de ${hotel.nombre}
              </p>
            </div>
            
            <div class="footer">
              <p><strong>🏨 Sistema Hotelero</strong></p>
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>Para consultas, contacta directamente con el hotel.</p>
              <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                &copy; 2025 Sistema Hotelero. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
RESERVA CANCELADA

Hola ${nombreCompleto},

Te confirmamos que tu reserva ha sido CANCELADA exitosamente.

CÓDIGO DE RESERVA: ${codigoReserva}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🕐 FECHA Y HORA DE CANCELACIÓN:
${fechaCancelacionFormatted}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 RESERVA CANCELADA
Hotel: ${hotel.nombre}
Ciudad: ${hotel.ciudad}
Habitación: ${habitacion.tipo} #${habitacion.numero}
Check-in previsto: ${new Date(fechaInicio).toLocaleDateString('es-ES')}
Check-out previsto: ${new Date(fechaFin).toLocaleDateString('es-ES')}
${motivo ? `Motivo: ${motivo}` : ''}

💰 INFORMACIÓN FINANCIERA
Monto original: $${tarifa.total.toLocaleString('es-CO')} ${tarifa.moneda}
Penalización: ${dentroVentanaGratuita ? 'Sin penalización ✓' : `$${penalizacion.toLocaleString('es-CO')} ${tarifa.moneda}`}

MONTO A REEMBOLSAR: $${reembolso.toLocaleString('es-CO')} ${tarifa.moneda}

${dentroVentanaGratuita 
  ? '✓ Cancelaste dentro de la ventana gratuita (48+ horas antes)' 
  : reembolso === 0 
    ? 'Cancelaste con menos de 24 horas de anticipación' 
    : 'Cancelaste entre 24-48 horas antes del check-in'}

${reembolso > 0 ? `
💳 PROCESO DE REEMBOLSO:
El monto será procesado en los próximos 5-7 días hábiles y aparecerá en tu método de pago original.
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lamentamos que no puedas quedarte con nosotros.
Esperamos poder recibirte en el futuro.

Gracias por tu preferencia,
Equipo de ${hotel.nombre}

---
Sistema Hotelero
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de cancelación enviado:', info.messageId);
    console.log('   → Destinatario:', email);
    console.log('   → Código reserva:', codigoReserva);
    console.log('   → Timestamp:', fechaCancelacionFormatted);
    
    if (process.env.NODE_ENV !== 'production' && nodemailer.getTestMessageUrl(info)) {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info)
      };
    }
    
    return {
      success: true,
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error al enviar email de cancelación:', error);
    return {
      success: false,
      error: error.message,
      incidente: {
        tipo: 'ERROR_ENVIO_EMAIL_CANCELACION',
        fecha: new Date(),
        detalle: error.message
      }
    };
  }
};

/**
 * HU17: Enviar email de confirmación de reserva de salón
 */
const sendReservaSalonConfirmacionEmail = async (reservaData) => {
  try {
    const {
      email,
      nombre,
      apellido,
      codigoReserva,
      hotel,
      salon,
      evento,
      fechaInicio,
      fechaFin,
      dias,
      tarifa
    } = reservaData;

    // Formatear fechas
    const opciones = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Bogota'
    };
    const fechaInicioFormato = new Date(fechaInicio).toLocaleDateString('es-CO', opciones);
    const fechaFinFormato = new Date(fechaFin).toLocaleDateString('es-CO', opciones);

    // Formatear precios
    const formatearPrecio = (precio) => {
      return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(precio);
    };

    // Generar HTML del email
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 30px; }
          .codigo-reserva { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .codigo-reserva h2 { margin: 0 0 10px 0; color: #667eea; font-size: 18px; }
          .codigo-reserva .codigo { font-size: 28px; font-weight: bold; color: #333; letter-spacing: 2px; }
          .info-section { margin: 25px 0; }
          .info-section h3 { color: #667eea; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 600; color: #555; }
          .info-value { color: #333; }
          .event-highlight { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .event-highlight h4 { margin: 0 0 10px 0; color: #856404; }
          .total-section { background-color: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-final { font-size: 20px; font-weight: bold; color: #667eea; padding-top: 10px; border-top: 2px solid #667eea; margin-top: 10px; }
          .alert-box { background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 20px 0; color: #0c5460; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          .footer a { color: #667eea; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .email-container { margin: 0; border-radius: 0; }
            .content { padding: 20px; }
            .info-row { flex-direction: column; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <h1>✅ Reserva de Salón Confirmada</h1>
            <p>Tu evento está asegurado</p>
          </div>

          <!-- Content -->
          <div class="content">
            <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
            
            <p>¡Excelente noticia! Tu reserva de salón ha sido confirmada exitosamente.</p>

            <!-- Código de Reserva -->
            <div class="codigo-reserva">
              <h2>📋 Código de Reserva</h2>
              <div class="codigo">${codigoReserva}</div>
              <p style="margin: 10px 0 0 0; font-size: 13px; color: #6c757d;">
                Guarda este código. Lo necesitarás para cualquier consulta sobre tu reserva.
              </p>
            </div>

            <!-- Información del Evento -->
            <div class="event-highlight">
              <h4>🎯 Información del Evento</h4>
              <p><strong>Evento:</strong> ${evento.nombreEvento}</p>
              <p><strong>Tipo:</strong> ${evento.tipoEvento || 'Corporativo'}</p>
              <p><strong>Responsable:</strong> ${evento.responsable}</p>
              ${evento.cargoResponsable ? `<p><strong>Cargo:</strong> ${evento.cargoResponsable}</p>` : ''}
              <p><strong>Horario:</strong> ${evento.horarioInicio} - ${evento.horarioFin}</p>
              ${evento.layoutSeleccionado ? `<p><strong>Layout:</strong> ${evento.layoutSeleccionado} (${evento.capacidadLayout} personas)</p>` : ''}
            </div>

            <!-- Información del Salón -->
            <div class="info-section">
              <h3>🏢 Información del Salón</h3>
              <div class="info-row">
                <span class="info-label">Salón:</span>
                <span class="info-value">${salon.nombre}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Capacidad:</span>
                <span class="info-value">${salon.capacidad} personas</span>
              </div>
              <div class="info-row">
                <span class="info-label">Área:</span>
                <span class="info-value">${salon.area} m²</span>
              </div>
            </div>

            <!-- Información del Hotel -->
            <div class="info-section">
              <h3>🏨 Información del Hotel</h3>
              <div class="info-row">
                <span class="info-label">Hotel:</span>
                <span class="info-value">${hotel.nombre}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ciudad:</span>
                <span class="info-value">${hotel.ciudad}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Dirección:</span>
                <span class="info-value">${hotel.direccion}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Teléfono:</span>
                <span class="info-value">${hotel.telefono}</span>
              </div>
            </div>

            <!-- Fechas -->
            <div class="info-section">
              <h3>📅 Fechas del Evento</h3>
              <div class="info-row">
                <span class="info-label">Fecha de inicio:</span>
                <span class="info-value">${fechaInicioFormato}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Fecha de fin:</span>
                <span class="info-value">${fechaFinFormato}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Duración:</span>
                <span class="info-value">${dias} día${dias > 1 ? 's' : ''}</span>
              </div>
            </div>

            <!-- Resumen de Tarifa -->
            <div class="total-section">
              <h3 style="margin-top: 0; color: #495057;">💳 Resumen de Pago</h3>
              <div class="total-row">
                <span>Subtotal (${dias} día${dias > 1 ? 's' : ''}):</span>
                <span>$${formatearPrecio(tarifa.subtotal)} COP</span>
              </div>
              <div class="total-row">
                <span>Impuestos (IVA 19%):</span>
                <span>$${formatearPrecio(tarifa.impuestos)} COP</span>
              </div>
              <div class="total-row total-final">
                <span>TOTAL:</span>
                <span>$${formatearPrecio(tarifa.total)} COP</span>
              </div>
            </div>

            <!-- Recordatorio -->
            <div class="alert-box">
              <strong>📌 Recordatorio:</strong><br>
              • Llega con 30 minutos de anticipación para el montaje<br>
              • Respeta el horario acordado: ${evento.horarioInicio} - ${evento.horarioFin}<br>
              • El equipamiento básico está incluido<br>
              • Para servicios adicionales, contacta al hotel con anticipación
            </div>

            <p style="margin-top: 25px;">
              Si tienes alguna pregunta o necesitas realizar cambios, por favor contacta al hotel directamente:
            </p>
            <p style="margin: 5px 0;">
              📞 <strong>Teléfono:</strong> ${hotel.telefono}<br>
              📧 <strong>Email:</strong> ${hotel.email || 'reservas@hotel.com'}
            </p>

            <p style="margin-top: 25px; color: #667eea; font-weight: 600;">
              ¡Gracias por elegirnos para tu evento! Estamos seguros de que será todo un éxito. 🎉
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>Este es un correo automático. Por favor no respondas a este mensaje.</p>
            <p>© ${new Date().getFullYear()} ${hotel.nombre}. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Configurar transporte de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'tu_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu_contraseña_app'
      }
    });

    // Configurar opciones del email
    const mailOptions = {
      from: `"${hotel.nombre}" <${process.env.EMAIL_USER || 'noreply@hotel.com'}>`,
      to: email,
      subject: `✅ Reserva Confirmada: ${evento.nombreEvento} - Código ${codigoReserva}`,
      html: htmlContent
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email de confirmación de salón enviado a ${email}`);

    return {
      success: true,
      messageId: info.messageId,
      destinatario: email
    };

  } catch (error) {
    console.error('❌ Error al enviar email de confirmación de salón:', error);
    return {
      success: false,
      error: error.message,
      detalle: {
        codigo: error.code || 'UNKNOWN_ERROR',
        detalle: error.message
      }
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendReservaConfirmacionEmail,
  sendReservaCancelacionEmail,
  sendReservaSalonConfirmacionEmail
};
