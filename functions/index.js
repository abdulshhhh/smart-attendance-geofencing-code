require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP settings
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// Function to send an email
const sendEmail = async (toEmail, attendanceStatus) => {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: toEmail,
            subject: 'Attendance Update',
            text: `Hello, your attendance status is: ${attendanceStatus}`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.response);
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};

// Example Usage (Replace with Firebase Auth User Email)
sendEmail('student@example.com', 'Present');
