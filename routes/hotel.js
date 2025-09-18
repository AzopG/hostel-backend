const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// Obtener todos los hoteles
router.get('/', async (req, res) => {
  const hoteles = await Hotel.find();
  res.json(hoteles);
});

// Crear hotel
router.post('/', async (req, res) => {
  const hotel = new Hotel(req.body);
  await hotel.save();
  res.status(201).json(hotel);
});

// ...más endpoints según necesidades

module.exports = router;