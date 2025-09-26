const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const selfsigned = require("selfsigned");
const fs = require("fs");
const https = require("https");
const cors = require("cors");

const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require("./interfaces/routes/usuarioRoutes");
const recuperarRoutes = require("./interfaces/routes/recuperarRoutes");
const loginRoutes = require("./interfaces/routes/loginRoutes");
const rolesRoutes = require("./interfaces/routes/rolesRoutes");
const errorResponse = require('./helpers/errorResponse'); 
require("dotenv").config();

const app = express();

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(200).json(errorResponse(
        "JSON_INVALIDO",
        "El cuerpo de la petición no es un JSON válido",
        e.message,
        1
      ));
      throw new Error("JSON inválido"); 
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("[GLOBAL HEADERS]", req.headers);
  next();
});



app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerDocument = YAML.load("./src/config/OpenApi/swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/", pingRoutes);
app.use("/", usuarioRoutes);
app.use("/", recuperarRoutes);
app.use("/", loginRoutes);
app.use("/", rolesRoutes);

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

const PORT = process.env.PORT || 3000;

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
});
