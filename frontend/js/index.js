const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(bodyParser.json());

// Sample attendance storage (temporary array)
let attendanceRecords = [];

// ✅ API to mark attendance (POST)
app.post("/api/attendance", (req, res) => {
    const { userId, location, department, period, timestamp } = req.body;

    if (!userId || !location || !department || !period || !timestamp) {
        return res.status(400).json({ success: false, message: "Missing required fields!" });
    }

    const record = { userId, location, department, period, timestamp };
    attendanceRecords.push(record);

    console.log("✅ Attendance Recorded:", record);

    res.json({ success: true, message: "Attendance marked successfully!", data: record });
});

// ✅ API to fetch attendance records (GET)
app.get("/api/attendance", (req, res) => {
    res.json({ attendance: attendanceRecords });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
