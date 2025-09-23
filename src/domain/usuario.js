class Usuario {
  constructor(id, correo, password, rol, estado, nombre, app, apm, telefono, reset_code, reset_expires) {
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
