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

  async sendOTPEmail(to, otp, expiresInMinutes = 5) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = 'Código de acceso (OTP)';
    sendSmtpEmail.htmlContent = `<p>Tu código OTP es: <b>${otp}</b></p>
                                 <p>Expira en ${expiresInMinutes} minutos.</p>`;
    try {
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('[Brevo API] OTP enviado:', response);
      return true;
    } catch (error) {
      console.error('[Brevo API] Error enviando OTP:', error.response?.body || error);
      return false;
    }
  }

  async sendRecoveryEmail(to, codigo, nombreUsuario, minutosExpiracion = 5) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = "Recuperación de contraseña";
    sendSmtpEmail.textContent = `Tu código de recuperación es: ${codigo}. Válido por ${minutosExpiracion} minutos.`;
    sendSmtpEmail.htmlContent = `<p>Hola ${nombreUsuario},</p>
                                 <p>Tu código de recuperación es: <b>${codigo}</b></p>
                                 <p>Válido por ${minutosExpiracion} minutos.</p>`;
    try {
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('[Brevo API] Email de recuperación enviado:', response);
      return true;
    } catch (error) {
      console.error('[Brevo API] Error enviando correo de recuperación:', error.response?.body || error);
      return false;
    }
  }

  // --- NUEVO: correo de cuenta bloqueada ---
  async sendAccountBlockedEmail(to, nombreUsuario, untilDate) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: this.fromEmail, name: this.fromName };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = "Cuenta bloqueada temporalmente";
    sendSmtpEmail.textContent = `Tu cuenta ha sido bloqueada temporalmente hasta ${untilDate.toLocaleString()} debido a múltiples intentos fallidos de inicio de sesión.`;
    sendSmtpEmail.htmlContent = `<p>Hola ${nombreUsuario},</p>
                                 <p>Tu cuenta ha sido bloqueada temporalmente hasta <b>${untilDate.toLocaleString()}</b> debido a múltiples intentos fallidos de inicio de sesión.</p>`;
    try {
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('[Brevo API] Email de cuenta bloqueada enviado:', response);
      return true;
    } catch (error) {
      console.error('[Brevo API] Error enviando correo de cuenta bloqueada:', error.response?.body || error);
      return false;
    }
  }
}

module.exports = new EmailService();
