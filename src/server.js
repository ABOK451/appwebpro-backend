const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const pingRoutes = require("./interfaces/routes/pingRoutes");

const app = express();

// Swagger
const swaggerDocument = YAML.load("./src/config/swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas
app.use("/", pingRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}/docs`);
});
