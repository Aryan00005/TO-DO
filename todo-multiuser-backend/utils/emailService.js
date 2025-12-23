const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const sendLoginEmail = async (user, isFirstLogin = false) => {
  try {
    const emailType = isFirstLogin ? 'Welcome' : 'Login Notification';
    const subject = isFirstLogin ? 'Welcome to Todo App!' : 'Login Alert - Todo App';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">${emailType}</h2>
        <p>Hello ${user.name},</p>
        
        ${isFirstLogin ? 
          '<p>Welcome to Todo App! Your account has been successfully created.</p>' :
          '<p>We detected a login to your Todo App account.</p>'
        }
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Login Details:</strong><br>
          Email: ${user.email}<br>
          Time: ${new Date().toLocaleString()}<br>
          Provider: ${user.authProvider === 'google' ? 'Google' : 'Email/Password'}
        </div>
        
        <p style="color: #ef4444; font-weight: 500;">
          🔒 If this wasn't you, please secure your account immediately by changing your password.
        </p>
        
        <p>Best regards,<br>Todo App Team</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: user.email,
      subject: subject,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ${emailType} email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    // Don't throw error - login should succeed even if email fails
  }
};

// Send password reset email
const sendResetEmail = async (email, resetToken, name) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: '🔐 Password Reset Code - Todo App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Password Reset Request</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>You requested a password reset for your Todo App account.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin-top: 0; color: #1f2937;">Your Reset Code:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #ef4444; letter-spacing: 4px; font-family: monospace;">
              ${resetToken}
            </div>
          </div>
          
          <p><strong>⏰ This code expires in 10 minutes.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated email from Todo App.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Reset email sent to:', email);
  } catch (error) {
    console.error('❌ Reset email failed:', error.message);
    throw error;
  }
};

module.exports = { sendLoginEmail, sendResetEmail };