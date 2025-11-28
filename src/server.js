const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const fs = require("fs");
const http = require("http");
const cors = require("cors");

const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");
const productosRoutes = require("./interfaces/routes/productoRoutes");
const inventarioRoutes = require("./interfaces/routes/inventarioRoutes");
const reporteRoutes = require("./interfaces/routes/reporteRoutes");
const categoriaRoutes = require("./interfaces/routes/categoriaRoutes");

const errorResponse = require('./helpers/errorResponse');
require("dotenv").config();

const app = express();

/* ============================================================
   1. PARSERS Y VALIDACIÓN JSON
   ============================================================ */

app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    try {
      if (buf && buf.length) JSON.parse(buf.toString());
    } catch {
      req.invalidJson = true;
    }
  }
}));

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

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ============================================================
   2. LOGS
   ============================================================ */
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log("[HEADERS]", req.headers);
  next();
});

/* ============================================================
   3. CORS — COMPATIBLE EN REDES CORPORATIVAS
   ============================================================ */

const allowedOrigins = [
  "https://inventario-xi-nine.vercel.app",
  "https://appwebpro-backend.onrender.com",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / cURL
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn("⚠ CORS bloqueado para origen:", origin);
    return callback(new Error("No permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Evita bloqueos en redes corporativas que usan proxy/ngrok
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

/* ============================================================
   4. SWAGGER
   ============================================================ */

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
      ...(swaggerReporte.components.schemas || {})
    }
  }
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/* ============================================================
   5. RUTAS
   ============================================================ */

app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);
app.use("/", productosRoutes);
app.use("/", inventarioRoutes);
app.use("/", reporteRoutes);
app.use("/", categoriaRoutes);

/* ============================================================
   6. SERVIDOR HTTP
   ============================================================ */

const PORT = process.env.PORT || 3000;

http.createServer(app).listen(PORT, () => {
  console.log("=============================================");
  console.log(`🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
  console.log("🌐 CORS permitido para:", allowedOrigins);
  console.log("=============================================");
});
