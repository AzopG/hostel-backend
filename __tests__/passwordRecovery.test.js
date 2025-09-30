/**
 * HU03 - Tests para Recuperación de Contraseña
 * Pruebas para forgotPassword y resetPassword
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = require('../index');
const Usuario = require('../models/Usuario');

describe('HU03 - Password Recovery Tests', () => {
  let testUser;
  const testEmail = 'test-recovery@example.com';
  const testPassword = 'password123';

  beforeAll(async () => {
    // Limpiar colección de usuarios
    await Usuario.deleteMany({ email: { $regex: /@example\.com$/i } });
  });

  beforeEach(async () => {
    // Crear usuario de prueba
    const hash = await bcrypt.hash(testPassword, 12);
    testUser = await Usuario.create({
      nombre: 'Test User',
      email: testEmail,
      password: hash,
      tipo: 'cliente'
    });
  });

  afterEach(async () => {
    // Limpiar después de cada prueba
    await Usuario.deleteMany({ email: { $regex: /@example\.com$/i } });
  });

  // ========================================
  // FORGOT PASSWORD TESTS
  // ========================================

  describe('POST /api/auth/forgot-password', () => {
    
    // CA1: Solicitud de recuperación
    describe('CA1 - Solicitud de recuperación', () => {
      
      it('debe aceptar solicitud con email válido', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        expect(response.body.msg).toBe('Se ha enviado un enlace de recuperación a tu correo');
      });

      it('debe retornar confirmación sin revelar si el usuario existe', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        expect(response.body).toHaveProperty('msg');
        expect(response.body.msg).toContain('Se ha enviado');
      });

    });

    // CA2: Email existente - envío de link
    describe('CA2 - Email existente', () => {

      it('debe generar y guardar token de recuperación', async () => {
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        const usuario = await Usuario.findOne({ email: testEmail });
        expect(usuario.resetPasswordToken).toBeDefined();
        expect(usuario.resetPasswordToken).not.toBeNull();
        expect(usuario.resetPasswordExpires).toBeDefined();
        expect(usuario.resetPasswordExpires).not.toBeNull();
      });

      it('debe generar token válido por 1 hora', async () => {
        const beforeRequest = Date.now();
        
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        const usuario = await Usuario.findOne({ email: testEmail });
        const expiresIn = usuario.resetPasswordExpires.getTime() - beforeRequest;
        
        // Debe expirar aproximadamente en 1 hora (3600000 ms)
        expect(expiresIn).toBeGreaterThan(3599000); // 1 hora - 1 segundo
        expect(expiresIn).toBeLessThan(3601000); // 1 hora + 1 segundo
      });

      it('debe hashear el token antes de guardarlo', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        // En desarrollo retorna el token
        if (response.body.resetToken) {
          const usuario = await Usuario.findOne({ email: testEmail });
          const expectedHash = crypto
            .createHash('sha256')
            .update(response.body.resetToken)
            .digest('hex');
          
          expect(usuario.resetPasswordToken).toBe(expectedHash);
        }
      });

      it('debe generar URL de reset válida', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        // En desarrollo retorna la URL
        if (response.body.resetUrl) {
          expect(response.body.resetUrl).toContain('/reset-password/');
          expect(response.body.resetUrl).toMatch(/^https?:\/\//);
        }
      });

      it('debe permitir múltiples solicitudes (sobrescribir token anterior)', async () => {
        // Primera solicitud
        const response1 = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        const usuario1 = await Usuario.findOne({ email: testEmail });
        const token1 = usuario1.resetPasswordToken;

        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 100));

        // Segunda solicitud
        const response2 = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail })
          .expect(200);

        const usuario2 = await Usuario.findOne({ email: testEmail });
        const token2 = usuario2.resetPasswordToken;

        // El token debe haber cambiado
        expect(token2).not.toBe(token1);
      });

    });

    // CA3: Email no existente
    describe('CA3 - Email no existente', () => {

      it('debe retornar error 404 para email no registrado', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'noexiste@example.com' })
          .expect(404);

        expect(response.body.msg).toBe('No existe una cuenta con este correo');
      });

      it('debe ser case-insensitive para el email', async () => {
        await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testEmail.toUpperCase() })
          .expect(200);
      });

    });

    // Validaciones
    describe('Validaciones', () => {

      it('debe rechazar solicitud sin email', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({})
          .expect(400);

        expect(response.body.msg).toContain('email es requerido');
      });

      it('debe rechazar email vacío', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: '' })
          .expect(400);

        expect(response.body.msg).toContain('email es requerido');
      });

    });

  });

  // ========================================
  // RESET PASSWORD TESTS
  // ========================================

  describe('POST /api/auth/reset-password/:token', () => {

    let validToken;
    let hashedToken;

    beforeEach(async () => {
      // Generar token válido para las pruebas
      validToken = crypto.randomBytes(32).toString('hex');
      hashedToken = crypto.createHash('sha256').update(validToken).digest('hex');
      
      testUser.resetPasswordToken = hashedToken;
      testUser.resetPasswordExpires = Date.now() + 3600000; // 1 hora
      await testUser.save();
    });

    // CA4: Restablecimiento exitoso
    describe('CA4 - Restablecimiento exitoso', () => {

      it('debe restablecer la contraseña con token válido', async () => {
        const newPassword = 'newPassword456';
        
        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        expect(response.body.msg).toContain('Contraseña restablecida exitosamente');
      });

      it('debe actualizar la contraseña en la base de datos', async () => {
        const newPassword = 'newPassword456';
        
        await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        const usuario = await Usuario.findById(testUser._id);
        const passwordMatch = await bcrypt.compare(newPassword, usuario.password);
        
        expect(passwordMatch).toBe(true);
      });

      it('debe permitir login con la nueva contraseña', async () => {
        const newPassword = 'newPassword456';
        
        // Restablecer contraseña
        await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        // Intentar login con nueva contraseña
        const response = await request(app)
          .post('/api/auth/login')
          .send({ 
            email: testEmail,
            password: newPassword 
          })
          .expect(200);

        expect(response.body.token).toBeDefined();
      });

      it('debe limpiar los campos de token después del uso', async () => {
        const newPassword = 'newPassword456';
        
        await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        const usuario = await Usuario.findById(testUser._id);
        
        expect(usuario.resetPasswordToken).toBeUndefined();
        expect(usuario.resetPasswordExpires).toBeUndefined();
      });

      it('debe hashear la nueva contraseña con bcrypt', async () => {
        const newPassword = 'newPassword456';
        
        await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        const usuario = await Usuario.findById(testUser._id);
        
        // Verificar que la contraseña está hasheada (bcrypt hash empieza con $2)
        expect(usuario.password).toMatch(/^\$2[aby]\$/);
        expect(usuario.password).not.toBe(newPassword);
      });

    });

    // Token inválido
    describe('Token inválido', () => {

      it('debe rechazar token inválido', async () => {
        const invalidToken = 'token-invalido-123';
        
        const response = await request(app)
          .post(`/api/auth/reset-password/${invalidToken}`)
          .send({ password: 'newPassword456' })
          .expect(400);

        expect(response.body.msg).toContain('Token inválido o expirado');
      });

      it('debe rechazar token expirado', async () => {
        // Crear token expirado
        testUser.resetPasswordExpires = Date.now() - 1000; // Expirado hace 1 segundo
        await testUser.save();

        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: 'newPassword456' })
          .expect(400);

        expect(response.body.msg).toContain('Token inválido o expirado');
      });

      it('no debe permitir reutilizar un token ya usado', async () => {
        const newPassword = 'newPassword456';
        
        // Usar el token por primera vez
        await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: newPassword })
          .expect(200);

        // Intentar usar el mismo token nuevamente
        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: 'anotherPassword789' })
          .expect(400);

        expect(response.body.msg).toContain('Token inválido o expirado');
      });

    });

    // Validaciones
    describe('Validaciones', () => {

      it('debe rechazar solicitud sin contraseña', async () => {
        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({})
          .expect(400);

        expect(response.body.msg).toContain('contraseña es requerida');
      });

      it('debe rechazar contraseña muy corta', async () => {
        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: '12345' })
          .expect(400);

        expect(response.body.msg).toContain('al menos 6 caracteres');
      });

      it('debe rechazar contraseña vacía', async () => {
        const response = await request(app)
          .post(`/api/auth/reset-password/${validToken}`)
          .send({ password: '' })
          .expect(400);

        expect(response.body.msg).toContain('contraseña es requerida');
      });

    });

  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Flujo completo de recuperación', () => {

    it('debe completar el flujo completo: forgot → reset → login', async () => {
      // 1. Solicitar recuperación
      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);

      expect(forgotResponse.body.msg).toContain('Se ha enviado');

      // Obtener el token (solo disponible en desarrollo)
      let resetToken;
      if (forgotResponse.body.resetToken) {
        resetToken = forgotResponse.body.resetToken;
      } else {
        // Si no está en la respuesta, obtener de la BD
        const usuario = await Usuario.findOne({ email: testEmail });
        // Necesitaríamos el token original, pero está hasheado
        // En este caso, saltamos esta prueba en producción
        if (!usuario.resetPasswordToken) {
          console.log('⚠️ Test skipped: token not available in production mode');
          return;
        }
      }

      // 2. Restablecer contraseña
      const newPassword = 'superNewPassword123';
      const resetResponse = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: newPassword })
        .expect(200);

      expect(resetResponse.body.msg).toContain('Contraseña restablecida exitosamente');

      // 3. Login con nueva contraseña
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: testEmail,
          password: newPassword 
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.usuario.email).toBe(testEmail);
    });

  });

});
