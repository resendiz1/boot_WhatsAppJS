const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const {Client, LocalAuth, List} = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { title, electron } = require('process');
const db = require('./bd');

require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`),
  ignored: [
    `${__dirname}/mensajes.db`,
    `${__dirname}/node_modules/**/*`,
    `${__dirname}/.wwebjs_auth/**/*`   // ← así no recargará por cambios de sesión
  ]
});





let win;



function createQRWindow(){
    if(win) return; //ayuda a que no se habra mas de una ventana


    win = new BrowserWindow({
        width: 900,
        height: 1000,
        webPreferences:{
            preload: path.join(__dirname, 'renderer.js'),
            contextIsolation:false,
            nodeIntegration: true,
        },

    });


    win.on('closed', () => {
        win = null;
    });

    win.loadFile('index.html')
}




//session persistente
const client = new Client({
    authStrategy: new LocalAuth()
});


app.whenReady().then(()=>{
    client.initialize();
    createQRWindow();
});




process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ Unhandled promise rejection:', reason);
});




client.on('qr', qr => {

    console.log('qr recibido')

    QRCode.toDataURL(qr, (err, src) =>{
        if(win){
            win.webContents.send('qr', src);
            win.webContents.send('show-qr')
        }
    });
});



client.on('ready', () =>{
    console.log('WhatsApp listo')
    if(win) win.webContents.send('hide-qr');
});


client.on('disconnected', () =>{

    console.log('Desconectado')
    client.initialize();

});


// Esto responde con un menu interactivo
// Responder al mensaje "menu" con una lista interactiva
// client.on('message', async message => {

//   if (message.body.toLowerCase() === 'menu') {
//     const list = new List(
//       'Elige una opción del menú:',
//       'Ver opciones',
//       [
//         {
//           title: 'Servicios',
//           rows: [
//             { id: 'citas', title: '📅 Agendar cita', description: 'Reserva una consulta' },
//             { id: 'contacto', title: '📞 Contacto', description: 'Habla con un agente' },
//           ],
//         },
//         {
//           title: 'Otra información',
//           rows: [
//             { id: 'info', title: 'ℹ️ Sobre nosotros', description: 'Conoce quiénes somos' },
//           ],
//         },
//       ],
//       'Menú Principal',
//       'Selecciona una opción'
//     );

//     await client.sendMessage(message.from, list);
//   }

//   // Manejo de respuestas del menú
//   if (message.body === '📞 Contacto') {
//     await message.reply('Puedes contactarnos al 555-123-4567.');
//   } else if (message.body === '📅 Agendar cita') {
//     await message.reply('Para agendar una cita, por favor visita nuestro sitio web.');
//   } else if (message.body === 'ℹ️ Sobre nosotros') {
//     await message.reply('Somos una empresa dedicada a brindar soluciones tecnológicas.');
//   }
// });
// Esto responde con un menu interSctivo
// Responder al mensaje "menu" con una lista interactiva



//recibiendo los datos desde el renderer
ipcMain.on('guardar-mensaje', (event, data) =>{

    const stmt = db.prepare('INSERT INTO mensajes (mensaje, respuesta) VALUES (?,?)');
    stmt.run(data.mensaje, data.respuesta);

})


//vconsultando los mensaje de la bd

ipcMain.handle('obtener-mensajes', async ()=>{
    return new Promise((resolve, reject) =>{
        db.all("SELECT*FROM mensajes ORDER BY id DESC", [], (err,rows)=>{
            if(err){
                console.error('Error al cargar mensajes');
                reject([]);
            }
            else{
                resolve(rows)
            }
        })
    })
})


//eliminando mensaje
ipcMain.on('eliminar-mensaje', (event, id) => {
  db.run('DELETE FROM mensajes WHERE id = ?', id, (err) => {
    if (err) {
      console.error('Error al eliminar mensaje:', err.message);
    } else {
      console.log('🗑️ Mensaje eliminado con ID:', id);
    event.reply('mensaje-eliminado'); // Notifica al renderer para que recargue
    }
  });
});



//mensajes de confirmacion
ipcMain.handle('confirmar-eliminacion', async () => {
    const resultado = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancelar', 'Eliminar'],
        defaultId: 1,
        cancelId: 0,
        title: 'Confirmar',
        message: '¿Deseas eliminar este mensaje?'
    })
    return resultado.response === 1; // true si seleccionó "Eliminar"
})