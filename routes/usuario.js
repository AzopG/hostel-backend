const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// Consultar usuarios por tipo
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const filtro = {};
    if (tipo) filtro.tipo = tipo;
    
    // Excluimos password por seguridad pero incluimos lastLogin
    const usuarios = await Usuario.find(filtro)
      .select('-password')
      .sort({ createdAt: -1 }); // Ordenamos del más reciente al más antiguo
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      msg: 'Error interno del servidor al obtener usuarios',
      error: error.message 
    });
  }
});

// Crear usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password, tipo, empresa } = req.body;
    
    // Validaciones básicas
    if (!nombre || !email || !password || !tipo) {
      return res.status(400).json({ 
        msg: 'Todos los campos son requeridos',
        requiredFields: ['nombre', 'email', 'password', 'tipo']
      });
    }

    // Validar email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Formato de email inválido' });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
    if (usuarioExistente) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese email' });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    // Crear usuario
    const usuario = new Usuario({
      nombre,
      email: email.toLowerCase(),
      password: hash,
      tipo,
      empresa: tipo === 'empresa' || tipo === 'admin_hotel' ? empresa : undefined
    });

    await usuario.save();

    // No devolver la contraseña en la respuesta
    const usuarioResponse = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.status(201).json({
      msg: 'Usuario creado exitosamente',
      usuario: usuarioResponse
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ 
      msg: 'Error interno del servidor al crear usuario',
      error: error.message 
    });
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('-password');
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar usuario por ID (con cambio de contraseña si se envía nuevaPassword)
const bcrypt = require('bcrypt');
router.put('/:id', async (req, res) => {
  try {
    // Validar que el usuario existe
    const usuarioExistente = await Usuario.findById(req.params.id);
    if (!usuarioExistente) return res.status(404).json({ 
      success: false,
      msg: 'Usuario no encontrado' 
    });

    const updateData = { ...req.body };
    
    // Si se cambia el email, verificar que no exista ya
    if (updateData.email && updateData.email !== usuarioExistente.email) {
      const emailExiste = await Usuario.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (emailExiste) {
        return res.status(400).json({ 
          success: false,
          msg: 'El email ya está en uso por otro usuario' 
        });
      }
      
      updateData.email = updateData.email.toLowerCase();
    }
    
    // Manejar cambio de contraseña si se proporciona
    if (updateData.nuevaPassword && updateData.nuevaPassword.trim() !== '') {
      if (updateData.nuevaPassword.length < 6) {
        return res.status(400).json({
          success: false,
          msg: 'La contraseña debe tener al menos 6 caracteres'
        });
      }
      
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.nuevaPassword, salt);
      delete updateData.nuevaPassword;
    }
    
    // Actualizar fecha de modificación
    updateData.updatedAt = new Date();
    
    // Actualizar el usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      msg: 'Usuario actualizado correctamente',
      usuario: usuarioActualizado
    });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Error al actualizar usuario',
      error: err.message 
    });
  }
});

// Eliminar usuario por ID
router.delete('/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        msg: 'Usuario no encontrado' 
      });
    }
    
    // Guardar datos para la respuesta antes de eliminar
    const usuarioInfo = {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo
    };
    
    // Eliminar el usuario
    await Usuario.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      msg: 'Usuario eliminado correctamente',
      usuario: usuarioInfo
    });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Error al eliminar usuario',
      error: err.message
    });
  }
});

module.exports = router;