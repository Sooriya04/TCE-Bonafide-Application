const transporter = require('./transporter');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function sendMonthlyReportEmail(filePath, start, end) {
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const year = start.getFullYear();

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Monthly Bonafide Report (${start.toLocaleDateString(
      'en-GB'
    )} - ${end.toLocaleDateString('en-GB')})`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#333333; line-height:1.6; padding:20px; background-color:#ffffff; border-radius:10px; max-width:600px; margin:0 auto;">
        <p style="font-size:16px;">Hi Admin,</p>
        <p style="font-size:16px;">
          This is the monthly Bonafide report for submissions between 
          <strong>${start.toLocaleDateString('en-GB')}</strong> and 
          <strong>${end.toLocaleDateString('en-GB')}</strong>.
        </p>
        <p style="font-size:16px;">Regards,<br/>Student Portal</p>
      </div>
    `,
  };

  if (filePath) {
    mailOptions.attachments = [
      {
        filename: `Bonafide_Report_${month}_${year}.xlsx`,
        path: filePath,
      },
    ];
  }

  return transporter.sendMail(mailOptions);
}

module.exports = { sendMonthlyReportEmail };
