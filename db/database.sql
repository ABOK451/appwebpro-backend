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


