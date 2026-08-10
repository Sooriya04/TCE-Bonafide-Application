require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter
  .verify()
  .then(() => {
    console.log('Nodemailer ready');
  })
  .catch((err) => {
    console.error('Nodemailer verify error:', err);
  });

module.exports = transporter;
