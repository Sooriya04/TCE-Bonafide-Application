const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const nodemailer = require('nodemailer');

console.log('AUTH_EMAIL:', process.env.AUTH_EMAIL);
console.log('AUTH_PASS:', process.env.AUTH_PASS ? 'FOUND (hidden)' : 'MISSING');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify()
  .then(() => {
    console.log('SUCCESS: Nodemailer is ready to send emails.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR: Nodemailer verification failed:', err);
    process.exit(1);
  });
