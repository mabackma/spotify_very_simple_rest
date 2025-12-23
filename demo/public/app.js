// API client for the REST Macro Demo
const API_URL = 'http://localhost:8080/api';
const ROOT_URL = 'http://localhost:8080';
let authToken = localStorage.getItem('authToken') || '';
let userRole = '';

// DOM Elements
const authOutput = document.getElementById('authOutput');
const tracksOutput = document.getElementById('tracksOutput');
const trackUpdatedOutput = document.getElementById('trackUpdatedOutput');
const tokenDisplay = document.getElementById('tokenDisplay');

const trackUpdateArtistName = document.getElementById('trackUpdateArtistName');
const trackUpdateTrackName = document.getElementById('trackUpdateTrackName');

// Show token if it exists
if (authToken) {
    tokenDisplay.innerHTML = `<span class="success">Token loaded from storage!</span>`;
    // Get user info
    fetchUserInfo();
}

// Event Listeners
document.getElementById('registerBtn').addEventListener('click', register);
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('createTrackBtn').addEventListener('click', createTrack);
document.getElementById('deleteTrackBtn').addEventListener('click', deleteTrack);
document.getElementById('getTracksBtn').addEventListener('click', getTracks);

document.getElementById('loadTrackForUpdateBtn').addEventListener('click', loadTrack);
document.getElementById('updateTrackBtn').addEventListener('click', updateTrack);
document.getElementById('patchTrackBtn').addEventListener('click', patchTrack);

// Helper functions
function displayError(outputElement, message) {
    outputElement.innerHTML = `<span class="error">Error: ${message}</span>`;
}

function displaySuccess(outputElement, message) {
    outputElement.innerHTML = `<span class="success">${message}</span>`;
}

function displayJSON(outputElement, data) {
    outputElement.innerHTML = JSON.stringify(data, null, 2);
}

async function fetchJson(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');
        
        if (response.status >= 400) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'API Error');
            } else {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP Error ${response.status}`);
            }
        }
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    } catch (error) {
        throw error;
    }
}

// Auth functions
async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        displayError(authOutput, 'Email and password are required');
        return;
    }
    
    try {
        const data = { email, password };
        const response = await fetchJson(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        displaySuccess(authOutput, 'Registration successful! Please login.');
    } catch (error) {
        displayError(authOutput, error.message);
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        displayError(authOutput, 'Email and password are required');
        return;
    }
    
    try {
        const data = { email, password };
        const response = await fetchJson(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        authToken = response.token;
        localStorage.setItem('authToken', authToken);
        displaySuccess(authOutput, 'Login successful!');
        tokenDisplay.innerHTML = `<span class="success">Auth token received and stored!</span>`;
        
        // Get user info after login
        fetchUserInfo();
    } catch (error) {
        displayError(authOutput, error.message);
    }
}

async function fetchUserInfo() {
    if (!authToken) {
        displayError(authOutput, 'Not logged in');
        return;
    }
    
    try {
        const userData = await fetchJson(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        userRole = userData.roles[0];
        authOutput.innerHTML = `Logged in as: ${userRole} role`;
    } catch (error) {
        displayError(authOutput, 'Failed to get user info: ' + error.message);
    }
}

// Track functions
async function createTrack() {
    if (!authToken) {
        displayError(tracksOutput, 'You must be logged in to create tracks');
        return;
    }

    const artistName = document.getElementById('trackArtistName').value;
    const trackName = document.getElementById('trackTrackName').value;
    
    if (!artistName || !trackName) {
        displayError(tracksOutput, 'Artist name and track name are required');
        return;
    }
    
    try {
        const data = { artistName, trackName };
        const response = await fetchJson(`${API_URL}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        displaySuccess(tracksOutput, 'Track created successfully!');
        document.getElementById('trackArtistName').value = '';
        document.getElementById('trackTrackName').value = '';
        
        // Refresh tracks list
        getTracks();
    } catch (error) {
        displayError(tracksOutput, error.message);
    }
}

async function deleteTrack() {
    console.log("Attempting to delete track...");
    if (!authToken) {
        displayError(tracksOutput, 'You must be logged in to delete tracks');
        console.error('Delete Track Error: Not authenticated.');
        return;
    }

    const id = document.getElementById('trackIdToDelete').value;
    
    if (!id) {
        displayError(tracksOutput, 'Id is required');
        console.error('Delete Track Error: No ID specified.');
        return;
    }
    
    try {
        console.log(`Sending DELETE request for track ID: ${id}`);
        const response = await fetchJson(`${API_URL}/track/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
        });
        
        displaySuccess(tracksOutput, 'Track deleted successfully!');
        console.log(`Track ID: ${id} deleted successfully.`);
        document.getElementById('trackIdToDelete').value = '';
        
        // Refresh tracks list
        getTracks();
    } catch (error) {
        displayError(tracksOutput, error.message);
        console.error('Delete Track Error:', error.message);
    }
}

async function getTracks() {
    try {
        const tracks = await fetchJson(`${API_URL}/track`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });

        displayJSON(tracksOutput, tracks);
    } catch (error) {
        displayError(tracksOutput, error.message);
    }
}

async function loadTrack() {
    console.log('in loadTrack function');
    const id = document.getElementById('trackToUpdateId').value;
    if (!id) return;

    const track = await fetchJson(`${API_URL}/track/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    document.getElementById('trackUpdateArtistName').value = track.artist_name;
    document.getElementById('trackUpdateTrackName').value = track.track_name;
}

async function updateTrack() {
    if (!authToken) {
        displayError(trackUpdatedOutput, 'You must be logged in to update tracks');
        return;
    }

    const id = Number(document.getElementById('trackToUpdateId').value);
    const artistName = document.getElementById('trackUpdateArtistName').value;
    const trackName = document.getElementById('trackUpdateTrackName').value;
    
    if (!artistName || !trackName) {
        displayError(trackUpdatedOutput, 'Artist name and track name are required');
        return;
    }
    
    try {
        const data = { artistName, trackName };
        const response = await fetchJson(`${API_URL}/track/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        displaySuccess(trackUpdatedOutput, 'Track edited successfully!');
        
        // Refresh tracks list
        getTracks();
    } catch (error) {
        displayError(trackUpdatedOutput, error.message);
    }
}

async function patchTrack() {
    if (!authToken) {
        displayError(trackUpdatedOutput, 'You must be logged in to update tracks');
        return;
    }

    const id = Number(document.getElementById('trackToUpdateId').value);
    const track_name = document.getElementById('trackUpdateTrackName').value;
    
    try {
        const data = { track_name };
        const response = await fetchJson(`${API_URL}/track/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        displaySuccess(trackUpdatedOutput, 'Track edited successfully!');

        // Refresh tracks list
        getTracks();
    } catch (error) {
        displayError(trackUpdatedOutput, error.message);
    }
}
