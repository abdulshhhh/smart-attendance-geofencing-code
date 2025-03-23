require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';

// Secure CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware for parsing request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
console.log('Attempting to connect to MongoDB at:', MONGO_URI);
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit process if connection fails
  });

// Enhanced Attendance Schema with location data
const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: true, enum: ['Present', 'Absent'] },
  locationVerified: { type: Boolean, required: true },
  // New fields for location data
  location: {
    lat: { type: Number },
    lon: { type: Number }
  },
  altitude: { type: Number },
  accuracy: { type: Number }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Drop Unique Index if Exists (Handle Errors Gracefully)
(async () => {
  try {
    await Attendance.collection.dropIndexes();
    console.log("✅ Dropped unique indexes (if any)");
  } catch (err) {
    if (err.message.includes("ns not found")) {
      console.log("⚠️ No indexes to drop (collection does not exist yet)");
    } else {
      console.error("⚠️ Error dropping indexes:", err.message);
    }
  }
})();

// Root route for checking server status
app.get('/', (req, res) => {
  res.send('✅ Attendance API is running');
});

// ✅ Enhanced API Route to Submit Attendance with location data
app.post('/api/attendance', async (req, res) => {
  try {
    const { 
      userId, 
      date, 
      time, 
      status, 
      locationVerified, 
      location, 
      altitude, 
      accuracy 
    } = req.body;

    if (!userId || !date || !time || !status) {
      return res.status(400).json({
        success: false,
        message: "❌ Missing required fields: userId, date, time, or status."
      });
    }

    // Check if attendance already exists for this user on this date
    const existingRecord = await Attendance.findOne({ userId, date }).lean();
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "⚠️ Attendance already recorded for today."
      });
    }

    // Create attendance object with all fields
    const attendance = new Attendance({ 
      userId, 
      date, 
      time, 
      status, 
      locationVerified,
      location,
      altitude, 
      accuracy
    });
    
    const savedAttendance = await attendance.save();

    res.status(201).json({
      success: true,
      message: "✅ Attendance recorded successfully",
      data: savedAttendance
    });
  } catch (error) {
    console.error("❌ Attendance Save Error:", error.message);
    res.status(500).json({
      success: false,
      message: "❌ Failed to record attendance",
      error: error.message
    });
  }
});

// ✅ API Route to Get Attendance Records
app.get('/api/attendance', async (req, res) => {
  try {
    const data = await Attendance.find().sort({ createdAt: -1 }).lean();

    if (!data.length) {
      return res.status(404).json({ success: false, message: '⚠️ No attendance records found' });
    }

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("❌ Error fetching attendance data:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// ✅ API Route to Fetch Attendance by User ID
app.get('/api/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await Attendance.find({ userId }).sort({ createdAt: -1 }).lean();

    if (!records.length) {
      return res.status(404).json({ success: false, message: '⚠️ No attendance records found for this user' });
    }

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    console.error("❌ Error fetching user attendance:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// ✅ API Route to Delete an Attendance Record
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Attendance.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: "❌ Record not found" });
    }

    res.status(200).json({ success: true, message: "✅ Attendance record deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting attendance record:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// ✅ API Route to Update an Attendance Record
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord = await Attendance.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: "❌ Record not found" });
    }

    res.status(200).json({ success: true, message: "✅ Attendance record updated successfully", data: updatedRecord });
  } catch (error) {
    console.error("❌ Error updating attendance record:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// ✅ API Route to Get Attendance Statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalRecords = await Attendance.countDocuments();
    const presentCount = await Attendance.countDocuments({ status: 'Present' });
    const absentCount = await Attendance.countDocuments({ status: 'Absent' });
    const verifiedLocations = await Attendance.countDocuments({ locationVerified: true });
    
    res.status(200).json({
      success: true,
      stats: {
        totalRecords,
        presentCount,
        absentCount,
        verifiedLocations,
        presentPercentage: totalRecords ? ((presentCount / totalRecords) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error("❌ Error fetching attendance statistics:", error);
    res.status(500).json({ success: false, message: "❌ Internal Server Error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ success: false, message: '❌ Internal Server Error', error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/`);
});