class Usuario {
  constructor(id, correo, password, rol, estado, nombre, app, apm, telefono) {
    this.id = id;          
    this.correo = correo; 
    this.password = password; 
    this.rol = rol;        
    this.estado = estado;  
    this.nombre = nombre;  
    this.app = app;        
    this.apm = apm;       
    this.telefono = telefono;
  }
}

module.exports = Usuario;
