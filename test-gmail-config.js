/**
 * Script para configurar Gmail como servicio de emails reales
 * 
 * IMPORTANTE: Para usar Gmail necesitas:
 * 1. Una cuenta de Gmail
 * 2. Activar "2-Step Verification" 
 * 3. Generar una "App Password" (no usar tu contraseña normal)
 * 
 * Pasos para configurar:
 * 
 * 1. Ve a https://myaccount.google.com/security
 * 2. Activa "2-Step Verification" 
 * 3. Ve a "App passwords" 
 * 4. Genera una contraseña para "Mail"
 * 5. Usa esa contraseña (16 caracteres) en EMAIL_PASS
 * 
 * Ejemplo de .env:
 * EMAIL_USER=tusemail@gmail.com
 * EMAIL_PASS=abcd efgh ijkl mnop  (App Password de 16 caracteres)
 * NODE_ENV=production
 */

const nodemailer = require('nodemailer');

// Función para probar la configuración de Gmail
async function testGmailConfig() {
  console.log('🧪 Probando configuración de Gmail...\n');

  // Verificar variables de entorno
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASS = process.env.EMAIL_PASS;
  const NODE_ENV = process.env.NODE_ENV;

  console.log('📧 Variables de entorno:');
  console.log(`   EMAIL_USER: ${EMAIL_USER}`);
  console.log(`   EMAIL_PASS: ${EMAIL_PASS ? '***configurada***' : '❌ NO CONFIGURADA'}`);
  console.log(`   NODE_ENV: ${NODE_ENV}\n`);

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('❌ ERROR: Faltan variables de entorno EMAIL_USER y EMAIL_PASS');
    console.log('\n📋 Para configurar Gmail:');
    console.log('1. Ve a https://myaccount.google.com/security');
    console.log('2. Activa "2-Step Verification"');
    console.log('3. Ve a "App passwords"');
    console.log('4. Genera una contraseña para "Mail"');
    console.log('5. Configura en .env:');
    console.log('   EMAIL_USER=tusemail@gmail.com');
    console.log('   EMAIL_PASS=tu_app_password_de_16_caracteres');
    console.log('   NODE_ENV=production');
    return;
  }

  // Crear transportador de Gmail
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });

    console.log('🔧 Verificando conexión con Gmail...');
    
    // Verificar conexión
    await transporter.verify();
    console.log('✅ Conexión con Gmail exitosa!');

    // Enviar email de prueba
    console.log('\n📨 Enviando email de prueba...');
    
    const info = await transporter.sendMail({
      from: `"Sistema Hotelero Test" <${EMAIL_USER}>`,
      to: EMAIL_USER, // Enviar a ti mismo
      subject: '✅ Test de Configuración - Sistema Hotelero',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
            <h1>✅ ¡Configuración Exitosa!</h1>
            <p>El sistema de emails está funcionando correctamente</p>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 10px;">
            <h2 style="color: #333;">🎉 Sistema de Emails Configurado</h2>
            <p>Tu sistema hotelero ya puede enviar emails reales a través de Gmail.</p>
            
            <h3 style="color: #667eea;">📋 Funcionalidades habilitadas:</h3>
            <ul>
              <li>✅ Confirmación de reservas</li>
              <li>✅ Cancelación de reservas</li>
              <li>✅ Recuperación de contraseñas</li>
              <li>✅ Confirmación de eventos corporativos</li>
              <li>✅ Notificaciones automáticas</li>
            </ul>
            
            <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <strong>📌 Configuración actual:</strong><br>
              Email: ${EMAIL_USER}<br>
              Servidor: Gmail SMTP<br>
              Fecha: ${new Date().toLocaleString('es-ES')}<br>
              Estado: ✅ Funcionando
            </div>
          </div>
          
          <p style="text-align: center; color: #666; margin-top: 30px; font-size: 12px;">
            Sistema Hotelero - Test de Configuración<br>
            Este email se envió automáticamente para verificar la configuración.
          </p>
        </div>
      `,
      text: `
¡CONFIGURACIÓN EXITOSA!

El sistema de emails está funcionando correctamente.

Funcionalidades habilitadas:
✅ Confirmación de reservas
✅ Cancelación de reservas  
✅ Recuperación de contraseñas
✅ Confirmación de eventos corporativos
✅ Notificaciones automáticas

Configuración actual:
Email: ${EMAIL_USER}
Servidor: Gmail SMTP
Fecha: ${new Date().toLocaleString('es-ES')}
Estado: ✅ Funcionando

Sistema Hotelero - Test de Configuración
      `
    });

    console.log('✅ Email de prueba enviado exitosamente!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📬 Revisa tu bandeja de entrada: ${EMAIL_USER}`);
    
    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA!');
    console.log('Ya puedes usar el sistema de emails en producción.');
    
  } catch (error) {
    console.log('❌ ERROR al configurar Gmail:');
    console.log(`   ${error.message}\n`);
    
    if (error.code === 'EAUTH') {
      console.log('🔧 Problema de autenticación. Soluciones:');
      console.log('1. Verifica que EMAIL_USER y EMAIL_PASS sean correctos');
      console.log('2. Asegúrate de usar una App Password (no tu contraseña normal)');
      console.log('3. Verifica que 2-Step Verification esté activado');
      console.log('4. Genera una nueva App Password si es necesario');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🔧 Problema de conexión:');
      console.log('1. Verifica tu conexión a internet');
      console.log('2. Verifica que no haya firewall bloqueando el puerto 587');
    } else {
      console.log('🔧 Revisa la configuración y vuelve a intentar');
    }
  }
}

// Ejecutar test
if (require.main === module) {
  // Cargar variables de entorno
  require('dotenv').config();
  
  testGmailConfig().catch(console.error);
}

module.exports = { testGmailConfig };