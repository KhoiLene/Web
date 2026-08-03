// Google Apps Script for sending verification emails via Gmail
// To use: Deploy as a web app or call from backend via UrlFetch

/**
 * Sends an verification email using GmailService
 * @param {string} recipientEmail - The recipient's email address
 * @param {string} code - The 6-digit verification code
 * @param {string} fullName - Optional recipient's name
 */
function sendVerificationEmail(recipientEmail, code, fullName) {
  // Optional: You can configure these via PropertiesService
  const senderEmail = Session.getActiveUser().getEmail(); // Or set a fixed sender
  const subject = 'Mã xác nhận đăng ký';

  const htmlBody = `
    <p>Xin chào ${fullName || ''},</p>
    <p>Mã xác nhận của bạn là: <strong>${code}</strong></p>
    <p>Mã có hiệu lực trong 5 phút.</p>
    <p>Trân trọng,<br/>Techtra Shop</p>
  `;

  const textBody = `
    Xin chào ${fullName || ''},

    Mã xác nhận của bạn là: ${code}.
    Mã có hiệu lực trong 5 phút.

    Trân trọng,
    Techtra Shop
  `;

  try {
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
      textBody: textBody
    });
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Example of a web app endpoint to be called from your backend
 * (Optional) Uncomment and deploy as web app if you want to call via HTTP
 */
/*
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const result = sendVerificationEmail(data.email, data.code, data.fullName || '');
  return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
}
*/