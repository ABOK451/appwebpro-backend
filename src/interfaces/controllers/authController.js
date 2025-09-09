const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const transporter = require("../../infrastructure/mailer"); 
const pool = require("../../infrastructure/db/pool"); 

// LOGIN: valida credenciales y envía OTP
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = result.rows[0];
    if (!usuario) return res.status(401).json({ error: "Credenciales inválidas" });

    // Validar password
    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });

    // Generar OTP (válido por 5 min)
    const otp = speakeasy.totp({
      secret: process.env.OTP_SECRET || "secretkey",
      encoding: "base32",
      step: 300
    });

    // Enviar OTP por correo
    await transporter.sendMail({
      from: "noreply@miapp.com",
      to: usuario.email,
      subject: "Tu código de acceso",
      text: `Tu código OTP es: ${otp}`
    });

    res.json({ message: "OTP enviado al correo registrado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// VERIFICAR OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const verified = speakeasy.totp.verify({
      secret: process.env.OTP_SECRET || "secretkey",
      encoding: "base32",
      token: otp,
      step: 300
    });

    if (!verified) return res.status(401).json({ error: "OTP inválido o expirado" });

    // Crear JWT de sesión
    const token = jwt.sign({ email }, process.env.JWT_SECRET || "jwtsecret", { expiresIn: "1h" });

    res.json({ message: "Login exitoso", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login, verifyOtp };
