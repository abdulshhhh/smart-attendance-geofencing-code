require('dotenv').config();
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

// Configure AWS SES
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create a Nodemailer transporter using AWS SES
const transporter = nodemailer.createTransport({
  SES: new AWS.SES({ apiVersion: '2010-12-01' })
});

// Function to send an email
const sendAttendanceEmail = async (recipientEmail, userName, status, time) => {
  const mailOptions = {
    from: process.env.EMAIL_SENDER,
    to: recipientEmail, // Receiver's email
    subject: 'Attendance Confirmation',
    html: `<p>Hello ${userName},</p>
           <p>Your attendance has been marked as <strong>${status}</strong> at ${time}.</p>
           <p>Best regards,<br>Attendance System</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`❌ Email sending failed:`, error);
  }
};

module.exports = sendAttendanceEmail;
