const SibApiV3Sdk = require("@sendinblue/client");

class EmailService {
  constructor() {
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );
  }

  async sendOTPEmail(toEmail, codigo, minutos = 5) {
    try {
      const emailData = {
        sender: {
          name: process.env.EMAIL_NAME || "Soporte App",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: toEmail }],
        subject: "Código de verificación",
        htmlContent: `
          <h2>Código de Verificación</h2>
          <p>Tu código es: <strong>${codigo}</strong></p>
          <p>Expira en <strong>${minutos} minutos</strong>.</p>
        `,
      };

      await this.apiInstance.sendTransacEmail(emailData);

      console.log(`[Brevo API] Correo enviado a ${toEmail}`);
      return true;

    } catch (error) {
      console.error("[Brevo API] Error enviando correo:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
