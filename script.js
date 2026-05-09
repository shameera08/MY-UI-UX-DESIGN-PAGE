let currentPage = 'signin';
let currentUserRole = null; // store current user role
let disasters = []; // store disaster reports
let map, markerLayer, clusterGroup, heatmapLayer, routingControl;
let clusteringEnabled = false;
let heatmapEnabled = false;
let userLocation = null;

// Load disasters from localStorage on page load
function loadDisastersFromStorage() {
    const storedDisasters = localStorage.getItem('rescueAIDisasters');
    if (storedDisasters) {
        disasters = JSON.parse(storedDisasters);
    }
}

// Save disasters to localStorage
function saveDisastersToStorage() {
    localStorage.setItem('rescueAIDisasters', JSON.stringify(disasters));
}

// Sample shelter locations for demo
const shelters = [
    {name: "Emergency Shelter A", lat: 28.7041, lng: 77.1025},
    {name: "Emergency Shelter B", lat: 19.0760, lng: 72.8777},
    {name: "Emergency Shelter C", lat: 13.0827, lng: 80.2707},
    {name: "Emergency Shelter D", lat: 22.5726, lng: 88.3639},
    {name: "Emergency Shelter E", lat: 12.9716, lng: 77.5946}
];

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    currentPage = pageId;

    // initialize map only once
    if (pageId === 'mapPage' && !map) initMap();
}



function toggleDesc(btn) {
    const desc = btn.nextElementSibling;
    if (desc.style.display === 'block') {
        desc.style.display = 'none';
        btn.textContent = btn.textContent.replace('Hide', 'View');
    } else {
        desc.style.display = 'block';
        btn.textContent = btn.textContent.replace('View', 'Hide');
        // Add animation
        desc.style.animation = 'fadeInUp 0.3s ease-out';
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Set background based on type
    if (type === 'success') {
        toast.style.background = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)';
    } else if (type === 'emergency') {
        toast.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        toast.classList.add('emergency-pulse');
    } else if (type === 'warning') {
        toast.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Enhanced search functionality for contacts
function searchContacts(query) {
    const cards = document.querySelectorAll('.emergency-card');
    const tips = document.querySelectorAll('.tip-card');
    const lowerQuery = query.toLowerCase();
    
    cards.forEach(card => {
        const service = card.dataset.service;
        const text = card.textContent.toLowerCase();
        if (text.includes(lowerQuery) || service.includes(lowerQuery)) {
            card.style.display = 'block';
            card.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            card.style.display = 'none';
        }
    });
    
    tips.forEach(tip => {
        const text = tip.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            tip.style.display = 'block';
            tip.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            tip.style.display = 'none';
        }
    });
}

// Emergency call function with confirmation
function makeCall(number) {
    const confirmed = confirm(`Are you sure you want to call ${number}? This is an emergency service.`);
    if (confirmed) {
        showToast(`Calling emergency number ${number}...`, 'emergency');
        window.location.href = `tel:${number}`;
    }
}

// Enhanced hazard interaction with risk assessment
function toggleDesc(btn) {
    const desc = btn.nextElementSibling;
    const hazardCard = btn.closest('.hazard');
    
    if (desc.style.display === 'block') {
        desc.style.display = 'none';
        btn.textContent = btn.textContent.replace('Hide', 'View');
        hazardCard.classList.remove('expanded');
    } else {
        desc.style.display = 'block';
        btn.textContent = btn.textContent.replace('View', 'Hide');
        hazardCard.classList.add('expanded');
        desc.style.animation = 'fadeInUp 0.3s ease-out';
        
        // Add risk level indicator
        addRiskIndicator(hazardCard);
    }
}

// Add risk level indicator to hazards
function addRiskIndicator(hazardCard) {
    const existingIndicator = hazardCard.querySelector('.risk-indicator');
    if (existingIndicator) return;
    
    const riskLevels = {
        'Earthquake': 'high',
        'Flood': 'high', 
        'Cyclone': 'high',
        'Tsunami': 'critical',
        'Fire': 'critical',
        'Pandemic': 'medium'
    };
    
    const hazardType = hazardCard.querySelector('h3').textContent;
    const riskLevel = riskLevels[hazardType] || 'medium';
    
    const indicator = document.createElement('div');
    indicator.className = 'risk-indicator';
    indicator.innerHTML = `
        <span class="risk-label">Risk Level:</span>
        <span class="risk-level ${riskLevel}">${riskLevel.toUpperCase()}</span>
    `;
    
    hazardCard.appendChild(indicator);
}

// First aid timer functionality
let firstAidTimer = null;
let timerSeconds = 0;

function startFirstAidTimer(procedure) {
    if (firstAidTimer) {
        clearInterval(firstAidTimer);
    }
    
    timerSeconds = 0;
    updateTimerDisplay();
    
    firstAidTimer = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
        
        // Alert at critical intervals
        if (timerSeconds === 120) {
            showToast('2 minutes elapsed - Check patient condition', 'warning');
        } else if (timerSeconds === 300) {
            showToast('5 minutes elapsed - Consider seeking professional help', 'warning');
        }
    }, 1000);
    
    showToast(`Timer started for ${procedure}`, 'success');
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    let timerDisplay = document.querySelector('.timer-display');
    if (!timerDisplay) {
        timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(timerDisplay);
    }
    
    timerDisplay.innerHTML = `⏱️ Timer: ${display}`;
}

function stopFirstAidTimer() {
    if (firstAidTimer) {
        clearInterval(firstAidTimer);
        firstAidTimer = null;
        
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.remove();
        }
        
        showToast('Timer stopped', 'info');
    }
}

// Enhanced first aid with step tracking
function toggleFirstAidSteps(btn) {
    const desc = btn.nextElementSibling;
    const aidItem = btn.closest('li');
    
    if (desc.style.display === 'block') {
        desc.style.display = 'none';
        btn.textContent = btn.textContent.replace('Hide', 'View');
        stopFirstAidTimer();
    } else {
        desc.style.display = 'block';
        btn.textContent = btn.textContent.replace('View', 'Hide');
        desc.style.animation = 'fadeInUp 0.3s ease-out';
        
        // Add step tracking
        addStepTracking(desc);
        
        // Start timer for procedures that need it
        const procedure = aidItem.querySelector('b').textContent;
        if (['CPR', 'Bleeding'].includes(procedure)) {
            startFirstAidTimer(procedure);
        }
    }
}

// Add interactive step tracking
function addStepTracking(desc) {
    const steps = desc.innerHTML.split('<br>');
    const trackedSteps = steps.map((step, index) => {
        const stepNum = index + 1;
        return `<div class="step-item" data-step="${stepNum}">
            <input type="checkbox" id="step${stepNum}" onchange="updateProgress()">
            <label for="step${stepNum}">${step}</label>
        </div>`;
    }).join('');
    
    desc.innerHTML = trackedSteps + '<div class="progress-bar"><div class="progress-fill"></div></div>';
}

// Update progress for first aid steps
function updateProgress() {
    const checkboxes = document.querySelectorAll('.step-item input[type="checkbox"]');
    const checked = document.querySelectorAll('.step-item input[type="checkbox"]:checked');
    const progress = (checked.length / checkboxes.length) * 100;
    
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
    
    if (progress === 100) {
        showToast('First aid procedure completed!', 'success');
        stopFirstAidTimer();
    }
}

// Enhanced login with animation
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('roleSelect').value;

    if (username && password) {
        // Set current user role
        currentUserRole = role;

        // Add loading animation
        const loginBtn = event.target;
        loginBtn.innerHTML = '<span class="loading"></span> Signing in...';
        loginBtn.disabled = true;

        setTimeout(() => {
            showToast(`Welcome ${username}! You are logged in as ${role.toUpperCase()}`, 'success');

            // Redirect based on role
            if (role === 'admin') {
                showPage('admin');
            } else {
                showPage('dashboard');
            }

            // Update sidebar visibility
            updateSidebarVisibility();

            loginBtn.innerHTML = 'Sign In';
            loginBtn.disabled = false;
        }, 1500);
    } else {
        showToast('Please enter username and password', 'warning');
    }
}

// Logout function
function logout() {
    // Clear user session
    currentUserRole = null;
    currentPage = 'signin';

    // Hide sidebar
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = 'none';

    // Show signin page
    showPage('signin');

    // Clear any active timers
    if (firstAidTimer) {
        clearInterval(firstAidTimer);
        firstAidTimer = null;
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.remove();
        }
    }

    // Show logout message
    showToast('Logged out successfully', 'info');
}

// Function to update sidebar visibility based on user role
function updateSidebarVisibility() {
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logoutBtn');
    if (currentUserRole === 'admin') {
        // Show sidebar for admins but only show logout button
        sidebar.style.display = 'block';
        const sidebarItems = document.querySelectorAll('#sidebar ul li');
        sidebarItems.forEach(item => {
            if (item.id === 'logoutBtn') {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    } else {
        // Show sidebar for users, but hide admin items and show logout if logged in
        sidebar.style.display = 'block';
        const sidebarItems = document.querySelectorAll('#sidebar ul li');
        sidebarItems.forEach(item => {
            const role = item.getAttribute('data-role');
            if (role === 'admin') {
                item.style.display = 'none';
            } else {
                item.style.display = 'block';
            }
        });
        // Show logout button for logged-in users
        if (currentUserRole) {
            logoutBtn.style.display = 'block';
        } else {
            logoutBtn.style.display = 'none';
        }
    }
}

// Enhanced alert system with notifications
function sendAlert() {
    const name = document.getElementById('alertName').value.trim();
    const email = document.getElementById('alertEmail').value.trim();
    const number = document.getElementById('alertNumber').value.trim();
    const message = document.getElementById('alertMessage').value.trim();
    
    if (!name || !email || !number || !message) { 
        showToast('Please fill all fields', 'warning'); 
        return; 
    }

    const alertList = document.getElementById('alertList');
    const li = document.createElement('li');
    const timestamp = new Date().toLocaleString();
    li.innerHTML = `
        <div class="alert-item">
            <strong>${name}</strong> (${number}, ${email})
            <br>${message}
            <br><small>${timestamp}</small>
        </div>
    `;
    alertList.appendChild(li);

    showToast('Emergency alert sent successfully!', 'success');
    
    // Clear form
    document.getElementById('alertName').value = '';
    document.getElementById('alertEmail').value = '';
    document.getElementById('alertNumber').value = '';
    document.getElementById('alertMessage').value = '';
}

// Enhanced disaster reporting with validation
function addDisaster() {
    const type = document.getElementById('disasterType').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    const desc = document.getElementById('descInput').value;
    const severity = document.getElementById('severityInput').value;

    if (isNaN(lat) || isNaN(lng)) {
        showToast('Please enter valid coordinates', 'warning');
        return;
    }

    if (!desc.trim()) {
        showToast('Please provide a description', 'warning');
        return;
    }

    const time = new Date().toLocaleString();
    const disaster = {type, lat, lng, desc, severity, time};
    disasters.push(disaster);
    updateDisasterTable();
    addMapMarker(disaster);
    
    // Show severity-based notification
    const message = `Disaster reported! Severity: ${severity}`;
    showToast(message, severity === 'High' ? 'emergency' : 'warning');
    
    // Clear form
    document.getElementById('latInput').value = '';
    document.getElementById('lngInput').value = '';
    document.getElementById('descInput').value = '';
}

// Page transition animations
function showPage(pageId) {
    // Role-based access control
    if (pageId === 'admin' && currentUserRole !== 'admin') {
        showToast('Access denied. Admin privileges required.', 'warning');
        return;
    }
    if (pageId === 'dashboard' && currentUserRole === 'admin') {
        showToast('Access denied. Admins cannot access user dashboard.', 'warning');
        return;
    }

    const currentPageElement = document.querySelector('.page.active');
    const nextPageElement = document.getElementById(pageId);

    // Fade out current page
    if (currentPageElement) {
        currentPageElement.style.animation = 'slideOutLeft 0.3s ease-out';
        setTimeout(() => {
            currentPageElement.classList.remove('active');
            currentPageElement.style.animation = '';
        }, 300);
    }

    // Fade in new page
    setTimeout(() => {
        nextPageElement.classList.add('active');
        nextPageElement.style.animation = 'slideInLeft 0.4s ease-out';
        currentPage = pageId;

        // Initialize map only once
        if (pageId === 'mapPage' && !map) initMap();
    }, currentPageElement ? 300 : 0);
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutLeft {
        to {
            transform: translateX(-50px);
            opacity: 0;
        }
    }
    
    .step-item {
        display: flex;
        align-items: center;
        margin: 8px 0;
        padding: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: 5px;
        transition: all 0.3s ease;
    }
    
    .step-item:hover {
        background: rgba(255,255,255,0.2);
        transform: translateX(5px);
    }
    
    .step-item input[type="checkbox"] {
        margin-right: 10px;
        transform: scale(1.2);
    }
    
    .step-item label {
        flex: 1;
        cursor: pointer;
    }
    
    .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255,255,255,0.3);
        border-radius: 4px;
        margin-top: 10px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2ecc71, #27ae60);
        border-radius: 4px;
        transition: width 0.3s ease;
        width: 0%;
    }
    
    .emergency-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 20px 0;
    }
    
    .emergency-card {
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        padding: 20px;
        border-radius: 15px;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    
    .emergency-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 15px 35px rgba(0,0,0,0.15);
    }
    
    .emergency-icon {
        font-size: 3em;
        margin-bottom: 10px;
        animation: pulse 2s infinite;
    }
    
    .emergency-number {
        font-size: 1.5em;
        font-weight: bold;
        margin: 10px 0;
    }
    
    .call-btn {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 10px;
    }
    
    .call-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 20px rgba(231, 76, 60, 0.3);
    }
    
    .emergency-tips {
        margin-top: 30px;
    }
    
    .tip-card {
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        padding: 15px;
        margin: 10px 0;
        border-radius: 10px;
        border-left: 4px solid #4a90e2;
        transition: all 0.3s ease;
    }
    
    .tip-card:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .alert-item {
        border-left: 3px solid #e74c3c;
        padding-left: 10px;
    }
    
    .risk-indicator {
        margin-top: 15px;
        padding: 10px;
        background: rgba(255,255,255,0.1);
        border-radius: 5px;
        font-weight: bold;
    }
    
    .risk-level {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        margin-left: 5px;
    }
    
    .risk-level.high {
        background: #e74c3c;
        color: white;
    }
    
    .risk-level.critical {
        background: #8b0000;
        color: white;
        animation: emergencyPulse 1.5s infinite;
    }
    
    .risk-level.medium {
        background: #f39c12;
        color: white;
    }
    
    .hazard.expanded {
        border: 2px solid #4a90e2;
        box-shadow: 0 15px 35px rgba(74, 144, 226, 0.2);
    }
`;
document.head.appendChild(style);

// Search functionality for first aid
function searchFirstAid(query) {
    const items = document.querySelectorAll('.aid-list li');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const procedure = item.dataset.procedure;
        const text = item.textContent.toLowerCase();
        
        if (text.includes(lowerQuery) || (procedure && procedure.includes(lowerQuery))) {
            item.style.display = 'block';
            item.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            item.style.display = 'none';
        }
    });
}

// Add emergency contact card styles
const emergencyStyle = document.createElement('style');
emergencyStyle.textContent = `
    .first-aid-tips {
        margin-bottom: 20px;
    }
    
    .emergency-contact-card {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 20px;
        border-radius: 15px;
        margin-top: 30px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(231, 76, 60, 0.3);
        animation: emergencyPulse 2s infinite;
    }
    
    .emergency-contact-card h3 {
        margin-bottom: 10px;
        font-size: 1.3em;
    }
    
    .emergency-contact-card p {
        margin-bottom: 15px;
        opacity: 0.9;
    }
    
    .emergency-call-btn {
        background: white;
        color: #e74c3c;
        border: none;
        padding: 12px 25px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 1.1em;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .emergency-call-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    
    .hazard {
        position: relative;
    }
    
    .hazard img {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .hazard img:hover {
        transform: scale(1.1) rotate(2deg);
        filter: drop-shadow(0 8px 15px rgba(0,0,0,0.3));
    }
    
    /* Enhanced hazard section with search */
    .hazards-container {
        position: relative;
    }
    
    .hazard-search {
        margin-bottom: 20px;
    }
    
    .severity-filter {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .severity-btn {
        padding: 8px 16px;
        border: 2px solid #4a90e2;
        background: white;
        color: #4a90e2;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
    }
    
    .severity-btn:hover {
        background: #4a90e2;
        color: white;
        transform: scale(1.05);
    }
    
    .severity-btn.active {
        background: #4a90e2;
        color: white;
    }
    
    /* Loading states */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    /* Accessibility enhancements */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0;
    }
    
    /* Focus indicators */
    button:focus,
    input:focus,
    select:focus,
    a:focus {
        outline: 3px solid #4a90e2;
        outline-offset: 2px;
    }
`;
document.head.appendChild(emergencyStyle);

// Enhanced hazard page with search and filtering
function addHazardSearch() {
    const hazardsSection = document.getElementById('hazards');
    if (!hazardsSection) return;
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'hazard-search';
    searchContainer.innerHTML = `
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search hazards..." onkeyup="searchHazards(this.value)">
            <span class="search-icon">🔍</span>
        </div>
    `;
    
    const severityContainer = document.createElement('div');
    severityContainer.className = 'severity-filter';
    severityContainer.innerHTML = `
        <button class="severity-btn active" onclick="filterBySeverity('all', this)">All</button>
        <button class="severity-btn" onclick="filterBySeverity('critical', this)">Critical</button>
        <button class="severity-btn" onclick="filterBySeverity('high', this)">High</button>
        <button class="severity-btn" onclick="filterBySeverity('medium', this)">Medium</button>
    `;
    
    hazardsSection.insertBefore(severityContainer, hazardsSection.querySelector('.hazard'));
    hazardsSection.insertBefore(searchContainer, hazardsSection.querySelector('.hazard'));
}

// Search hazards functionality
function searchHazards(query) {
    const hazards = document.querySelectorAll('.hazard');
    const lowerQuery = query.toLowerCase();
    
    hazards.forEach(hazard => {
        const text = hazard.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            hazard.style.display = 'block';
            hazard.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            hazard.style.display = 'none';
        }
    });
}

// Filter by severity
function filterBySeverity(severity, btn) {
    // Update active button
    document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const hazards = document.querySelectorAll('.hazard');
    const riskLevels = {
        'Earthquake': 'high',
        'Flood': 'high', 
        'Cyclone': 'high',
        'Tsunami': 'critical',
        'Fire': 'critical',
        'Pandemic': 'medium'
    };
    
    hazards.forEach(hazard => {
        const hazardType = hazard.querySelector('h3').textContent;
        const riskLevel = riskLevels[hazardType] || 'medium';
        
        if (severity === 'all' || riskLevel === severity) {
            hazard.style.display = 'block';
            hazard.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            hazard.style.display = 'none';
        }
    });
}

// Loading overlay functions
function showLoading(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div style="color: white; margin-top: 20px; font-size: 18px;">${message}</div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Enhanced map initialization with loading
function initMap() {
    showLoading('Loading map...');
    
    setTimeout(() => {
        map = L.map('map').setView([20, 78], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        markerLayer = L.layerGroup().addTo(map);

        disasters.forEach(d => addMapMarker(d));
        hideLoading();
        showToast('Map loaded successfully', 'success');
    }, 1000);
}

// Enhanced disaster reporting with loading states
function addDisaster() {
    const type = document.getElementById('disasterType').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    const desc = document.getElementById('descInput').value;
    const severity = document.getElementById('severityInput').value;

    if (isNaN(lat) || isNaN(lng)) {
        showToast('Please enter valid coordinates', 'warning');
        return;
    }

    if (!desc.trim()) {
        showToast('Please provide a description', 'warning');
        return;
    }

    showLoading('Reporting disaster...');

    // Simulate API call
    setTimeout(() => {
        const time = new Date().toLocaleString();
        const disaster = {type, lat, lng, desc, severity, time};
        disasters.push(disaster);
        saveDisastersToStorage();
        updateDisasterTable();
        addMapMarker(disaster);

        // Show severity-based notification
        const message = `Disaster reported! Severity: ${severity}`;
        showToast(message, severity === 'High' ? 'emergency' : 'warning');

        // Clear form
        document.getElementById('latInput').value = '';
        document.getElementById('lngInput').value = '';
        document.getElementById('descInput').value = '';

        hideLoading();
    }, 1500);
}

// Initialize enhanced features when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load disasters from localStorage
    loadDisastersFromStorage();

    // Add hazard search and filters
    addHazardSearch();

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals/overlays
        if (e.key === 'Escape') {
            hideLoading();
            const toast = document.querySelector('.toast');
            if (toast) {
                toast.remove();
            }
        }
    });

    // Show welcome toast
    setTimeout(() => {
        showToast('Welcome to RESCUE.AI - Your Emergency Assistant', 'success');
    }, 1000);
});

function toggleDisasterForm() {
    const form = document.getElementById('disasterForm');
    form.style.display = form.style.display === 'block' ? 'none' : 'block';
}

function addDisaster() {
    const type = document.getElementById('disasterType').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);
    const desc = document.getElementById('descInput').value;
    const severity = document.getElementById('severityInput').value;

    if (isNaN(lat) || isNaN(lng)) {
        alert('Invalid coordinates');
        return;
    }

    const time = new Date().toLocaleString();
    const disaster = {type, lat, lng, desc, severity, time};
    disasters.push(disaster);
    saveDisastersToStorage();
    updateDisasterTable();
    addMapMarker(disaster);
    alert('Disaster reported!');
}

// Disaster from report page
function addDisasterFromPage() {
    const type = document.getElementById('disasterType2').value;
    const lat = parseFloat(document.getElementById('latInput2').value);
    const lng = parseFloat(document.getElementById('lngInput2').value);
    const desc = document.getElementById('descInput2').value;
    const severity = document.getElementById('severityInput2').value;

    if (isNaN(lat) || isNaN(lng)) { alert('Invalid coordinates'); return; }

    const time = new Date().toLocaleString();
    const disaster = {type, lat, lng, desc, severity, time};
    disasters.push(disaster);
    updateDisasterTable();
    addMapMarker(disaster);
    alert('Disaster reported from report page!');
}

function updateDisasterTable() {
    const tbody = document.getElementById('disasterTableBody');
    const adminTbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    adminTbody.innerHTML = '';
    disasters.forEach((d, i) => {
        
        const row = `<tr>
            <td>${d.type}</td>
            <td>${d.lat}</td>
            <td>${d.lng}</td>
            <td>${d.time}</td>
            <td>${d.desc}</td>
            <td>${d.severity}</td>
        </tr>`;
        tbody.innerHTML += row;


        const adminRow = `<tr>
            <td>${d.type}</td>
            <td>${d.lat}</td>
            <td>${d.lng}</td>
            <td>${d.time}</td>
            <td>${d.desc}</td>
            <td>${d.severity}</td>
            <td><button onclick="deleteDisaster(${i})">Delete</button></td>
        </tr>`;
        adminTbody.innerHTML += adminRow;
    });
}

function deleteDisaster(index) {
    disasters.splice(index, 1);
    updateDisasterTable();
    refreshMapMarkers();
}

function sendAlert() {
    const name = document.getElementById('alertName').value.trim();
    const email = document.getElementById('alertEmail').value.trim();
    const number = document.getElementById('alertNumber').value.trim();
    const message = document.getElementById('alertMessage').value.trim();
    if (!name || !email || !number || !message) { alert('Fill all fields'); return; }

    const alertList = document.getElementById('alertList');
    const li = document.createElement('li');
    li.textContent = `${name} (${number}, ${email}): ${message}`;
    alertList.appendChild(li);

    alert('Emergency alert sent!');
    document.getElementById('alertName').value = '';
    document.getElementById('alertEmail').value = '';
    document.getElementById('alertNumber').value = '';
    document.getElementById('alertMessage').value = '';
}

function initMap() {
    map = L.map('map').setView([20, 78], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    markerLayer = L.layerGroup().addTo(map);

    disasters.forEach(d => addMapMarker(d));
}


function addMapMarker(disaster) {
    if (!map) return;
    const color = disaster.severity === 'High' ? 'red' : disaster.severity === 'Medium' ? 'orange' : 'green';
    const marker = L.circleMarker([disaster.lat, disaster.lng], {
        color: color,
        radius: 10
    }).bindPopup(`<b>${disaster.type}</b><br>${disaster.desc}<br>Severity: ${disaster.severity}`);
    markerLayer.addLayer(marker);
}


function refreshMapMarkers() {
    markerLayer.clearLayers();
    disasters.forEach(d => addMapMarker(d));
}

function trackLocation() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        userLocation = {lat, lng};
        map.setView([lat, lng], 12);
        L.marker([lat, lng]).addTo(map).bindPopup('You are here').openPopup();
    }, () => { alert('Unable to retrieve location'); });
}

// Fill location inputs in disaster reporting forms
function fillLocation(formType) {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported by this browser', 'warning');
        return;
    }

    showToast('Getting your current location...', 'info');

    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);

        if (formType === 'dashboard') {
            document.getElementById('latInput').value = lat;
            document.getElementById('lngInput').value = lng;
        } else if (formType === 'disasterReport') {
            document.getElementById('latInput2').value = lat;
            document.getElementById('lngInput2').value = lng;
        }

        showToast('Location filled successfully!', 'success');
    }, error => {
        let errorMessage = 'Unable to retrieve location';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location access denied. Please enable location permissions.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable.';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out.';
                break;
        }
        showToast(errorMessage, 'warning');
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    });
}

// Toggle clustering feature
function toggleClustering() {
    if (!map) return;
    
    clusteringEnabled = !clusteringEnabled;
    const btn = event.target;
    
    if (clusteringEnabled) {
        // Enable clustering
        markerLayer.clearLayers();
        clusterGroup = L.markerClusterGroup();
        
        disasters.forEach(d => {
            const color = d.severity === 'High' ? 'red' : d.severity === 'Medium' ? 'orange' : 'green';
            const marker = L.circleMarker([d.lat, d.lng], {
                color: color,
                radius: 10
            }).bindPopup(`<b>${d.type}</b><br>${d.desc}<br>Severity: ${d.severity}`);
            clusterGroup.addLayer(marker);
        });
        
        map.addLayer(clusterGroup);
        btn.classList.add('active');
        alert('Clustering enabled - markers will group when zoomed out');
    } else {
        // Disable clustering
        if (clusterGroup) {
            map.removeLayer(clusterGroup);
            clusterGroup = null;
        }
        refreshMapMarkers();
        btn.classList.remove('active');
        alert('Clustering disabled');
    }
}

// Toggle heatmap feature
function toggleHeatmap() {
    if (!map) return;
    
    heatmapEnabled = !heatmapEnabled;
    const btn = event.target;
    
    if (heatmapEnabled) {
        // Create heatmap data
        const heatData = disasters.map(d => {
            const intensity = d.severity === 'High' ? 1 : d.severity === 'Medium' ? 0.6 : 0.3;
            return [d.lat, d.lng, intensity];
        });
        
        if (heatData.length === 0) {
            alert('No disaster data to display as heatmap');
            return;
        }
        
        heatmapLayer = L.heatLayer(heatData, {
            radius: 40,
            blur: 30,
            maxZoom: 10,
            gradient: {0.4: 'green', 0.6: 'yellow', 0.8: 'orange', 1: 'red'}
        }).addTo(map);
        
        btn.classList.add('active');
        alert('Heatmap enabled - shows disaster intensity');
    } else {
        // Remove heatmap
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }
        btn.classList.remove('active');
        alert('Heatmap disabled');
    }
}

// Show evacuation routes
function showEvacuationRoutes() {
    if (!map) return;
    
    // Add sample shelters to map
    shelters.forEach(shelter => {
        const shelterIcon = L.divIcon({
            className: 'shelter-icon',
            html: '🏥',
            iconSize: [30, 30]
        });
        
        L.marker([shelter.lat, shelter.lng], {icon: shelterIcon})
            .bindPopup(`<b>${shelter.name}</b><br>Emergency Shelter`)
            .addTo(map);
    });
    
    alert('Evacuation shelters shown on map. Use "Find Nearest Shelter" to get directions.');
}

// Clear all routes
function clearRoutes() {
    if (!map) return;
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    alert('Routes cleared');
}

// Find nearest shelter and show route
function findNearestShelter() {
    if (!map) return;

    if (!userLocation) {
        alert('Please track your location first');
        return;
    }

    // Find nearest shelter
    let nearestShelter = null;
    let minDistance = Infinity;

    shelters.forEach(shelter => {
        const distance = Math.sqrt(
            Math.pow(shelter.lat - userLocation.lat, 2) +
            Math.pow(shelter.lng - userLocation.lng, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestShelter = shelter;
        }
    });

    if (nearestShelter) {
        // Clear previous route
        if (routingControl) {
            map.removeControl(routingControl);
        }

        // Create routing control
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(userLocation.lat, userLocation.lng),
                L.latLng(nearestShelter.lat, nearestShelter.lng)
            ],
            routeWhileDragging: true,
            showAlternatives: true,
            lineOptions: {
                styles: [{color: '#2ecc71', weight: 6, opacity: 0.7}]
            },
            createMarker: function() { return null; } // Don't create default markers
        }).addTo(map);

        alert(`Route to ${nearestShelter.name} displayed`);
    }
}

// Admin Control Panel Functions

// Update admin statistics
function updateAdminStats() {
    const totalDisasters = disasters.length;
    const highSeverity = disasters.filter(d => d.severity === 'High').length;
    const mediumSeverity = disasters.filter(d => d.severity === 'Medium').length;
    const lowSeverity = disasters.filter(d => d.severity === 'Low').length;

    document.getElementById('totalDisasters').textContent = totalDisasters;
    document.getElementById('highSeverity').textContent = highSeverity;
    document.getElementById('mediumSeverity').textContent = mediumSeverity;
    document.getElementById('lowSeverity').textContent = lowSeverity;
}

// Filter admin table
function filterAdminTable() {
    const searchTerm = document.getElementById('adminSearch').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const severityFilter = document.getElementById('severityFilter').value;
    const rows = document.querySelectorAll('#adminTableBody tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const type = cells[0].textContent;
        const severity = cells[5].textContent;
        const description = cells[4].textContent.toLowerCase();

        const matchesSearch = description.includes(searchTerm);
        const matchesType = typeFilter === '' || type === typeFilter;
        const matchesSeverity = severityFilter === '' || severity === severityFilter;

        if (matchesSearch && matchesType && matchesSeverity) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Toggle select all checkboxes
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#adminTableBody input[type="checkbox"]');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateBulkDeleteButton();
}

// Update bulk delete button visibility
function updateBulkDeleteButton() {
    const checkboxes = document.querySelectorAll('#adminTableBody input[type="checkbox"]:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    if (checkboxes.length > 0) {
        bulkDeleteBtn.style.display = 'inline-block';
    } else {
        bulkDeleteBtn.style.display = 'none';
    }
}

// Bulk delete selected disasters
function bulkDelete() {
    const checkboxes = document.querySelectorAll('#adminTableBody input[type="checkbox"]:checked');
    const indicesToDelete = Array.from(checkboxes).map(checkbox => {
        return parseInt(checkbox.closest('tr').dataset.index);
    }).sort((a, b) => b - a); // Sort in descending order

    if (indicesToDelete.length === 0) {
        showToast('No disasters selected', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to delete ${indicesToDelete.length} disaster(s)?`)) {
        indicesToDelete.forEach(index => {
            disasters.splice(index, 1);
        });

        updateDisasterTable();
        updateAdminStats();
        updateTypeBreakdown();
        refreshMapMarkers();
        showToast(`${indicesToDelete.length} disaster(s) deleted successfully`, 'success');
    }
}

// Export disasters to CSV
function exportToCSV() {
    if (disasters.length === 0) {
        showToast('No disaster data to export', 'warning');
        return;
    }

    const headers = ['Type', 'Latitude', 'Longitude', 'Time', 'Description', 'Severity'];
    const csvContent = [
        headers.join(','),
        ...disasters.map(d => [
            d.type,
            d.lat,
            d.lng,
            `"${d.time}"`,
            `"${d.desc.replace(/"/g, '""')}"`,
            d.severity
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `disasters_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Disaster data exported to CSV', 'success');
}

// Update disaster type breakdown
function updateTypeBreakdown() {
    const typeCounts = {};
    disasters.forEach(d => {
        typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    });

    const breakdownContainer = document.getElementById('typeBreakdown');
    breakdownContainer.innerHTML = '';

    Object.entries(typeCounts).forEach(([type, count]) => {
        const typeItem = document.createElement('div');
        typeItem.className = 'type-item';
        typeItem.textContent = `${type}: ${count}`;
        breakdownContainer.appendChild(typeItem);
    });
}

// Enhanced admin table update with checkboxes and data attributes
function updateAdminTable() {
    const adminTbody = document.getElementById('adminTableBody');
    adminTbody.innerHTML = '';

    disasters.forEach((d, i) => {
        const row = document.createElement('tr');
        row.dataset.index = i;

        row.innerHTML = `
            <td><input type="checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${d.type}</td>
            <td>${d.lat}</td>
            <td>${d.lng}</td>
            <td>${d.time}</td>
            <td>${d.desc}</td>
            <td>${d.severity}</td>
            <td><button onclick="deleteDisaster(${i})" class="delete-btn">Delete</button></td>
        `;

        adminTbody.appendChild(row);
    });

    updateAdminStats();
    updateTypeBreakdown();
}

// Enhanced delete disaster function
function deleteDisaster(index) {
    if (confirm('Are you sure you want to delete this disaster?')) {
        disasters.splice(index, 1);
        updateDisasterTable();
        updateAdminStats();
        updateTypeBreakdown();
        refreshMapMarkers();
        showToast('Disaster deleted successfully', 'success');
    }
}

// Initialize admin page when shown
function initAdminPage() {
    updateAdminTable();
    updateAdminStats();
    updateTypeBreakdown();
}

// Override showPage to initialize admin page
const originalShowPage = showPage;
showPage = function(pageId) {
    originalShowPage(pageId);
    if (pageId === 'admin') {
        setTimeout(initAdminPage, 100); // Small delay to ensure DOM is updated
    }
};
