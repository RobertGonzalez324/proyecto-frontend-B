const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // LOGIN / AUTORREGISTRO INTELIGENTE (POST /api/auth/login)
  router.post('/login', async (req, res) => {
    try {
      let { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
      }

      // Estandarizamos el correo a minúsculas y sin espacios
      email = email.trim().toLowerCase();
      const coleccionUsuarios = db.collection('usuarios');

      // 1. Buscamos si el correo ya está registrado en la base de datos
      let usuario = await coleccionUsuarios.findOne({ email });

      if (usuario) {
        // ESCENARIO A: El usuario ya existe. Validamos su contraseña estrictamente.
        if (String(usuario.password) !== String(password)) {
          return res.status(401).json({ error: 'Contraseña incorrecta para este correo registrado.' });
        }
      } else {
        // ESCENARIO B: El correo NO existe. Lo registramos automáticamente como cliente.
        // (Excepto si el correo incluye 'admin', para mantener tu cuenta principal con privilegios)
        const esAdmin = email.includes('admin') || email.includes('gabriel');
        
        const nuevoUsuario = {
          nombre: email.split('@')[0], // Toma la parte antes del '@' como nombre provisional
          email: email,
          password: password,
          rol: esAdmin ? 'admin' : 'cliente'
        };

        await coleccionUsuarios.insertOne(nuevoUsuario);
        usuario = nuevoUsuario;
        console.log(`✨ Nuevo usuario registrado automáticamente (${usuario.rol}):`, email);
      }

      // 2. Si todo es correcto, devolvemos los datos y el rol para la redirección
      res.status(200).json({
        mensaje: 'Login exitoso',
        usuario: {
          nombre: usuario.nombre || 'Usuario',
          email: usuario.email,
          rol: usuario.rol || 'cliente'
        }
      });

    } catch (error) {
      console.error('Error crítico en el login:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};