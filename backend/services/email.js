// Email service using nodemailer
const nodemailer = require('nodemailer');

let transporter;

// Initialize transporter based on environment
if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // For development/testing: captures emails as JSON objects (no actual sending)
  transporter = nodemailer.createTransport({
    jsonTransport: true
  });
}

/**
 * Sends an email using nodemailer
 * @param {Object} mailOptions - nodemailer mail options
 * @returns {Promise<Object>} - nodemailer sent message info
 */
function sendEmail(mailOptions) {
  return transporter.sendMail(mailOptions);
}

/**
 * Sends a verification email
 * @param {string} to - recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} fullName - optional recipient's name
 * @returns {Promise<Object>} - nodemailer sent message info
 */
function sendVerificationEmail(to, code, fullName) {
  const mailOptions = {
    from: '"Techtra Shop" <no-reply@techtra.vn>',
    to: to,
    subject: 'Mã xác nhận đăng ký',
    text: `Mã xác nhận của bạn là: ${code}\nMã có hiệu lực trong 5 phút.`,
    html: `<p>Mã xác nhận của bạn là: <strong>${code}</strong></p><p>Mã có hiệu lực trong 5 phút.</p>`
  };
  return sendEmail(mailOptions);
}

/**
 * Sends a welcome email
 * @param {string} to - recipient email
 * @param {string} fullName - recipient's full name or username
 * @returns {Promise<Object>} - nodemailer sent message info
 */
function sendWelcomeEmail(to, fullName) {
  const mailOptions = {
    from: '"Techtra Shop" <no-reply@techtra.vn>',
    to: to,
    subject: 'Welcome to Techtra Shop!',
    text: `Hi ${fullName},\n\nThank you for registering with Techtra Shop. Your account is now active.\n\nBest regards,\nTechtra Team`,
    html: `<p>Hi ${fullName},</p><p>Thank you for registering with <strong>Techtra Shop</strong>. Your account is now active.</p><p>Best regards,<br/>Techtra Team</p>`
  };
  return sendEmail(mailOptions);
}

module.exports = { sendEmail, sendVerificationEmail, sendWelcomeEmail };