const transporter = require('./transporter');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function sendBonafideNotification(formData, fileBuffer, fileName) {
  try {
    const {
      name,
      rollno,
      parentName,
      relation,
      year,
      course,
      branch,
      certificateFor,
      scholarshipType,
      date,
    } = formData;

    // Ensure it's always a Buffer
    const buffer = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer);

    await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Bonafide Request - ${name} (${rollno})`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#333333; line-height:1.6; padding:20px; background-color:#ffffff; border-radius:10px; max-width:600px; margin:0 auto;">
          <h3 style="color:#4caf50; margin-bottom:15px;">New Bonafide Request Submitted</h3>
          <p style="font-size:16px;"><strong>Name:</strong> ${name}</p>
          <p style="font-size:16px;"><strong>Roll No:</strong> ${rollno}</p>
          <p style="font-size:16px;"><strong>Course:</strong> ${course}</p>
          <p style="font-size:16px;"><strong>Branch:</strong> ${branch}</p>
          <p style="font-size:16px;"><strong>Year:</strong> ${year}</p>
          <p style="font-size:16px;"><strong>Certificate For:</strong> ${certificateFor}</p>
          ${scholarshipType ? `<p style="font-size:16px;"><strong>Scholarship Type:</strong> ${scholarshipType}</p>` : ''}
          <p style="font-size:16px;"><strong>Date:</strong> ${date}</p>
          <hr style="border:none; border-top:1px solid #dddddd; margin:20px 0;" />
          <p style="font-size:16px;">Please check the attached Bonafide certificate (DOCX) for more details.</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX MIME type
        },
      ],
    });

    console.log('✅ Email with DOCX bonafide certificate sent successfully');
  } catch (err) {
    console.error('❌ Error sending bonafide notification:', err);
    throw err;
  }
}

module.exports = { sendBonafideNotification };