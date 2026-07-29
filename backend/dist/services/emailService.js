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
const FROM_EMAIL = process.env.EMAIL_FROM || 'VIT RideShare <noreply@vitapstudent.ac.in>';
// Helper to parse "Sender Name <sender@email.com>" into { name, email }
const parseSender = (senderString) => {
    const match = senderString.match(/^(.*?)\s*<(.*?)>$/);
    if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: 'VIT RideShare', email: senderString.trim() };
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
// Common HTML layout wrapper for brand consistency
const wrapHtmlLayout = (content) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VIT RideShare</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #09090b;
          color: #e4e4e7;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
          color: #d4d4d8;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 15px;
        }
        .btn-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          background-color: #7c3aed;
          color: #ffffff !important;
          padding: 12px 28px;
          font-weight: bold;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
          font-size: 15px;
          transition: background-color 0.2s;
        }
        .otp-box {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 8px;
          padding: 14px 28px;
          background-color: #09090b;
          color: #a78bfa;
          border-radius: 12px;
          border: 1px dashed #7c3aed;
          display: inline-block;
          margin: 20px 0;
        }
        .footer {
          background-color: #09090b;
          padding: 20px 30px;
          border-top: 1px solid #27272a;
          text-align: center;
          font-size: 12px;
          color: #71717a;
        }
        .footer a {
          color: #a78bfa;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VIT RideShare</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated system notification from VIT RideShare.</p>
          <p>VIT-AP University, Beside AP Secretariat, Amaravati, Andhra Pradesh.</p>
        </div>
      </div>
    </body>
  </html>
`;
/**
 * Send Welcome Email
 */
const sendWelcomeEmail = async (email, name, role) => {
    const subject = 'Welcome to VIT RideShare! 🚀';
    const roleText = role === 'driver' ? 'Driver Profile' : 'Student Profile';
    const content = `
    <p>Dear ${name},</p>
    <p>Welcome to <strong>VIT RideShare</strong>, the exclusive campus ride-sharing community for VIT-AP!</p>
    <p>Your ${roleText} account has been successfully verified. You can now log into the application, coordinate with other students, split travel costs, and commute to Vijayawada, Guntur, or nearby campuses safely.</p>
    ${role === 'driver'
        ? `<p>As a verified driver, you can now host rides, set your pricing, customize pickup/drop schedules, and manage seat bookings from your driver portal.</p>`
        : `<p>You can search for active rides, book empty seats, review ratings of host drivers, and message them through our real-time portal.</p>`}
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
    const subject = 'Verify Your College Account - VIT RideShare 🔑';
    const content = `
    <p>Hello,</p>
    <p>Thank you for signing up on VIT RideShare. Please verify your email using the 6-digit One-Time Password (OTP) displayed below. This code is valid for <strong>10 minutes</strong>.</p>
    <div style="text-align: center;">
      <span class="otp-box">${otp}</span>
    </div>
    <p>If you did not request this code, please disregard this email and secure your credentials.</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendOTPEmail = sendOTPEmail;
/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = 'Reset Your Password - VIT RideShare 🔒';
    const content = `
    <p>Hello,</p>
    <p>A request was received to reset the password for your VIT RideShare account. This link is secure and remains active for <strong>15 minutes</strong>.</p>
    <p>Click the button below to complete the password reset flow:</p>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <p>If you did not make this request, you do not need to take any action; your password will remain unchanged.</p>
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * Send Driver Approval Email
 */
const sendDriverApprovalEmail = async (email, name) => {
    const subject = 'Driver Registration Approved! 🎖️ - VIT RideShare';
    const content = `
    <p>Dear ${name},</p>
    <p>We are excited to inform you that your driver registration documents (Driving Licence, RC, and Vehicle photos) have been reviewed and <strong>approved</strong> by our administrator!</p>
    <p>Your profile is upgraded to the <strong>Driver</strong> role. You can now immediately start posting ride offers, checking passenger ride requests, and coordinating bookings.</p>
    <div class="btn-container">
      <a href="${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/login" class="btn">Go to Driver Dashboard</a>
    </div>
    <p>Please make sure to drive safely and adhere to the campus guidelines.</p>
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
        ? 'Document Resubmission Required ⚠️ - VIT RideShare'
        : 'Driver Registration Rejected ❌ - VIT RideShare';
    const content = `
    <p>Dear ${name},</p>
    <p>We have completed reviewing the vehicle and licensing documentation you submitted for your driver profile.</p>
    ${isResubmission
        ? `
      <p>Our administrator requests you to <strong>resubmit</strong> certain details due to the following reason:</p>
      <div style="background-color: #27272a; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 8px; color: #f3f4f6; margin: 20px 0; font-size: 14px;">
        <strong>Admin Remarks:</strong> ${reason}
      </div>
      <p>Please log into your dashboard, review your upload fields, and submit clear photos of your license, RC, or vehicle details.</p>
      <div class="btn-container">
        <a href="${process.env.CLIENT_URL || 'https://vitap-rideshare.vercel.app'}/login" class="btn">Resubmit Documents</a>
      </div>
      `
        : `
      <p>Regrettably, your driver profile registration request has been <strong>rejected</strong> due to the following reason:</p>
      <div style="background-color: #27272a; padding: 20px; border-left: 4px solid #ef4444; border-radius: 8px; color: #f3f4f6; margin: 20px 0; font-size: 14px;">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>If you believe this was an error, please reach out to the support desk or request assistance.</p>
      `}
  `;
    const html = wrapHtmlLayout(content);
    await (0, exports.sendEmail)(email, subject, html);
};
exports.sendDriverRejectionEmail = sendDriverRejectionEmail;
