CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,              -- Identificador único
    correo VARCHAR(150) UNIQUE NOT NULL,-- Correo electrónico (único)
    password VARCHAR(255) NOT NULL,     -- Contraseña (hash, no en texto plano)
    rol VARCHAR(50) NOT NULL,           -- Rol del usuario (admin, usuario, etc.)
    estado VARCHAR(20) DEFAULT 'activo',-- Estado del usuario (activo, inactivo, bloqueado)
    nombre VARCHAR(100) NOT NULL,       -- Nombre(s)
    app VARCHAR(100) NOT NULL,          -- Apellido paterno
    apm VARCHAR(100),                   -- Apellido materno
    telefono VARCHAR(20)                -- Teléfono
);

CREATE TABLE usuario_login (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    reset_code VARCHAR(10),
    reset_expires TIMESTAMP,
    failed_attempts INT DEFAULT 0,
    blocked_until TIMESTAMP NULL,
    ultimo_login TIMESTAMP
);

ALTER TABLE usuario_login
ADD COLUMN latitud DECIMAL(9,6),
ADD COLUMN longitud DECIMAL(9,6);

ALTER TABLE usuario_login
ADD COLUMN token VARCHAR(500),
ADD COLUMN token_expires TIMESTAMP;
ALTER TABLE usuario_login
ADD COLUMN sesion_activa BOOLEAN DEFAULT FALSE, -- indica si la sesión sigue abierta
ADD COLUMN inicio_sesion TIMESTAMP,             -- momento en que arrancó
ADD COLUMN fin_sesion TIMESTAMP;                -- momento en que se cerró


CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  cantidad INT NOT NULL,
  stock INT DEFAULT 0,
  precio DECIMAL(10,2) NOT NULL,
  proveedor VARCHAR(100),
  id_categoria INT REFERENCES categorias(id) ON DELETE SET NULL,
  imagen VARCHAR(255),
  fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bitacora (
  id SERIAL PRIMARY KEY,
  codigo_producto VARCHAR(50) NOT NULL REFERENCES productos(codigo) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(20) NOT NULL, -- 'entrada' o 'salida'
  cantidad INT NOT NULL,
  descripcion TEXT,
  id_usuario INT, -- opcional
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO categorias (nombre) VALUES
('Ropa'),
('Calzado'),
('Accesorios'),
('Electrónica'),
('Hogar'),
('Belleza'),
('Deportes'),
('Juguetes'),
('Papelería'),
('Alimentos'),
('Herramientas'),
('Muebles'),
('Limpieza'),
('Oficina'),
('Otros');





