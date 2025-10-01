/**
 * Script de prueba para verificar que el sistema de emails y recibos funcione
 */

require('dotenv').config();
const { sendReservaConfirmacionEmail } = require('./config/email');

// Datos de prueba para un email
const datosReservaPrueba = {
  email: 'test@example.com', // Cambiar por tu email para probar
  nombre: 'Juan',
  apellido: 'Pérez',
  codigoReserva: 'HTL-TEST-001',
  hotel: {
    nombre: 'Hotel Demo',
    ciudad: 'Bogotá',
    direccion: 'Calle 123 #45-67',
    telefono: '+57 1 234 5678',
    email: 'hotel@demo.com'
  },
  habitacion: {
    tipo: 'Habitación Doble',
    numero: '101'
  },
  fechaInicio: new Date('2025-12-01'),
  fechaFin: new Date('2025-12-03'),
  noches: 2,
  huespedes: 2,
  tarifa: {
    precioPorNoche: 150000,
    subtotal: 300000,
    impuestos: 57000,
    total: 357000,
    moneda: 'COP'
  },
  checkInTime: '15:00',
  checkOutTime: '12:00'
};

async function probarEmail() {
  console.log('🧪 Iniciando prueba del sistema de emails...');
  console.log('📧 Configuración del entorno:');
  console.log('   - NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('   - EMAIL_USER:', process.env.EMAIL_USER ? 'Configurado' : 'NO CONFIGURADO');
  console.log('   - EMAIL_FROM:', process.env.EMAIL_FROM || 'NO CONFIGURADO');
  console.log('');

  try {
    console.log('📤 Enviando email de prueba...');
    console.log('   → Destinatario:', datosReservaPrueba.email);
    console.log('   → Código reserva:', datosReservaPrueba.codigoReserva);
    
    const resultado = await sendReservaConfirmacionEmail(datosReservaPrueba);
    
    if (resultado.success) {
      console.log('');
      console.log('✅ EMAIL ENVIADO EXITOSAMENTE');
      console.log('   → Message ID:', resultado.messageId);
      
      if (resultado.previewUrl) {
        console.log('   → Preview URL (Ethereal):', resultado.previewUrl);
        console.log('');
        console.log('📋 PASOS PARA VER EL EMAIL:');
        console.log('   1. Abre la URL de preview en tu navegador');
        console.log('   2. Verifica que el contenido se vea correctamente');
        console.log('   3. Revisa que todos los datos aparezcan bien');
      }
      
      console.log('');
      console.log('🎉 SISTEMA DE EMAILS FUNCIONANDO CORRECTAMENTE');
      
    } else {
      console.log('');
      console.log('❌ ERROR AL ENVIAR EMAIL');
      console.log('   → Error:', resultado.error);
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 ERROR CRÍTICO:', error.message);
    console.log('');
    console.log('🔧 POSIBLES SOLUCIONES:');
    console.log('   1. Verificar que el archivo .env esté configurado');
    console.log('   2. Asegurarse de que las dependencias estén instaladas');
    console.log('   3. Revisar la conexión a internet');
    
    if (error.message.includes('EAUTH')) {
      console.log('   4. Para Gmail: usar App Password en lugar de contraseña normal');
      console.log('   5. Activar "Less secure app access" en Gmail (no recomendado)');
    }
  }
}

// Ejecutar la prueba
probarEmail();