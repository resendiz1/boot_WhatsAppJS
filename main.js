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


//the magic is here
client.on('message', async message => {

    const mensaje = message.body.toLowerCase().trim();

    //consulta sql 
    const query = `SELECT respuesta FROM mensajes WHERE LOWER(mensaje) LIKE ? LIMIT 1`;

    db.get(query, [`%${mensaje}%`],(err, fila)=>{
        
        if(err){
            console.error('Error al consultar mensajes', err.message);
            return;
        }

        if(fila){
            client.sendMessage(message.from, fila.respuesta);
        }
        else{
            client.sendMessage(message.from, "");
        }

    })


});




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