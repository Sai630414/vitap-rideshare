"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDriverRejectionEmail = exports.sendDriverApprovalEmail = exports.sendPasswordResetEmail = exports.sendOTPEmail = exports.sendWelcomeEmail = exports.sendEmail = exports.verifyEmailTransporter = void 0;
const brevo_1 = require("@getbrevo/brevo");
const logger_1 = __importDefault(require("../utils/logger"));
// Initialize Brevo Transactional Email API client
const getBrevoClient = () => {
    const apiKey = process.env.BREVO_API_KEY;
    if (apiKey) {
        return new brevo_1.BrevoClient({ apiKey });
    }
    return null;
};
const client = getBrevoClient();
const FROM_EMAIL = process.env.EMAIL_FROM || 'Waygo <noreply@vitapstudent.ac.in>';
// Helper to parse "Sender Name <sender@email.com>" into { name, email }
const parseSender = (senderString) => {
    const match = senderString.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: 'Waygo', email: senderString.trim() };
};
const sender = parseSender(FROM_EMAIL);
/**
 * Verifies the Brevo API Key connection.
 * Does not throw on failure to prevent server crashes, but logs warnings.
 */
const verifyEmailTransporter = async () => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey || !client) {
        logger_1.default.warn('Brevo API key is not configured. Email services will run in simulation mode.');
        return;
    }
    try {
        await client.account.getAccount();
        logger_1.default.info('✅ Brevo REST API connection verified successfully. Account is active.');
    }
    catch (error) {
        logger_1.default.error(`❌ Brevo API Key verification failed: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            logger_1.default.warn('Brevo API key verification failed in production. Email features will be unavailable.');
        }
    }
};
exports.verifyEmailTransporter = verifyEmailTransporter;
/**
 * Generic email sending function with input validation and exponential backoff retry logic.
 */
const sendEmail = async (toEmail, subject, html, retries = 3, delay = 1000) => {
    if (!toEmail || !toEmail.includes('@')) {
        logger_1.default.error(`Invalid recipient email address: "${toEmail}"`);
        return;
    }
    if (!client) {
        logger_1.default.warn(`[Brevo API not configured] Simulating Email to: ${toEmail} | Subject: ${subject}`);
        return;
    }
    const payload = {
        subject,
        htmlContent: html,
        sender,
        to: [{ email: toEmail }],
    };
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await client.transactionalEmails.sendTransacEmail(payload);
            logger_1.default.info(`Email sent successfully to: ${toEmail} | Subject: ${subject}`);
            return;
        }
        catch (error) {
            const status = error?.response?.statusCode || error?.statusCode || 'unknown';
            const message = error?.response?.body?.message || error?.message || 'unknown error';
            logger_1.default.error(`Brevo API send email attempt ${attempt} failed: ${message} (Status: ${status})`);
            if (attempt === retries) {
                throw new Error(`Failed to send email to ${toEmail} after ${retries} attempts: ${message}`);
            }
            const backoffDelay = delay * Math.pow(2, attempt - 1);
            logger_1.default.info(`Retrying in ${backoffDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
    }
};
exports.sendEmail = sendEmail;
// Common HTML layout wrapper matching Waygo UI design system
const wrapHtmlLayout = (content) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Waygo</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #020617;
          color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 540px;
          margin: 40px auto;
          background-color: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        }
        .header {
          background-color: #090d16;
          padding: 32px 24px 24px 24px;
          text-align: center;
          border-bottom: 1px solid #1e293b;
          position: relative;
        }
        .header-accent {
          height: 4px;
          background: linear-gradient(90deg, #059669, #0d9488, #10b981);
          width: 100%;
        }
        .logo-title {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.8px;
          margin: 0;
          color: #ffffff;
        }
        .logo-way {
          color: #ffffff;
        }
        .logo-go {
          color: #10b981;
        }
        .subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .content {
          padding: 36px 32px;
          line-height: 1.6;
          color: #cbd5e1;
        }
        .content p {
          margin: 0 0 18px 0;
          font-size: 15px;
        }
        .content strong {
          color: #f8fafc;
        }
        .btn-container {
          text-align: center;
          margin: 32px 0;
        }
        .btn {
          background: linear-gradient(135deg, #059669, #10b981);
          color: #ffffff !important;
          padding: 14px 32px;
          font-weight: 800;
          text-decoration: none;
          border-radius: 14px;
          display: inline-block;
          font-size: 15px;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
          transition: transform 0.2s;
        }
        .otp-box {
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 10px;
          padding: 16px 32px;
          background-color: #022c22;
          color: #34d399;
          border-radius: 16px;
          border: 1.5px dashed #10b981;
          display: inline-block;
          margin: 20px 0;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        .remark-box {
          background-color: #1e293b;
          padding: 18px 22px;
          border-left: 4px solid #f59e0b;
          border-radius: 12px;
          color: #f8fafc;
          margin: 20px 0;
          font-size: 14px;
        }
        .remark-box-danger {
          background-color: #1e293b;
          padding: 18px 22px;
          border-left: 4px solid #ef4444;
          border-radius: 12px;
          color: #f8fafc;
          margin: 20px 0;
          font-size: 14px;
        }
        .footer {
          background-color: #090d16;
          padding: 24px 32px;
          border-top: 1px solid #1e293b;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        .footer a {
          color: #10b981;
          text-decoration: none;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header-accent"></div>
        <div class="header">
          <h1 class="logo-title">
            <span class="logo-way">Way</span><span class="logo-go">go</span>
          </h1>
          <div class="subtitle">VIT-AP Campus Network</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p style="margin-bottom: 4px;">Automated system notification from <strong>Waygo</strong>.</p>
          <p style="margin-top: 0;">VIT-AP University, Beside AP Secretariat, Amaravati, AP.</p>
        </div>
      </div>
    </body>
  </html>
`;
/**
 * Send Welcome Email
 */
const sendWelcomeEmail = async (email, name, role) => {
    const subject = 'Welcome to Waygo! 🚀';
    const roleText = role === 'driver' ? 'Driver Profile' : 'Student Profile';
    const content = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>Welcome to <strong>Waygo</strong>, the official ride-sharing network for VIT-AP!</p>
    <p>Your ${roleText} has been successfully verified. You can now log in to manage your campus rides, connect with verified drivers or passengers, and split travel costs transparently.</p>
    ${role === 'driver'
        ? `<p>As a verified driver, you can now post ride offers, set seat pricing, manage pickup schedules, and approve booking requests.</p>`
        : `<p>You can search for active rides, book empty seats, check driver ratings, and message hosts in real-time.</p>`}
    <div class="btn-container">
      <a href="${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/login" class="btn">Access Dashboard</a>
    </div>
    <p>Have a safe and happy commute!</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendWelcomeEmail = sendWelcomeEmail;
/**
 * Send OTP Verification Email
 */
const sendOTPEmail = async (email, otp) => {
    const subject = 'Verify Your Account - Waygo 🔑';
    const content = `
    <p>Hello,</p>
    <p>Thank you for registering on <strong>Waygo</strong>. Please verify your college email address using the 6-digit One-Time Password (OTP) below. This code is valid for <strong>10 minutes</strong>.</p>
    <div style="text-align: center;">
      <span class="otp-box">${otp}</span>
    </div>
    <p>If you did not request this verification code, please disregard this email.</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendOTPEmail = sendOTPEmail;
/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = 'Reset Your Password - Waygo 🔒';
    const content = `
    <p>Hello,</p>
    <p>A request was received to reset the password for your <strong>Waygo</strong> account. This link is secure and remains active for <strong>15 minutes</strong>.</p>
    <p>Click the button below to complete your password reset:</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p>If you did not make this request, your password will remain unchanged.</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * Send Driver Approval Email
 */
const sendDriverApprovalEmail = async (email, name) => {
    const subject = 'Driver Registration Approved! 🎖️ - Waygo';
    const content = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>We are excited to inform you that your driver registration documents (Driving Licence, RC, and Vehicle photos) have been reviewed and <strong>approved</strong> by our administrator!</p>
    <p>Your profile is now upgraded to <strong>Driver</strong> status. You can immediately start posting ride offers, accepting passenger bookings, and sharing trips.</p>
    <div class="btn-container">
      <a href="${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/login" class="btn">Go to Driver Dashboard</a>
    </div>
    <p>Please make sure to drive safely and adhere to campus guidelines.</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendDriverApprovalEmail = sendDriverApprovalEmail;
/**
 * Send Driver Rejection / Resubmission Email
 */
const sendDriverRejectionEmail = async (email, name, reason, isResubmission = false) => {
    const subject = isResubmission
        ? 'Document Resubmission Required ⚠️ - Waygo'
        : 'Driver Registration Notice ❌ - Waygo';
    const content = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>We have completed reviewing the vehicle and licensing documentation for your driver profile.</p>
    ${isResubmission
        ? `
      <p>Our administrator requests you to <strong>resubmit</strong> certain details due to the following reason:</p>
      <div class="remark-box">
        <strong>Admin Remarks:</strong> ${reason}
      </div>
      <p>Please log into your account, review your upload fields, and submit clear photos of your license, RC, or vehicle details.</p>
      <div class="btn-container">
        <a href="${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/login" class="btn">Resubmit Documents</a>
      </div>
      `
        : `
      <p>Regrettably, your driver profile registration request was not approved due to the following reason:</p>
      <div class="remark-box-danger">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>If you believe this was an error, please contact support for assistance.</p>
      `}
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendDriverRejectionEmail = sendDriverRejectionEmail;
