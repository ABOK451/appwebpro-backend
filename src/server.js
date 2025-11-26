const express = require("express");
const cors = require("cors");
const errorResponse = require('./helpers/errorResponse');

const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");
const productosRoutes = require("./interfaces/routes/productoRoutes");
const invetarioRoutes = require("./interfaces/routes/inventarioRoutes");
const reporteRoutes = require("./interfaces/routes/reporteRoutes");
const categoriaRoutes = require("./interfaces/routes/categoriaRoutes");

require("dotenv").config();

const app = express();

/* -----------------------------------------------------
   JSON seguro (evita que un JSON inválido tumbe el server)
-------------------------------------------------------- */
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      if (buf && buf.length) JSON.parse(buf.toString(encoding || 'utf8'));
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

/* -----------------------------------------------------
   URL Encoded
-------------------------------------------------------- */
app.use(express.urlencoded({ extended: true }));

/* -----------------------------------------------------
   Logs globales de headers
-------------------------------------------------------- */
app.use((req, res, next) => {
  console.log("[GLOBAL HEADERS]", req.headers);
  next();
});

/* -----------------------------------------------------
   CORS UNIVERSAL
-------------------------------------------------------- */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.options("*", cors());

/* -----------------------------------------------------
   Rutas
-------------------------------------------------------- */
app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);
app.use("/", productosRoutes);
app.use("/", invetarioRoutes);
app.use("/", reporteRoutes);
app.use("/", categoriaRoutes);

/* -----------------------------------------------------
   Iniciar servidor
-------------------------------------------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor HTTP corriendo en http://localhost:${PORT}`);
});
