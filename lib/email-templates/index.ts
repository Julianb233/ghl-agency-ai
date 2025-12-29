import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Base styles for all emails
const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px; }
  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .button:hover { opacity: 0.9; }
  .footer { background: #f8f9fa; padding: 24px; text-align: center; font-size: 12px; color: #666; }
  .divider { border-top: 1px solid #eee; margin: 24px 0; }
  .highlight { background: #f0f4ff; padding: 16px; border-radius: 6px; border-left: 4px solid #667eea; }
`;

// Welcome Email Template
export function welcomeEmail(data: { name: string; email: string; agencyName?: string }) {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${data.agencyName || 'GHL Agency AI'}!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>We're excited to have you on board! Your account has been successfully created.</p>
      <div class="highlight">
        <strong>Your login email:</strong> ${data.email}
      </div>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Set up your agency profile</li>
        <li>Connect your GoHighLevel account</li>
        <li>Configure your AI assistants</li>
      </ul>
      <a href="#" class="button">Get Started</a>
      <p>If you have any questions, our support team is here to help.</p>
      <p>Best regards,<br>The GHL Agency AI Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} GHL Agency AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// New Client Notification Email
export function newClientEmail(data: { agencyName: string; clientName: string; clientEmail: string; service: string }) {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
      <h1>New Client Signup!</h1>
    </div>
    <div class="content">
      <p>Great news for ${data.agencyName}!</p>
      <p>A new client has signed up through your AI assistant:</p>
      <div class="highlight" style="border-left-color: #11998e;">
        <p><strong>Client:</strong> ${data.clientName}</p>
        <p><strong>Email:</strong> ${data.clientEmail}</p>
        <p><strong>Service:</strong> ${data.service}</p>
      </div>
      <p>The client has been automatically added to your GoHighLevel CRM.</p>
      <a href="#" class="button" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">View in Dashboard</a>
    </div>
    <div class="footer">
      <p>Powered by GHL Agency AI</p>
    </div>
  </div>
</body>
</html>`;
}

// AI Conversation Summary Email
export function conversationSummaryEmail(data: { agencyName: string; totalConversations: number; leadsGenerated: number; appointmentsBooked: number; period: string }) {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
      <h1>Your ${data.period} AI Summary</h1>
    </div>
    <div class="content">
      <p>Hi ${data.agencyName} Team,</p>
      <p>Here's how your AI assistant performed this ${data.period.toLowerCase()}:</p>
      <div class="highlight" style="border-left-color: #f5576c;">
        <p style="font-size: 18px; margin: 0;"><strong>${data.totalConversations}</strong> Conversations Handled</p>
        <p style="font-size: 18px; margin: 8px 0;"><strong>${data.leadsGenerated}</strong> Leads Generated</p>
        <p style="font-size: 18px; margin: 0;"><strong>${data.appointmentsBooked}</strong> Appointments Booked</p>
      </div>
      <p>Your AI assistant is working 24/7 to grow your business!</p>
      <a href="#" class="button" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">View Full Report</a>
    </div>
    <div class="footer">
      <p>Powered by GHL Agency AI</p>
    </div>
  </div>
</body>
</html>`;
}

// Appointment Reminder Email
export function appointmentReminderEmail(data: { clientName: string; agencyName: string; date: string; time: string; meetingLink?: string }) {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
      <h1>Appointment Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${data.clientName},</p>
      <p>This is a friendly reminder about your upcoming appointment with ${data.agencyName}:</p>
      <div class="highlight" style="border-left-color: #4facfe;">
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
      </div>
      ${data.meetingLink ? `<a href="${data.meetingLink}" class="button" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">Join Meeting</a>` : ''}
      <p>We look forward to speaking with you!</p>
    </div>
    <div class="footer">
      <p>Need to reschedule? Reply to this email at least 24 hours in advance.</p>
    </div>
  </div>
</body>
</html>`;
}

// Integration Alert Email
export function integrationAlertEmail(data: { agencyName: string; integration: string; status: 'connected' | 'disconnected' | 'error'; message: string }) {
  const statusColors = {
    connected: '#11998e',
    disconnected: '#f5576c',
    error: '#fa709a'
  };
  const statusText = {
    connected: 'Connected Successfully',
    disconnected: 'Disconnected',
    error: 'Connection Error'
  };

  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header" style="background: ${statusColors[data.status]};">
      <h1>Integration ${statusText[data.status]}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.agencyName} Team,</p>
      <p>Your <strong>${data.integration}</strong> integration status has changed:</p>
      <div class="highlight" style="border-left-color: ${statusColors[data.status]};">
        <p><strong>Status:</strong> ${statusText[data.status]}</p>
        <p><strong>Details:</strong> ${data.message}</p>
      </div>
      ${data.status !== 'connected' ? '<p>Please check your integration settings to ensure everything is working correctly.</p>' : '<p>Your integration is working properly.</p>'}
      <a href="#" class="button">View Integrations</a>
    </div>
    <div class="footer">
      <p>Need help? Contact our support team.</p>
    </div>
  </div>
</body>
</html>`;
}

// Password Reset Email
export function passwordResetEmail(data: { name: string; resetLink: string; expiresIn: string }) {
  return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="container">
    <div class="header" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="${data.resetLink}" class="button" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">Reset Password</a>
      <div class="highlight" style="border-left-color: #fa709a;">
        <p><strong>This link expires in ${data.expiresIn}</strong></p>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>If you're having trouble, contact support.</p>
    </div>
  </div>
</body>
</html>`;
}

// Email sending helper
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: options.from || 'notifications@ghlagencyai.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    reply_to: options.replyTo,
  });

  if (error) {
    console.error('Email send error:', error);
    throw error;
  }

  return data;
}

export default {
  welcomeEmail,
  newClientEmail,
  conversationSummaryEmail,
  appointmentReminderEmail,
  integrationAlertEmail,
  passwordResetEmail,
  sendEmail,
};
