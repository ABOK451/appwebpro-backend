const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // tu gmail
    pass: process.env.EMAIL_PASS    // la contraseña de aplicación de 16 caracteres
  }
});

module.exports = transporter;
