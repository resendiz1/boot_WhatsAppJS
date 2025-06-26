const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crea o abre la base de datos
const db = new sqlite3.Database(path.join(__dirname, 'mensajes.db'), (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos mensajes.db');
  }
});



// Crear la tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS mensajes (id INTEGER PRIMARY KEY AUTOINCREMENT,
    mensaje TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
`, (err) => {
  if (err) {
    console.error('Error al crear tabla:', err.message);
  }
});



module.exports = db;
