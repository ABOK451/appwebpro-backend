// config/email.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: true, // <-- para 465 debe ser true (SSL)
  auth: {
    user: process.env.BREVO_EMAIL,       // tu email verificado en Brevo
    pass: process.env.BREVO_SMTP_KEY     // la SMTP key generada en Brevo
  },
  // timeouts opcionales para evitar esperas eternas
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000
});

transporter.verify()
  .then(() => console.log("[email] SMTP conectado y listo (465)."))
  .catch(err => console.error("[email] Error al verificar SMTP (465):", err));

module.exports = transporter;
