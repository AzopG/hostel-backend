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
  
  if (environment === 'production' && process.env.SENDGRID_API_KEY) {
    console.log('📧 Usando SendGrid para emails');
    return createSendGridTransporter();
  }
  
  if (environment === 'production' && process.env.EMAIL_USER) {
    console.log('📧 Usando Gmail para emails');
    return createGmailTransporter();
  }
  
  // Desarrollo: usar Ethereal (emails de prueba)
  console.log('📧 Usando Ethereal (modo desarrollo)');
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

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};
