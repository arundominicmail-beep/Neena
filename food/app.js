document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // State Management
    // =========================================================================
    let currentDate = new Date(); // Represents the day we are currently viewing
    const caloriesGoal = 2000; // Hardcoded daily goal for progress ring math

    // DOM Elements
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const dateDisplay = document.getElementById('date-display');
    const fullDateDisplay = document.getElementById('full-date-display');

    const totalCaloriesEl = document.getElementById('total-calories');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const entriesListEl = document.getElementById('entries-list');

    const addFab = document.getElementById('add-fab');
    const entryModal = document.getElementById('entry-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addForm = document.getElementById('add-form');

    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file');

    // Set up SVG Progress Ring calculation
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        updateDateDisplay();
        renderDataForCurrentDate();
        setupEventListeners();
    }

    // =========================================================================
    // Core Logic functions
    // =========================================================================

    // Returns a string key like "2024-10-25" for localStorage lookup
    function getDateKey(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Get data array for the currently selected date
    function getEntriesForDate(dateKey) {
        const dataStr = localStorage.getItem(`food_logger_${dateKey}`);
        return dataStr ? JSON.parse(dataStr) : [];
    }

    // Save data array back to localStorage
    function saveEntriesForDate(dateKey, entries) {
        localStorage.setItem(`food_logger_${dateKey}`, JSON.stringify(entries));
    }

    function updateDateDisplay() {
        const today = new Date();
        const isToday = getDateKey(currentDate) === getDateKey(today);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = getDateKey(currentDate) === getDateKey(yesterday);

        // Update H1 title
        if (isToday) {
            dateDisplay.textContent = "Today";
        } else if (isYesterday) {
            dateDisplay.textContent = "Yesterday";
        } else {
            // Show formatted short date like "Oct 25"
            dateDisplay.textContent = currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }

        // Always show full date on the paragraph (e.g., "Friday, October 25, 2024")
        fullDateDisplay.textContent = currentDate.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function setProgressRing(totalCals) {
        // Cap the percentage at 100% so we don't break the SVG
        const percent = Math.min(totalCals / caloriesGoal, 1);
        const offset = circumference - percent * circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Change color based on goal completion
        if (percent >= 1) {
            progressCircle.style.stroke = "var(--danger)"; // Turn red if over goal
        } else {
            progressCircle.style.stroke = "var(--primary-color)"; // Normal blue
        }
    }

    function renderDataForCurrentDate() {
        const dateKey = getDateKey(currentDate);
        const entries = getEntriesForDate(dateKey);

        // Calculate total calories
        const totalCals = entries.reduce((sum, item) => sum + item.calories, 0);

        // Animate counter logic could go here, but a simple text assignment for now
        totalCaloriesEl.textContent = totalCals.toLocaleString();

        // Update SVG Progress
        setProgressRing(totalCals);

        // Render List
        entriesListEl.innerHTML = ''; // clear

        if (entries.length === 0) {
            entriesListEl.innerHTML = `
                <div class="empty-state">
                    <p>No meals logged for this date.</p>
                    <p>Click + to add a meal!</p>
                </div>
            `;
            return;
        }

        entries.forEach((item, index) => {
            const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            const div = document.createElement('div');
            div.className = 'entry-item';
            div.innerHTML = `
                <div class="entry-info">
                    <span class="entry-name">${escapeHTML(item.name)}</span>
                    ${timeStr ? `<span class="entry-time">${timeStr}</span>` : ''}
                </div>
                <div class="entry-calories">
                    <span>${item.calories} kcal</span>
                    <button class="delete-btn" data-index="${index}" aria-label="Delete entry">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            `;
            entriesListEl.appendChild(div);
        });

        // Add listeners to new delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                deleteEntry(index);
            });
        });
    }

    function deleteEntry(index) {
        const dateKey = getDateKey(currentDate);
        const entries = getEntriesForDate(dateKey);
        entries.splice(index, 1);
        saveEntriesForDate(dateKey, entries);
        renderDataForCurrentDate();
    }

    // =========================================================================
    // Data Import / Export (Persistence to TXT)
    // =========================================================================

    function exportData() {
        // Collect all localStorage keys that match our app's pattern
        const allData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('food_logger_')) {
                allData[key] = JSON.parse(localStorage.getItem(key));
            }
        }

        // Convert to a JSON string
        const jsonStr = JSON.stringify(allData, null, 2);

        // Create a blob and trigger a download
        const blob = new Blob([jsonStr], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `food_logs_backup_${getDateKey(new Date())}.txt`;

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);

                // Optional: Ask for confirmation
                if (!confirm("Are you sure you want to restore this backup? This will merge with your current data, potentially overwriting matching dates.")) {
                    return;
                }

                // Write keys to local storage
                for (const key in importedData) {
                    if (key.startsWith('food_logger_')) {
                        localStorage.setItem(key, JSON.stringify(importedData[key]));
                    }
                }

                alert("Backup restored successfully!");
                renderDataForCurrentDate(); // Refresh view

            } catch (err) {
                alert("Error importing the file. Please make sure it's a valid Data file exported from this app.");
                console.error("Import Error:", err);
            }

            // Reset input so the same file could be imported again if needed
            importFileInput.value = '';
        };

        reader.readAsText(file);
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================
    function setupEventListeners() {
        // Date Navigation
        prevBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            updateDateDisplay();
            renderDataForCurrentDate();
        });

        nextBtn.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            updateDateDisplay();
            renderDataForCurrentDate();
        });

        // Modal triggers
        addFab.addEventListener('click', () => {
            entryModal.classList.remove('hidden');
            document.getElementById('food-name').focus();
        });

        closeModalBtn.addEventListener('click', () => {
            entryModal.classList.add('hidden');
            addForm.reset();
        });

        // Close modal if clicking outside content
        entryModal.addEventListener('click', (e) => {
            if (e.target === entryModal) {
                entryModal.classList.add('hidden');
                addForm.reset();
            }
        });

        // Form Submission
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('food-name');
            const calInput = document.getElementById('calories');

            const newEntry = {
                id: Date.now().toString(),
                name: nameInput.value.trim(),
                calories: parseInt(calInput.value),
                timestamp: new Date().toISOString()
            };

            const dateKey = getDateKey(currentDate);
            const entries = getEntriesForDate(dateKey);
            entries.push(newEntry);
            saveEntriesForDate(dateKey, entries);

            // Clean up
            addForm.reset();
            entryModal.classList.add('hidden');

            // Re-render
            renderDataForCurrentDate();
        });

        // Import/Export
        exportBtn.addEventListener('click', exportData);
        importFileInput.addEventListener('change', importData);
    }

    // Basic HTML escaping utility
    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    // Boot the app
    init();
});
