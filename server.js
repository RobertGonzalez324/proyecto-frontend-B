const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;

// 1. Middlewares principales
app.use(express.json());
app.use(express.static('public')); // Permite servir los archivos HTML, CSS y JS desde la carpeta 'public'

// 2. Configuración de la conexión a MongoDB
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'sistema_encuestas'; // Asegúrate de que coincida con el nombre de tu base de datos

async function iniciarServidor() {
  try {
    // Conectar al cliente de MongoDB
    await client.connect();
    console.log('Conectado exitosamente a la base de datos de MongoDB');
    
    const db = client.db(dbName);

    // 3. Importar y montar las rutas del backend, inyectando la instancia de la base de datos
    const authRoutes = require('./routes/auth')(db);
    const encuestasRoutes = require('./routes/encuestas')(db);

    app.use('/api/auth', authRoutes);
    app.use('/api/encuestas', encuestasRoutes);

    // 4. Iniciar el servidor Express en el puerto 3000
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Error al iniciar el servidor y conectar con la base de datos:', error);
  }
}

iniciarServidor();