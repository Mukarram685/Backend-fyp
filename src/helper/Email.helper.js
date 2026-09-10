import 'dotenv/config';
import nodemailer from 'nodemailer';

/**
 * Creates and returns a Nodemailer transporter configured from environment variables.
 * If credentials are not provided or incomplete, returns null to allow safe simulation.
 */
export const getEmailTransporter = () => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');
    const emailService = process.env.EMAIL_SERVICE;

    if (!smtpUser || !smtpPass) {
        return null;
    }

    if (emailService) {
        return nodemailer.createTransport({
            service: emailService,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }

    if (smtpHost?.includes('gmail') || smtpUser?.includes('gmail')) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
    }

    if (smtpHost) {
        return nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    return null;
};

/**
 * Sends a 6-digit OTP verification email for Forgot Password flow.
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit numeric OTP
 * @param {string} userName - Optional user name
 */
export const sendOtpEmail = async (toEmail, otp, userName = 'Valued User') => {
    const transporter = getEmailTransporter();
    const fromAddress =  '"BookNGo Support" <no-reply@bookngo.com>';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BookNGo Password Reset</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #172C6B 0%, #3B82F6 100%); padding: 32px 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #dbeafe; margin: 6px 0 0 0; font-size: 14px; font-weight: 500; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #172C6B; font-family: monospace, Courier; margin: 0; }
            .otp-expiry { font-size: 12px; font-weight: 600; color: #ef4444; margin-top: 8px; }
            .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #9a3412; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>BookNGo</h1>
                <p>Bus Ticket Booking & Logistics Platform</p>
            </div>
            <div class="content">
                <div class="greeting">Hello ${userName},</div>
                <div class="message">
                    We received a request to reset your password for your <strong>BookNGo</strong> account. Use the one-time verification code (OTP) below to proceed with setting a new password.
                </div>
                <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                    <div class="otp-expiry">⏱ Valid for 15 minutes only</div>
                </div>
                <div class="warning">
                    <strong>Security Alert:</strong> Never share this code with anyone. BookNGo support staff will never ask for your verification code or password.
                </div>
                <div class="message">
                    If you did not request a password reset, you can safely ignore this email. Your current password remains secure.
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} BookNGo Inc. All rights reserved.<br/>
                For support, contact support@bookngo.pk
            </div>
        </div>
    </body>
    </html>
    `;

    if (!transporter) {
        console.log(`\n=================== [EMAIL DISPATCH SIMULATION] ===================`);
        console.log(`[Email Helper] SMTP credentials not set in environment variables.`);
        console.log(`[Email Helper] Simulated OTP Email To: ${toEmail}`);
        console.log(`[Email Helper] OTP Code: ${otp}`);
        console.log(`[Email Helper] Expiry: 15 minutes`);
        console.log(`===================================================================\n`);
        return { success: true, simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: 'BookNGo - Password Reset Verification Code',
            text: `Your BookNGo password reset verification code is: ${otp}. It will expire in 15 minutes.`,
            html: htmlContent,
        });

        console.log(`[Email Helper] OTP Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email Helper] Error sending OTP email to ${toEmail}:`, error.message);
        // Fallback simulation in case SMTP server is unreachable/misconfigured
        return { success: false, error: error.message };
    }
};

/**
 * Sends an email verification email to user upon registration.
 * @param {string} toEmail - Recipient email address
 * @param {string} verificationToken - Email verification token
 * @param {string} userName - Optional user name
 */
export const sendVerificationEmail = async (toEmail, verificationToken, userName = 'Valued User') => {
    const transporter = getEmailTransporter();
    const fromAddress = '"BookNGo Support" <no-reply@bookngo.com>';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BookNGo Email Verification</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b; }
            .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #172C6B 0%, #3B82F6 100%); padding: 32px 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #dbeafe; margin: 6px 0 0 0; font-size: 14px; font-weight: 500; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .button-container { text-align: center; margin: 24px 0; }
            .verify-button { background: linear-gradient(135deg, #172C6B 0%, #3B82F6 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; }
            .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #9a3412; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>BookNGo</h1>
                <p>Bus Ticket Booking & Logistics Platform</p>
            </div>
            <div class="content">
                <div class="greeting">Hello ${userName},</div>
                <div class="message">
                    Welcome to <strong>BookNGo</strong>! We're excited to have you on board. To ensure the security of your account and to provide you with the best experience, please verify your email address by clicking the button below.
                </div>
                <div class="button-container">
                    <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
                </div>
                <div class="warning">
                    <strong>Security Alert:</strong> Never share this verification link with anyone. BookNGo support staff will never ask for your verification link or password.
                </div>
                <div class="message">
                    If you didn't create an account with BookNGo, you can safely ignore this email.
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} BookNGo Inc. All rights reserved.<br/>
                For support, contact support@bookngo.pk
            </div>
        </div>
    </body>
    </html>
    `;

    if (!transporter) {
        console.log(`\n=================== [EMAIL DISPATCH SIMULATION] ===================`);
        console.log(`[Email Helper] SMTP credentials not set in environment variables.`);
        console.log(`[Email Helper] Simulated Verification Email To: ${toEmail}`);
        console.log(`[Email Helper] Verification URL: ${verificationUrl}`);
        console.log(`===================================================================\n`);
        return { success: true, simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: 'BookNGo - Verify Your Email Address',
            text: `Welcome to BookNGo! Please verify your email address by visiting: ${verificationUrl}`,
            html: htmlContent,
        });

        console.log(`[Email Helper] Verification email sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[Email Helper] Error sending verification email to ${toEmail}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends a notification email to Admin and a confirmation email to the User upon Feedback submission.
 * @param {object} feedbackData - { email, name, description, rating }
 */
export const sendFeedbackNotificationEmail = async ({ email, name = 'User', description, rating }) => {
    const transporter = getEmailTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@bookngo.com';
    const fromAddress = '"BookNGo Support" <no-reply@bookngo.com>';

    // Admin notification email template
    const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
            .card { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background: #172C6B; padding: 20px; color: #fff; }
            .header h2 { margin: 0; font-size: 20px; }
            .body { padding: 24px; }
            .field { margin-bottom: 16px; }
            .label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-size: 15px; color: #0f172a; font-weight: 500; }
            .desc-box { background: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h2>📬 New User Feedback Received</h2>
            </div>
            <div class="body">
                <div class="field">
                    <div class="label">User Email</div>
                    <div class="value">${email}</div>
                </div>
                ${name ? `
                <div class="field">
                    <div class="label">User Name</div>
                    <div class="value">${name}</div>
                </div>` : ''}
                ${rating ? `
                <div class="field">
                    <div class="label">Rating / Satisfaction</div>
                    <div class="value">⭐ ${rating} / 5</div>
                </div>` : ''}
                <div class="field">
                    <div class="label">Feedback / Description</div>
                    <div class="desc-box">${description}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    // User confirmation email template
    const userConfirmationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
            .card { max-width: 560px; margin: 24px auto; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #172C6B 0%, #2563EB 100%); padding: 24px; text-align: center; color: #fff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
            .body { padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }
            .quote { background: #f8fafc; border-left: 3px solid #2563EB; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #475569; }
            .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>BookNGo Feedback</h1>
            </div>
            <div class="body">
                <p>Hello,</p>
                <p>Thank you for taking the time to share your feedback with us! We have received your submission:</p>
                <div class="quote">"${description}"</div>
                <p>Your feedback helps us make BookNGo better for all bus travelers. Our team reviews every suggestion carefully.</p>
                <p>Safe travels,<br/><strong>The BookNGo Team</strong></p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} BookNGo. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    if (!transporter) {
        console.log(`\n=================== [FEEDBACK EMAIL SIMULATION] ===================`);
        console.log(`[Email Helper] SMTP credentials not set in environment variables.`);
        console.log(`[Email Helper] User Feedback From: ${email}`);
        console.log(`[Email Helper] Description: ${description}`);
        console.log(`[Email Helper] Admin Notification Target: ${adminEmail}`);
        console.log(`===================================================================\n`);
        return { success: true, simulated: true };
    }

    try {
        // Send notification to Admin
        await transporter.sendMail({
            from: fromAddress,
            to: adminEmail,
            subject: `[BookNGo Feedback] New feedback from ${email}`,
            html: adminHtml,
        });

        // Send confirmation to user
        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: 'Thank you for your feedback - BookNGo',
            html: userConfirmationHtml,
        });

        console.log(`[Email Helper] Feedback emails sent to admin (${adminEmail}) and user (${email})`);
        return { success: true };
    } catch (error) {
        console.error(`[Email Helper] Error sending feedback emails:`, error.message);
        return { success: false, error: error.message };
    }
};
