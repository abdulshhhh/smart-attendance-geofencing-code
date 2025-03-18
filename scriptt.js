document.getElementById('date').textContent = new Date().toLocaleDateString();

// When the student marks attendance, send the data to the backend
document.querySelectorAll('.period-buttons button').forEach(button => {
    button.addEventListener('click', function() {
        const period = this.getAttribute('data-period');
        const status = "Present"; 

        fetch("http://localhost:5000/mark-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ period, status }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Period ${period} marked as Present!`);
                window.location.href = "timetable.html"; // Redirect to timetable page
            }
        })
        .catch(error => console.error("Error:", error));
    });
});

// Fetch attendance data and update the timetable
if (window.location.pathname.includes("timetable.html")) {
    fetch("http://localhost:5000/get-attendance")
        .then(response => response.json())
        .then(attendance => {
            document.querySelectorAll('.period-status').forEach(periodElement => {
                const period = periodElement.getAttribute("data-period");
                periodElement.textContent = attendance[period] || "Absent";
            });
        });
}
