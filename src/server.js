const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const selfsigned = require("selfsigned");
const fs = require("fs");
const https = require("https");
const http = require("http");
const cors = require("cors");

const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");
const productosRoutes = require("./interfaces/routes/productoRoutes");
const invetarioRoutes = require("./interfaces/routes/inventarioRoutes");
const reporteRoutes = require("./interfaces/routes/reporteRoutes");
const errorResponse = require('./helpers/errorResponse'); 
require("dotenv").config();

const app = express();

// Middleware para JSON
// Middleware para JSON
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        JSON.parse(buf.toString(encoding || 'utf8'));
      }
    } catch (e) {
      // Marcamos el request con un flag para manejarlo después
      req.invalidJson = true;
    }
  }
}));

// Middleware para detectar JSON inválido
app.use((req, res, next) => {
  if (req.invalidJson) {
    return res.status(400).json(errorResponse(
      "JSON_INVALIDO",
      "El cuerpo de la petición no es un JSON válido",
      null,
      1
    ));
  }
  next();
});


app.use(express.urlencoded({ extended: true }));

// Logs de headers
app.use((req, res, next) => {
  console.log("[GLOBAL HEADERS]", req.headers);
  next();
});

// CORS
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

// Swagger
const swaggerUsuarios = YAML.load("./src/config/OpenApi/swagger.yaml");
const swaggerProductos = YAML.load("./src/config/OpenApi/swagger-productos.yaml");
const swaggerBitacora = YAML.load("./src/config/OpenApi/swagger-bitacora.yaml");
const swaggerReporte = YAML.load("./src/config/OpenApi/swagger-reporte.yaml");

const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "API Completa",
        version: "1.0.0"
    },
    servers: swaggerUsuarios.servers || [],
    paths: {
        ...swaggerUsuarios.paths,
        ...swaggerProductos.paths,
        ...swaggerBitacora.paths,
        ...swaggerReporte.paths
    },
    components: {
        securitySchemes: {
            ...(swaggerUsuarios.components.securitySchemes || {}),
            ...(swaggerProductos.components.securitySchemes || {}),
            ...(swaggerBitacora.components.securitySchemes || {}),
            ...(swaggerReporte.components.securitySchemes || {}),
        },
        schemas: {
            ...(swaggerUsuarios.components.schemas || {}),
            ...(swaggerProductos.components.schemas || {}),
            ...(swaggerBitacora.components.schemas || {}),
            ...(swaggerReporte.components.schemas || {}),
        }
    }
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas
app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);
app.use("/", productosRoutes);
app.use("/", invetarioRoutes);
app.use("/", reporteRoutes);


// Certificados
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

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

// Puerto HTTPS
const PORT = process.env.PORT || 3000;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
});

// Puerto HTTP para pruebas locales
const PORT_HTTP = 3001;
http.createServer(app).listen(PORT_HTTP, () => {
  console.log(`Servidor HTTP corriendo en http://localhost:${PORT_HTTP}`);
});
