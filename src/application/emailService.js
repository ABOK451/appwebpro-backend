const SibApiV3Sdk = require('@sendinblue/client');

class EmailService {
  constructor() {
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    );
    this.fromEmail = 'avoc451@gmail.com'; // email verificado en Brevo
    this.fromName = 'Soporte App';
  }

  async sendOTPEmail(to, otp, expiresInMinutes) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = 'Código de acceso (OTP)';
    sendSmtpEmail.htmlContent = `
      <p>Tu código OTP es: <b>${otp}</b></p>
      <p>Expira en ${expiresInMinutes} minutos.</p>
    `;

    try {
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('[Brevo API] Email enviado:', response);
      return true;
    } catch (error) {
      console.error('[Brevo API] Error enviando correo:', error.response?.body || error);
      return false;
    }
  }
}

module.exports = new EmailService();
