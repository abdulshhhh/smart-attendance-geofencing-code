require('dotenv').config();
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function sendEmail(toEmail, subject, body) {
    const params = {
        Source: "your-verified-email@example.com", // Must be a verified email
        Destination: { ToAddresses: [toEmail] },
        Message: {
            Subject: { Data: subject },
            Body: { Text: { Data: body } },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        await ses.send(command);
        console.log(`✅ Email sent to ${toEmail}`);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
}

// Example Usage
sendEmail("recipient@example.com", "Attendance Update", "You are marked Present!");
