require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Ensure MONGO_URI is set
if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in .env file!");
    process.exit(1);
}

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// Faculty Attendance Schema
const FacultyAttendanceSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    checkIn: String,
    checkOut: String,
    date: { type: Date, default: Date.now }
});
const FacultyAttendance = mongoose.model("FacultyAttendance", FacultyAttendanceSchema);

// 📌 API: Get Faculty Attendance Data
app.get("/admin/faculty-attendance", async (req, res) => {
    try {
        const facultyAttendance = await FacultyAttendance.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: facultyAttendance });
    } catch (error) {
        console.error("❌ Error fetching faculty attendance:", error);
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
});

// 📌 API: Mark Check-in
app.post("/admin/check-in", async (req, res) => {
    const { name, email } = req.body;
    try {
        let faculty = await FacultyAttendance.findOne({ email });
        if (faculty && faculty.checkIn) {
            return res.status(400).json({ success: false, message: "Already Checked-in" });
        }

        const attendance = new FacultyAttendance({ name, email, checkIn: new Date().toLocaleTimeString() });
        await attendance.save();
        io.emit("updateAttendance", await FacultyAttendance.find().sort({ date: -1 }));
        res.status(200).json({ success: true, message: "Faculty Checked-in" });
    } catch (error) {
        console.error("❌ Error checking in:", error);
        res.status(500).json({ success: false, message: "Error checking in" });
    }
});

// 📌 API: Mark Check-out
app.post("/admin/check-out", async (req, res) => {
    const { email } = req.body;
    try {
        const faculty = await FacultyAttendance.findOne({ email, checkOut: null });
        if (!faculty) {
            return res.status(404).json({ success: false, message: "Faculty not found or already checked out" });
        }

        faculty.checkOut = new Date().toLocaleTimeString();
        await faculty.save();
        io.emit("updateAttendance", await FacultyAttendance.find().sort({ date: -1 }));
        res.status(200).json({ success: true, message: "Faculty Checked-out" });
    } catch (error) {
        console.error("❌ Error checking out:", error);
        res.status(500).json({ success: false, message: "Error checking out" });
    }
});

// 📌 API: Get Attendance Analytics
app.get("/admin/attendance-analytics", async (req, res) => {
    try {
        const total = await FacultyAttendance.countDocuments();
        const present = await FacultyAttendance.countDocuments({ checkIn: { $ne: null } });
        const absent = total - present;

        res.status(200).json({ success: true, total, present, absent });
    } catch (error) {
        console.error("❌ Error fetching analytics:", error);
        res.status(500).json({ success: false, message: "Error fetching analytics" });
    }
});

// 📌 WebSocket for Real-Time Updates
io.on("connection", (socket) => {
    console.log("✅ Admin Connected:", socket.id);
    FacultyAttendance.find().sort({ date: -1 }).then(data => {
        socket.emit("updateAttendance", data);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
