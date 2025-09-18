const express = require('express');
const router = express.Router();
const Salon = require('../models/Salon');

// Consultar salones por hotel y filtros
router.get('/', async (req, res) => {
  const { hotel, capacidad, equipamiento, disponible } = req.query;
  const filtro = {};
  if (hotel) filtro.hotel = hotel;
  if (capacidad) filtro.capacidad = capacidad;
  if (equipamiento) filtro.equipamiento = equipamiento;
  if (disponible) filtro.disponible = disponible;
  const salones = await Salon.find(filtro);
  res.json(salones);
});

// Crear salón
router.post('/', async (req, res) => {
  const salon = new Salon(req.body);
  await salon.save();
  res.status(201).json(salon);
});

module.exports = router;