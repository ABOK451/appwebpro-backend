class Usuario {
  constructor(id, nombre, email, password, rol) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.rol = rol;
  }
}

module.exports = Usuario;
