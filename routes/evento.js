const express = require('express');
const router = express.Router();
const Evento = require('../models/Evento');

// Consultar eventos por hotel, empresa, fecha
router.get('/', async (req, res) => {
  const { hotel, empresa, fecha } = req.query;
  const filtro = {};
  if (hotel) filtro.hotel = hotel;
  if (empresa) filtro.empresa = empresa;
  if (fecha) filtro.fecha = fecha;
  const eventos = await Evento.find(filtro);
  res.json(eventos);
});

// Crear evento
router.post('/', async (req, res) => {
  const evento = new Evento(req.body);
  await evento.save();
  res.status(201).json(evento);
});

module.exports = router;