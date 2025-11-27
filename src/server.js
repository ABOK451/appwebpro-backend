const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const cors = require("cors");

const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");
const productosRoutes = require("./interfaces/routes/productoRoutes");
const invetarioRoutes = require("./interfaces/routes/inventarioRoutes");
const reporteRoutes = require("./interfaces/routes/reporteRoutes");
const categoriaRoutes = require("./interfaces/routes/categoriaRoutes");
const errorResponse = require('./helpers/errorResponse');

require("dotenv").config();

const app = express();

/* -------------------- JSON seguro -------------------- */
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) JSON.parse(buf.toString(encoding || 'utf8'));
    } catch (e) {
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

app.use(express.urlencoded({ extended: true }));


/* *******************************************************
   🚀 CORS CONFIG EXACTAMENTE COMO LA PEDISTE
   Compatible con Vercel, Render y redes agresivas
******************************************************** */
const allowedOrigins = [
  "https://inventario-xi-nine.vercel.app"
];

app.use((req, res, next) => {
  console.log("----- PRE-FLIGHT / REQUEST -----");
  console.log("Método:", req.method);
  console.log("Origin:", req.headers.origin);
  console.log("Headers:", req.headers);
  next();
});


app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // para Postman

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS bloqueado por origen no permitido: " + origin));
    }
  },
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

/* *******************************************************
   🚀 FIX DURO PARA RENDER + CLOUDFLARE
   Forzar respuesta OPTIONS ANTES de las rutas
******************************************************** */
app.options("*", (req, res) => {
  console.log("[FORZANDO PRE-FLIGHT OPTIONS]");
  res.setHeader("Access-Control-Allow-Origin", "https://inventario-xi-nine.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(204).send();
});


// MUY IMPORTANTE: responder OPTIONS

// Bypass ngrok warning (si tu frontend usa ngrok en pruebas)
app.use((req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});

/* -------------------- Swagger -------------------- */
const swaggerUsuarios = YAML.load("./src/config/OpenApi/swagger.yaml");
const swaggerProductos = YAML.load("./src/config/OpenApi/swagger-productos.yaml");
const swaggerBitacora = YAML.load("./src/config/OpenApi/swagger-bitacora.yaml");
const swaggerReporte = YAML.load("./src/config/OpenApi/swagger-reporte.yaml");

const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "API Completa", version: "1.0.0" },
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
      ...(swaggerReporte.components.securitySchemes || {})
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

/* -------------------- Rutas -------------------- */
app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);
app.use("/", productosRoutes);
app.use("/", invetarioRoutes);
app.use("/", reporteRoutes);
app.use("/", categoriaRoutes);

/* -------------------- Servidor -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor HTTP corriendo en http://localhost:${PORT}`);
});
