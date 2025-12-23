const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Send welcome email with credentials info
const sendWelcomeEmail = async (user, userId) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: user.email,
      subject: '🎉 Welcome to Todo App - Account Created!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Welcome to Todo App!</h2>
          
          <p>Hi <strong>${user.name}</strong>,</p>
          
          <p>Your account has been successfully created using Google Login.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Account Details:</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Login Method:</strong> Google OAuth (Recommended)</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1976d2;">🔐 Alternative Login Option</h4>
            <p>You can also login using your <strong>email and password</strong>.</p>
            <p>To set up password login, use the "Forgot Password" feature on the login page.</p>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Using Todo App
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Security Note:</strong> Your password is securely stored and encrypted. 
            We recommend continuing to use Google Login for the best experience.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This email was sent because you created an account on Todo App.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', user.email);
  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    throw error;
  }
};

module.exports = { sendWelcomeEmail };