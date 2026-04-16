const nodemailer = require('nodemailer');

// Email transporter configuration
let transporter;

const initializeEmailService = () => {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Send registration confirmation
const sendRegistrationConfirmation = async (email, businessName) => {
  try {
    if (!transporter) initializeEmailService();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: email,
      subject: 'Registration Confirmation - Village API',
      html: `
        <h2>Welcome to Village API!</h2>
        <p>Hi ${businessName},</p>
        <p>Thank you for registering. Your account is pending admin approval.</p>
        <p>We will review your business details and notify you once approved.</p>
        <p>You'll be able to generate API keys and start using the API immediately after approval.</p>
        <p>Best regards,<br>Village API Team</p>
      `
    });
    console.log('Registration confirmation sent to', email);
  } catch (err) {
    console.error('Failed to send registration confirmation:', err);
  }
};

// Send approval notification
const sendApprovalNotification = async (email, businessName) => {
  try {
    if (!transporter) initializeEmailService();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: email,
      subject: 'Account Approved - Village API',
      html: `
        <h2>Your Account is Approved!</h2>
        <p>Hi ${businessName},</p>
        <p>Great news! Your account has been approved by our admin team.</p>
        <p>You can now log in to the dashboard and generate API keys.</p>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Log in to your dashboard</li>
          <li>Generate your API Key and Secret</li>
          <li>Read the API documentation</li>
          <li>Start integrating with your application</li>
        </ol>
        <p>Dashboard URL: ${process.env.DASHBOARD_URL || 'http://localhost:5173'}</p>
        <p>Need help? Check our documentation or contact support.</p>
        <p>Best regards,<br>Village API Team</p>
      `
    });
    console.log('Approval notification sent to', email);
  } catch (err) {
    console.error('Failed to send approval notification:', err);
  }
};

// Send rejection notification
const sendRejectionNotification = async (email, businessName, reason) => {
  try {
    if (!transporter) initializeEmailService();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: email,
      subject: 'Registration Update - Village API',
      html: `
        <h2>Registration Status Update</h2>
        <p>Hi ${businessName},</p>
        <p>Thank you for your interest in Village API.</p>
        <p><strong>Status:</strong> Unfortunately, we cannot approve your application at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>If you have questions, please contact our support team.</p>
        <p>Best regards,<br>Village API Team</p>
      `
    });
    console.log('Rejection notification sent to', email);
  } catch (err) {
    console.error('Failed to send rejection notification:', err);
  }
};

// Send usage alert
const sendUsageAlert = async (email, businessName, usagePercentage, dailyLimit) => {
  try {
    if (!transporter) initializeEmailService();
    
    const alertType = usagePercentage >= 95 ? 'CRITICAL' : 'WARNING';
    const subject = alertType === 'CRITICAL' 
      ? 'URGENT: API quota almost exceeded' 
      : 'Warning: API quota usage high';
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: email,
      subject,
      html: `
        <h2>API Usage Alert - ${alertType}</h2>
        <p>Hi ${businessName},</p>
        <p>Your daily API quota usage has reached <strong>${usagePercentage}%</strong>.</p>
        <p><strong>Your daily limit:</strong> ${dailyLimit} requests</p>
        <p>${usagePercentage >= 95 
          ? 'You are approaching your limit. Please reduce usage or upgrade your plan.' 
          : 'Monitor your usage to avoid exceeding your daily limit.'}</p>
        <p>Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:5173'}</p>
        <p>Best regards,<br>Village API Team</p>
      `
    });
    console.log('Usage alert sent to', email);
  } catch (err) {
    console.error('Failed to send usage alert:', err);
  }
};

// Send weekly digest
const sendWeeklyDigest = async (email, businessName, stats) => {
  try {
    if (!transporter) initializeEmailService();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: email,
      subject: 'Weekly API Usage Report - Village API',
      html: `
        <h2>Weekly Usage Report</h2>
        <p>Hi ${businessName},</p>
        <p>Here's your API usage summary for this week:</p>
        <ul>
          <li><strong>Total Requests:</strong> ${stats.totalRequests}</li>
          <li><strong>Successful (2xx):</strong> ${stats.successful}</li>
          <li><strong>Errors (4xx/5xx):</strong> ${stats.errors}</li>
          <li><strong>Avg Response Time:</strong> ${stats.avgResponseTime}ms</li>
          <li><strong>Top Endpoint:</strong> ${stats.topEndpoint}</li>
        </ul>
        <p>Dashboard: ${process.env.DASHBOARD_URL || 'http://localhost:5173'}</p>
        <p>Best regards,<br>Village API Team</p>
      `
    });
    console.log('Weekly digest sent to', email);
  } catch (err) {
    console.error('Failed to send weekly digest:', err);
  }
};

// Admin notification for new registration
const sendAdminRegistrationNotification = async (adminEmail, businessName, email, gstNumber) => {
  try {
    if (!transporter) initializeEmailService();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@villageapi.com',
      to: adminEmail,
      subject: 'New User Registration - Action Required',
      html: `
        <h2>New User Registration</h2>
        <p>A new user has registered and requires approval:</p>
        <ul>
          <li><strong>Business Name:</strong> ${businessName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>GST Number:</strong> ${gstNumber || 'Not provided'}</li>
        </ul>
        <p>Admin Panel: ${process.env.ADMIN_URL || 'http://localhost:5173/admin'}</p>
        <p>Please review and approve/reject this registration.</p>
      `
    });
    console.log('Admin notification sent to', adminEmail);
  } catch (err) {
    console.error('Failed to send admin notification:', err);
  }
};

module.exports = {
  initializeEmailService,
  sendRegistrationConfirmation,
  sendApprovalNotification,
  sendRejectionNotification,
  sendUsageAlert,
  sendWeeklyDigest,
  sendAdminRegistrationNotification
};
