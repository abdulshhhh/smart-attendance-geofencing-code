require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';

// More permissive CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
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

// Connect to MongoDB with more detailed error handling
console.log('Attempting to connect to MongoDB at:', MONGO_URI);
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit the process, let the server run anyway
  });

// Define Attendance Schema
const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: true, enum: ['Present', 'Absent'] },
  locationVerified: { type: Boolean, required: true }
}, { 
  timestamps: true // Add createdAt and updatedAt fields
});

// Create model if it doesn't exist already
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// Root route for checking server status
app.get('/', (req, res) => {
  res.send('Attendance API is running');
});

// API Route to Submit Attendance with better error handling
app.post('/api/attendance', async (req, res) => {
  try {
    console.log('Received attendance data:', req.body);
    
    // Check if the request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Request body is empty"
      });
    }

    const { userId, date, time, status, locationVerified } = req.body;
    
    // More detailed validation
    const validationErrors = [];
    if (!userId) validationErrors.push("userId is required");
    if (!date) validationErrors.push("date is required");
    if (!time) validationErrors.push("time is required");
    if (!status) validationErrors.push("status is required");
    if (locationVerified === undefined) validationErrors.push("locationVerified is required");
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Create and save the attendance record
    const attendance = new Attendance({
      userId,
      date,
      time,
      status,
      locationVerified,
      timestamp: new Date()
    });

    const savedAttendance = await attendance.save();
    console.log('✅ Attendance saved successfully:', savedAttendance);
    
    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: savedAttendance
    });
  } catch (error) {
    console.error('❌ Error saving attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
});

// API Route to Get Attendance Records
app.get('/api/attendance', async (req, res) => {
  try {
    const data = await Attendance.find().sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("❌ Error fetching attendance data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/`);
});