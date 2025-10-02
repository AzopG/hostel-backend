const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const authController = require('../controllers/authController');
const Usuario = require('../models/Usuario');

// Crear app de prueba
const app = express();
app.use(express.json());

// Configurar rutas para tests
app.post('/register', authController.register);
app.post('/login', authController.login);

describe('Auth Controller', () => {
  describe('POST /register', () => {
    it('debería registrar un nuevo usuario con datos válidos', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        tipo: 'cliente'
      };

      const response = await request(app)
        .post('/register')
        .send(userData);

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('mensaje', 'Registro exitoso');
  expect(response.body.usuario).toHaveProperty('email', userData.email);
  expect(response.body.usuario).not.toHaveProperty('password');
    });

    it('debería rechazar registro con email duplicado', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'duplicate@example.com',
        password: 'password123',
        tipo: 'cliente'
      };

      // Crear usuario inicial
      await request(app).post('/register').send(userData);

      // Intentar crear usuario duplicado
      const response = await request(app)
        .post('/register')
        .send(userData);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('msg', 'Ya existe un usuario con ese email');
    });

    it('debería rechazar registro con campos faltantes', async () => {
      const incompleteData = {
        nombre: 'Test User',
        email: 'test@example.com'
        // falta password y tipo
      };

      const response = await request(app)
        .post('/register')
        .send(incompleteData);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('msg', 'Todos los campos son requeridos');
    });

    it('debería rechazar email con formato inválido', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        tipo: 'cliente'
      };

      const response = await request(app)
        .post('/register')
        .send(userData);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('msg', 'Formato de email inválido');
    });

    it('debería rechazar contraseña muy corta', async () => {
      const userData = {
        nombre: 'Test User',
        email: 'test@example.com',
        password: '123',
        tipo: 'cliente'
      };

      const response = await request(app)
        .post('/register')
        .send(userData);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('msg', 'La contraseña debe tener al menos 6 caracteres');
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba
      await request(app)
        .post('/register')
        .send({
          nombre: 'Login Test User',
          email: 'login@example.com',
          password: 'password123',
          tipo: 'cliente'
        });
    });

    it('debería hacer login con credenciales válidas', async () => {
      const credentials = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/login')
        .send(credentials);

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('msg', 'Login exitoso');
  expect(response.body).toHaveProperty('token');
  expect(response.body).toHaveProperty('usuario');
  expect(response.body).toHaveProperty('expiresIn');
  expect(response.body.usuario).toHaveProperty('email', credentials.email);
    });

    it('debería rechazar login con email inexistente', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/login')
        .send(credentials);

  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('mensaje', 'Credenciales inválidas');
    });

    it('debería rechazar login con contraseña incorrecta', async () => {
      const credentials = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/login')
        .send(credentials);

  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('mensaje', 'Credenciales inválidas');
    });

    it('debería rechazar login con campos faltantes', async () => {
      const incompleteCredentials = {
        email: 'login@example.com'
        // falta password
      };

      const response = await request(app)
        .post('/login')
        .send(incompleteCredentials);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('msg', 'Email y contraseña son requeridos');
    });
  });
});