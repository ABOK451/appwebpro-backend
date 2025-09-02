const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const pingRoutes = require("./interfaces/routes/pingRoutes");
const usuarioRoutes = require('./interfaces/routes/usuarioRoutes');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const swaggerDocument = YAML.load("./src/config/swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/", pingRoutes);        
app.use("/", usuarioRoutes);     

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}/docs`);
});
