import nodemailer from 'nodemailer';

// Email configuration for Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASSWORD // Your Gmail app password
    }
  });
};

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
export async function sendOTPEmail(email: string, otp: string, userName?: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SkillSwap Platform',
        address: process.env.EMAIL_USER || 'noreply@skillswap.com'
      },
      to: email,
      subject: 'Email Verification - SkillSwap Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SkillSwap</h1>
            <p style="color: #e8e8e8; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello${userName ? ` ${userName}` : ''}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Welcome to SkillSwap! To complete your registration and start connecting with other skill enthusiasts, please verify your email address.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              <strong>Important:</strong>
              <br>• This code will expire in 10 minutes
              <br>• Enter this code exactly as shown
              <br>• Don't share this code with anyone
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                If you didn't request this verification, please ignore this email.
                <br>This email was sent from the SkillSwap Platform.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ OTP email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

// Send welcome email after successful verification
export async function sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'SkillSwap Platform',
        address: process.env.EMAIL_USER || 'noreply@skillswap.com'
      },
      to: email,
      subject: 'Welcome to SkillSwap - Your account is ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to SkillSwap!</h1>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Congratulations! Your email has been verified and your SkillSwap account is now active.
            </p>
            
            <h3 style="color: #667eea;">What you can do now:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Complete your profile with skills you offer and want to learn</li>
              <li>Browse other users and discover amazing skills</li>
              <li>Send skill exchange requests</li>
              <li>Start messaging and building connections</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #333; margin: 0;">Ready to start your skill journey?</p>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                Happy skill swapping!
                <br>The SkillSwap Team
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Welcome email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}