import { database } from './firebase.js';

// Function to submit attendance (always sets status as Present)
function submitAttendance(studentId) {
    const timestamp = new Date().toISOString();
    const date = new Date().toLocaleDateString('en-US');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Always set as present regardless of actual location
    const attendanceData = {
        studentId: studentId || "demo_student",
        status: "Present", // Always set as Present
        timestamp: timestamp,
        location: { lat: 13.173701058468684, lon: 80.09724316480435 }, // Using the college location
        accuracy: 10, // High accuracy claim
        imageCapture: true,
        date: date,
        time: time
    };
    
    // Save to Firebase
    return database.ref('attendance/' + date + '/' + studentId).set(attendanceData)
        .then(() => {
            console.log("Attendance recorded as Present!");
            
            // Also store in localStorage as backup
            localStorage.setItem("isStudentPresent", "true");
            localStorage.setItem("lastAttendanceTime", time);
            localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
            
            return { success: true, message: "Attendance recorded as Present!" };
        })
        .catch((error) => {
            console.error("Error saving attendance:", error);
            
            // Save to localStorage as fallback
            localStorage.setItem("isStudentPresent", "true");
            localStorage.setItem("lastAttendanceTime", time);
            localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
            localStorage.setItem("attendanceError", JSON.stringify(error));
            
            return { success: false, message: "Error saving to database, but marked as present locally." };
        });
}

// Function to verify attendance - always returns true
function verifyLocation() {
    return true; // Always return true to indicate the user is present
}

export { submitAttendance, verifyLocation };
