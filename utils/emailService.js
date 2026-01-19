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

// Send admin request notification to super admin
const sendAdminRequestNotification = async (adminData) => {
  try {
    // Get super admin email from environment or database
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    if (!superAdminEmail) {
      console.log('⚠️ No super admin email configured for notifications');
      return;
    }

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: superAdminEmail,
      subject: '🔔 New Admin Registration Request - Todo App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">New Admin Registration Request</h2>
          <p>A new admin registration request has been submitted and requires your approval.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Admin Details:</h3>
            <strong>Name:</strong> ${adminData.name}<br>
            <strong>Email:</strong> ${adminData.email}<br>
            <strong>User ID:</strong> ${adminData.user_id}<br>
            <strong>Company:</strong> ${adminData.company}<br>
            <strong>Requested:</strong> ${new Date(adminData.created_at).toLocaleString()}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Please log in to the Super Admin Dashboard to approve or reject this request.</strong></p>
            <a href="${process.env.FRONTEND_URL}/system-admin-access" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Review Request
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated notification from Todo App.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin request notification sent to super admin');
  } catch (error) {
    console.error('❌ Admin request notification failed:', error.message);
    // Don't throw error - registration should succeed even if email fails
  }
};

module.exports = { sendLoginEmail, sendResetEmail, sendAdminRequestNotification };