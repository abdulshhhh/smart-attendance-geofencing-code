const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// Faculty Attendance Schema
const FacultyAttendanceSchema = new mongoose.Schema({
    name: String,
    email: String,
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
        res.status(500).json({ success: false, message: "Error fetching data" });
    }
});

// 📌 API: Mark Check-in
app.post("/admin/check-in", async (req, res) => {
    const { name, email } = req.body;
    try {
        const attendance = new FacultyAttendance({ name, email, checkIn: new Date().toLocaleTimeString() });
        await attendance.save();
        io.emit("updateAttendance", await FacultyAttendance.find().sort({ date: -1 }));
        res.status(200).json({ success: true, message: "Faculty Checked-in" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error checking in" });
    }
});

// 📌 API: Mark Check-out
app.post("/admin/check-out", async (req, res) => {
    const { email } = req.body;
    try {
        const faculty = await FacultyAttendance.findOne({ email, checkOut: null });
        if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });

        faculty.checkOut = new Date().toLocaleTimeString();
        await faculty.save();
        io.emit("updateAttendance", await FacultyAttendance.find().sort({ date: -1 }));
        res.status(200).json({ success: true, message: "Faculty Checked-out" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error checking out" });
    }
});

// 📌 WebSocket for Real-Time Updates
io.on("connection", (socket) => {
    console.log("✅ Admin Connected:", socket.id);
    socket.emit("updateAttendance", FacultyAttendance.find().sort({ date: -1 }));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
