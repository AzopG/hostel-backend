const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

exports.register = async (req, res) => {
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

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ msg: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Validar tipos permitidos
    const tiposPermitidos = ['cliente', 'empresa', 'admin_hotel', 'admin_central'];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({ 
        msg: 'Tipo de usuario inválido',
        tiposPermitidos 
      });
    }

    // Validar que si es tipo empresa, tenga el campo empresa
    if (tipo === 'empresa' && !empresa) {
      return res.status(400).json({ msg: 'El campo empresa es requerido para usuarios tipo empresa' });
    }

    // Verificar si el usuario ya existe
    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese email' });
    }

    // Hash de la contraseña
    const hash = await bcrypt.hash(password, 12);

    // Crear usuario
    const usuario = new Usuario({ 
      nombre, 
      email: email.toLowerCase(), 
      password: hash, 
      tipo, 
      empresa: tipo === 'empresa' ? empresa : undefined
    });

    await usuario.save();

    // No devolver la contraseña
    const usuarioResponse = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.status(201).json({ 
      msg: 'Usuario registrado exitosamente',
      usuario: usuarioResponse 
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ msg: 'Error interno del servidor', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        msg: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });
    if (!usuario) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    // Verificar contraseña
    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) {
      return res.status(401).json({ msg: 'Credenciales incorrectas' });
    }

    // Generar token JWT
    const payload = {
      id: usuario._id,
      tipo: usuario.tipo,
      email: usuario.email
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Datos del usuario sin contraseña
    const usuarioData = {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa: usuario.empresa
    };

    res.json({ 
      msg: 'Login exitoso',
      token, 
      usuario: usuarioData,
      expiresIn: '24h'
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ msg: 'Error interno del servidor', error: err.message });
  }
};

// Verificar token y obtener datos del usuario
exports.verifyToken = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json({ usuario });
  } catch (err) {
    console.error('Error verificando token:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.usuario.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        msg: 'Contraseña actual y nueva contraseña son requeridas' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        msg: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const valido = await bcrypt.compare(currentPassword, usuario.password);
    if (!valido) {
      return res.status(401).json({ msg: 'Contraseña actual incorrecta' });
    }

    // Hash nueva contraseña
    const hash = await bcrypt.hash(newPassword, 12);
    usuario.password = hash;
    await usuario.save();

    res.json({ msg: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};
