// src/server.js
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const selfsigned = require("selfsigned");
const fs = require("fs");
const https = require("https");
const cors = require("cors");

// Rutas
const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");

require("dotenv").config();

const app = express();

// CORS configurado para desarrollo (Angular, React, etc.)
app.use(cors({
  origin: "*", // Permite cualquier origen, en producción cambiar al frontend real
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parseo de JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
const swaggerDocument = YAML.load("./src/config/OpenApi/swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas principales
app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);

// Generar certificado autofirmado si no existe
const certDir = "src/certs";
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

const keyPath = `${certDir}/server.key`;
const certPath = `${certDir}/server.crt`;

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const options = { keySize: 2048, days: 365, algorithm: 'sha256' };
  const pems = selfsigned.generate(attrs, options);
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
}

// Opciones HTTPS
const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor HTTPS
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
});
