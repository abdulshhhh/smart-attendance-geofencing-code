require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Atlas connection string 
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://abdu:abdul@smart00.5f08w.mongodb.net/attendance?retryWrites=true&w=majority&appName=smart00';

// Log which database we're connecting to
console.log('Attempting to connect to MongoDB Atlas at cluster:', MONGO_URI.split('@')[1].split('.')[0]);

// Enhanced CORS configuration to fix "Failed to fetch" errors - more permissive for troubleshooting
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: '*',
  allowedHeaders: '*',
  credentials: true
}));

// Middleware for parsing request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // Log request body for debugging (except for large payloads)
  if (['POST', 'PUT'].includes(req.method) && req.body) {
    console.log('Request body:', JSON.stringify(req.body).substring(0, 200) + '...');
  }
  next();
});

// Create a MongoClient with a MongoClientOptions object (for native MongoDB driver connection)
const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect using native MongoDB driver first to verify connection
(async () => {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Native MongoDB driver: Successfully connected to MongoDB Atlas!");
    
    // Get list of databases to verify connection
    const adminDb = client.db("admin");
    const dbs = await adminDb.admin().listDatabases();
    console.log("✅ Available databases:", dbs.databases.map(db => db.name).join(', '));
    
    // Keep connection open for application use
    // We won't call client.close() here since we want to keep the connection
  } catch (err) {
    console.error("❌ Native MongoDB driver connection error:", err);
  }
})();

// Also connect using Mongoose (which your application is built with)
mongoose.connect(MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Mongoose: Connected to MongoDB Atlas successfully');
  console.log(`✅ Database name: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
  console.error('❌ Mongoose connection error:', err.message);
  if (err.message.includes('ENOTFOUND')) {
    console.error('❌ Could not resolve the hostname. Check your internet connection and the cluster name.');
  } else if (err.message.includes('Authentication failed')) {
    console.error('❌ Authentication failed. Check your username and password in the connection string.');
  }
  process.exit(1); // Exit process if connection fails
});

// Helper function to get the MongoDB native driver connection (useful for operations not supported by Mongoose)
const getMongoClient = () => client;

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

// Add a test endpoint for connection testing
app.get('/api/test', async (req, res) => {
  try {
    // Test MongoDB connection with native driver
    const dbClient = getMongoClient();
    const pingResult = await dbClient.db("admin").command({ ping: 1 });
    
    res.json({ 
      message: "API is working properly", 
      timestamp: new Date().toISOString(),
      mongoConnection: pingResult.ok === 1 ? "Connected" : "Failed",
      database: mongoose.connection.db.databaseName
    });
  } catch (error) {
    res.status(500).json({ 
      message: "API is working but database connection failed", 
      error: error.message 
    });
  }
});

// ✅ Enhanced API Route to Submit Attendance with improved error handling
app.post('/api/attendance', async (req, res) => {
  console.log('Received attendance submission:', req.body);
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
      console.log('❌ Missing required fields:', { userId, date, time, status });
      return res.status(400).json({
        success: false,
        message: "❌ Missing required fields: userId, date, time, or status."
      });
    }

    // Check if attendance already exists for this user on this date
    const existingRecord = await Attendance.findOne({ userId, date }).lean();
    if (existingRecord) {
      console.log('⚠️ Duplicate attendance record for user:', userId, 'on date:', date);
      return res.status(400).json({
        success: false,
        message: "⚠️ Attendance already recorded for today."
      });
    }

    // Create attendance object with all fields, using defaults for optional fields
    const attendance = new Attendance({ 
      userId, 
      date, 
      time, 
      status, 
      locationVerified: locationVerified || false,
      location: location || { lat: null, lon: null },
      altitude: altitude || null, 
      accuracy: accuracy || null
    });
    
    const savedAttendance = await attendance.save();
    console.log('✅ Attendance saved successfully:', savedAttendance._id);

    res.status(201).json({
      success: true,
      message: "✅ Attendance recorded successfully",
      data: savedAttendance
    });
  } catch (error) {
    console.error("❌ Attendance Save Error:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "❌ Failed to record attendance",
      error: error.message
    });
  }
});

// Rest of your existing API routes remain the same...
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

// Graceful shutdown function to close MongoDB connections
const gracefulShutdown = async () => {
  console.log('Shutting down server...');
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed');
    await client.close();
    console.log('MongoDB native client closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Handle application termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Test the API at: http://localhost:${PORT}/`);
  console.log(`Test MongoDB connection at: http://localhost:${PORT}/api/test`);
});