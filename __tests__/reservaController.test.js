const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const reservaController = require('../controllers/reservaController');
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Usuario = require('../models/Usuario');
const Hotel = require('../models/Hotel');

// Crear app de prueba
const app = express();
app.use(express.json());

app.post('/reservas', reservaController.crearReserva);
app.put('/reservas/:id/cancelar', reservaController.cancelarReserva);

describe('Reserva Controller', () => {
  let usuario, hotel, habitacion, salon;

  beforeEach(async () => {
    // Crear datos de prueba
    usuario = new Usuario({
      nombre: 'Test User',
      email: 'user@test.com',
      password: 'hashed_password',
      tipo: 'cliente'
    });
    await usuario.save();

    hotel = new Hotel({
      nombre: 'Hotel Test',
      ciudad: 'Test City',
      direccion: 'Test Address'
    });
    await hotel.save();

    habitacion = new Habitacion({
      numero: '101',
      tipo: 'simple',
      capacidad: 2,
      disponible: true,
      hotel: hotel._id
    });
    await habitacion.save();

    salon = new Salon({
      nombre: 'Salon Test',
      capacidad: 50,
      disponible: true,
      hotel: hotel._id
    });
    await salon.save();
  });

  describe('POST /reservas', () => {
    it('debería crear una reserva de habitación exitosamente', async () => {
      const reservaData = {
        usuario: usuario._id,
        hotel: hotel._id,
        habitacion: habitacion._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03')
      };

      const response = await request(app)
        .post('/reservas')
        .send(reservaData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('usuario', usuario._id.toString());
      expect(response.body).toHaveProperty('estado', 'confirmada');

      // Verificar que la habitación se marcó como no disponible
      const habitacionActualizada = await Habitacion.findById(habitacion._id);
      expect(habitacionActualizada.disponible).toBe(false);
    });

    it('debería crear una reserva de salón exitosamente', async () => {
      const reservaData = {
        usuario: usuario._id,
        hotel: hotel._id,
        salon: salon._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03'),
        asistentes: ['John Doe', 'Jane Smith']
      };

      const response = await request(app)
        .post('/reservas')
        .send(reservaData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('salon', salon._id.toString());
      expect(response.body.asistentes).toHaveLength(2);

      // Verificar que el salón se marcó como no disponible
      const salonActualizado = await Salon.findById(salon._id);
      expect(salonActualizado.disponible).toBe(false);
    });

    it('debería rechazar reserva con habitación no disponible', async () => {
      // Marcar habitación como no disponible
      habitacion.disponible = false;
      await habitacion.save();

      const reservaData = {
        usuario: usuario._id,
        hotel: hotel._id,
        habitacion: habitacion._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03')
      };

      const response = await request(app)
        .post('/reservas')
        .send(reservaData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg', 'Habitación no disponible');
    });

    it('debería rechazar reserva con salón no disponible', async () => {
      // Marcar salón como no disponible
      salon.disponible = false;
      await salon.save();

      const reservaData = {
        usuario: usuario._id,
        hotel: hotel._id,
        salon: salon._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03')
      };

      const response = await request(app)
        .post('/reservas')
        .send(reservaData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('msg', 'Salón no disponible');
    });
  });

  describe('PUT /reservas/:id/cancelar', () => {
    let reserva;

    beforeEach(async () => {
      // Crear reserva de prueba
      reserva = new Reserva({
        usuario: usuario._id,
        hotel: hotel._id,
        habitacion: habitacion._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03'),
        estado: 'confirmada'
      });
      await reserva.save();

      // Marcar habitación como no disponible (como si estuviera reservada)
      habitacion.disponible = false;
      await habitacion.save();
    });

    it('debería cancelar reserva y liberar habitación', async () => {
      const response = await request(app)
        .put(`/reservas/${reserva._id}/cancelar`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('msg', 'Reserva cancelada y recursos liberados');
      expect(response.body.reserva).toHaveProperty('estado', 'cancelada');

      // Verificar que la habitación se liberó
      const habitacionActualizada = await Habitacion.findById(habitacion._id);
      expect(habitacionActualizada.disponible).toBe(true);
    });

    it('debería cancelar reserva de salón y liberar recurso', async () => {
      // Crear reserva de salón
      const reservaSalon = new Reserva({
        usuario: usuario._id,
        hotel: hotel._id,
        salon: salon._id,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-01-03'),
        estado: 'confirmada'
      });
      await reservaSalon.save();

      // Marcar salón como no disponible
      salon.disponible = false;
      await salon.save();

      const response = await request(app)
        .put(`/reservas/${reservaSalon._id}/cancelar`);

      expect(response.status).toBe(200);

      // Verificar que el salón se liberó
      const salonActualizado = await Salon.findById(salon._id);
      expect(salonActualizado.disponible).toBe(true);
    });

    it('debería retornar 404 para reserva inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/reservas/${fakeId}/cancelar`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('msg', 'Reserva no encontrada');
    });
  });
});