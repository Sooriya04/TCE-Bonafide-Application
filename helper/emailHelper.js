const transporter = require('./transporter');

async function sendVerificationEmail(email, otp) {
  return transporter.sendMail({
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: 'Your OTP Code - Student Portal',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #800000; text-align: center;">TCE Bonafide Application OTP</h2>
        <p>Dear Student,</p>
        <p>You requested an OTP for signing in to the Student Portal.</p>
        <div style="background-color: #f7f7f7; border: 1px dashed #800000; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #800000;">
          ${otp}
        </div>
        <p>This code is valid for <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <p>Best regards,<br>TCE Admin Team</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
