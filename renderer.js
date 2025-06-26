const {ipcRenderer} = require('electron');


ipcRenderer.on('qr', (event, qrDataUrl)=>{
    const qrImg = document.getElementById('qr');
    qrImg.src = qrDataUrl;
    qrImg.style.display = 'block';
});





ipcRenderer.on('show-qr', ()=>{
    document.getElementById('qr').style.display='block';
    document.getElementById('qr-title').style.display='block';
})



ipcRenderer.on('hide-qr', ()=>{
    document.getElementById('qr').style.display='none';
    document.getElementById('qr-title').style.display='none';
})


// mandar los datos del formulario a la bd
const form = document.getElementById('formulario');
form.addEventListener('submit', (e) => {
    e.preventDefault();



    const mensaje = document.getElementById('mensaje').value.trim();
    const respuesta = document.getElementById('respuesta').value.trim();



    if(mensaje && respuesta){

        ipcRenderer.send('guardar-mensaje', {mensaje, respuesta});

        document.getElementById('mensaje').value = "";
        document.getElementById('respuesta').value = "";

        cargarMensajes();

    }


})


//obteniendo los atos de la bd

async function cargarMensajes(){
    
    const mensajes = await ipcRenderer.invoke('obtener-mensajes');
    const tbody = document.getElementById('tabla-mensajes')
    
    tbody.innerHTML = "";

    //obteniendo los mensajes
    mensajes.forEach((msg) => {
        const fila = document.createElement('tr');
        fila.innerHTML= `<td>${msg.id}</td>
            <td>${msg.mensaje}</td>
            <td>${msg.respuesta}</td>
            <td><button class="btn btn-danger btn-sm" onclick="eliminarMensaje(${msg.id})">Eliminar</button></td>`;

    tbody.appendChild(fila);

    if(mensajes ===null){
          tbody.innerHTML = "<h1> No hay mensajes </h1>";
    }

    });

}

async function eliminarMensaje(id){
  const confirmar = await ipcRenderer.invoke('confirmar-eliminacion');
  if (!confirmar) return;
  ipcRenderer.send('eliminar-mensaje', id);

    
    
}
ipcRenderer.on('mensaje-eliminado', ()=>{

    cargarMensajes();

})


//se llama a la funcion para que los datos carguen con el formulario
window.addEventListener('DOMContentLoaded', cargarMensajes);