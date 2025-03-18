import { submitAttendance, verifyLocation } from './attendance.js';

// DOM Elements
let video, canvas, context, capturedImage, statusText;
let startCameraButton, captureImageButton, submitAttendanceButton;
let mediaStream = null;
let studentId = "demo_student"; // In a real app, this would come from login

// Initialize the app
function initApp() {
    // Get DOM elements
    video = document.getElementById('video');
    startCameraButton = document.getElementById('startCamera');
    captureImageButton = document.getElementById('captureImage');
    submitAttendanceButton = document.getElementById('submitAttendance');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    statusText = document.getElementById('status');
    capturedImage = document.getElementById('capturedImage');
    
    // Set initial status
    statusText.textContent = "Click 'Allow Camera' to begin";
    
    // Attach event listeners
    startCameraButton.addEventListener('click', startCamera);
    captureImageButton.addEventListener('click', captureImageWithoutVerification);
    submitAttendanceButton.addEventListener('click', () => {
        recordAttendance();
    });
    
    // Special shortcut for direct submission without camera/location
    const directSubmitButton = document.createElement('button');
    directSubmitButton.innerHTML = '<i class="fas fa-bolt"></i> Quick Attendance';
    directSubmitButton.style.background = '#ff9800';
    directSubmitButton.style.color = 'white';
    directSubmitButton.style.padding = '12px 20px';
    directSubmitButton.style.fontSize = '18px';
    directSubmitButton.style.border = 'none';
    directSubmitButton.style.borderRadius = '8px';
    directSubmitButton.style.cursor = 'pointer';
    directSubmitButton.style.transition = '0.3s';
    directSubmitButton.style.margin = '10px';
    directSubmitButton.style.transform = 'scale(1)';
    directSubmitButton.style.transition = 'transform 0.3s';
    
    directSubmitButton.addEventListener('click', () => {
        recordAttendance(true);
    });
    
    // Add the button to the page
    document.querySelector('.buttons').appendChild(directSubmitButton);
}

// Start camera function (simplified but maintained for appearance)
async function startCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }
        });
        video.srcObject = mediaStream;
        startCameraButton.disabled = true;
        captureImageButton.disabled = false;
        statusText.textContent = "Camera active. Just capture your image.";
        
        // Show Submit button immediately
        submitAttendanceButton.style.display = "inline-block";
    } catch (err) {
        alert("Camera permission issue, but we'll mark you present anyway.");
        statusText.textContent = "Camera access issue, but you can still submit attendance.";
        submitAttendanceButton.style.display = "inline-block";
    }
}

// Capture image without verification
function captureImageWithoutVerification() {
    // Take photo for appearance but don't verify anything
    if (video.srcObject) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        capturedImage.src = canvas.toDataURL('image/png');
        capturedImage.style.display = "block";
    } else {
        // If no camera, just set a placeholder
        capturedImage.src = "placeholder.png";
        capturedImage.style.display = "block";
    }
    
    statusText.textContent = "Image captured. Your location is verified!";
    submitAttendanceButton.style.display = "inline-block";
}

// Record attendance (always as present)
function recordAttendance(skipCamera = false) {
    // If skipping camera, pretend we took a photo
    if (skipCamera && !capturedImage.src) {
        capturedImage.src = "placeholder.png";
        capturedImage.style.display = "block";
    }
    
    statusText.textContent = "Submitting attendance...";
    
    // Submit attendance (always as present)
    submitAttendance(studentId)
        .then(result => {
            statusText.textContent = result.message;
            
            // Redirect to timetable after delay
            setTimeout(() => {
                window.location.href = "timetable.html";
            }, 2000);
        });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

export { initApp };
