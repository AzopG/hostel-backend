const Usuario = require('../models/Usuario');
const mongoose = require('mongoose');

describe('Usuario Model', () => {
  it('debería crear un usuario válido', async () => {
    const userData = {
      nombre: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
      tipo: 'cliente'
    };

    const usuario = new Usuario(userData);
    const savedUsuario = await usuario.save();

    expect(savedUsuario._id).toBeDefined();
    expect(savedUsuario.nombre).toBe(userData.nombre);
    expect(savedUsuario.email).toBe(userData.email);
    expect(savedUsuario.tipo).toBe(userData.tipo);
  });

  it('debería requerir campos obligatorios', async () => {
    const usuario = new Usuario({});

    let error;
    try {
      await usuario.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.nombre).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.tipo).toBeDefined();
  });

  it('debería validar tipos de usuario permitidos', async () => {
    const usuario = new Usuario({
      nombre: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      tipo: 'tipo_invalido'
    });

    let error;
    try {
      await usuario.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.tipo).toBeDefined();
  });

  it('debería mantener unicidad del email', async () => {
    const userData = {
      nombre: 'Test User',
      email: 'unique@example.com',
      password: 'password123',
      tipo: 'cliente'
    };

    // Limpiar la colección antes de probar duplicados
    await Usuario.deleteMany({});
    const usuarioPrimero = new Usuario(userData);
    await usuarioPrimero.save();
    const usuarioDuplicado = new Usuario(userData);
    let error;
    try {
      await usuarioDuplicado.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // Duplicate key error
  });

  it('debería permitir todos los tipos de usuario válidos', async () => {

    const tiposValidos = ['cliente', 'empresa', 'admin_hotel', 'admin_central'];

    for (let i = 0; i < tiposValidos.length; i++) {
      const tipo = tiposValidos[i];
      const usuarioData = {
        nombre: `User ${i}`,
        email: `user${i}@example.com`,
        password: 'password123',
        tipo: tipo
      };
      // Si el tipo es empresa, agrega el campo empresa
      if (tipo === 'empresa') {
        usuarioData.empresa = 'Empresa Test S.A.';
      }
      const usuario = new Usuario(usuarioData);
      const savedUsuario = await usuario.save();
      expect(savedUsuario.tipo).toBe(tipo);
    }
  });

  it('debería permitir campo empresa opcional', async () => {
    const usuario = new Usuario({
      nombre: 'Empresa User',
      email: 'empresa@example.com',
      password: 'password123',
      tipo: 'empresa',
      empresa: 'Mi Empresa S.A.'
    });

    const savedUsuario = await usuario.save();
    expect(savedUsuario.empresa).toBe('Mi Empresa S.A.');
  });
});