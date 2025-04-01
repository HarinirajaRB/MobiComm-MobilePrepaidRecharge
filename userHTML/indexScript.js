// Constants
const API_BASE_URL = 'http://localhost:8015'; // Update this with your actual API URL
const AUTH_TOKEN_KEY = 'mobi_comm_auth_token';
const TOKEN_EXPIRY_KEY = 'mobi_comm_token_expiry';

// DOM Elements

const validateForm = document.getElementById('validateForm');
const mobileNumberInput = document.getElementById('mobileNumber');
const validateButton = document.getElementById('validateButton');
const validateSpinner = document.getElementById('validateSpinner');
const statusMessage = document.getElementById('statusMessage');
const registerForm = document.getElementById('registerForm');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
validateButton.addEventListener('click', validateMobileNumber);
mobileNumberInput.addEventListener('input', validateMobileInput);

/**
 * Initialize the application
 */
function initializeApp() {
    // Check if we have a valid token already
    refreshTokenIfNeeded();
}

/**
 * Check if token needs refreshing and get a new one if needed
 */
async function refreshTokenIfNeeded() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    // If no token or token is expired (or about to expire in 5 minutes)
    if (!token || !expiryTime || Date.now() > (parseInt(expiryTime) - 300000)) {
        try {
            await getNewToken();
        } catch (error) {
            console.error('Failed to refresh token:', error);
        }
    }
}

/**
 * Get a new authentication token
 */
async function getNewToken() {
    try {
        // Using a default user for token generation - adjust as needed
        // This assumes you have a default user (likely ROLE_USER) for public access
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'user1', // actual default user
                password: 'user1' // actual default password
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get authentication token');
        }

        const data = await response.json();
        
        // Store token and expiry (assuming 1 hour expiry, adjust as needed)
        localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
        localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
        // localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + 3600000); // 1 hour expiry
        
        return data.accessToken;
    } catch (error) {
        console.error('Error getting new token:', error);
        throw error;
    }
}

/**
 * Get the current token, refreshing if needed
 */
async function getToken() {
    await refreshTokenIfNeeded();
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Validate mobile number input
 */
function validateMobileInput() {
    const mobileRegex = /^[6-9]\d{9}$/;
    const isValid = mobileRegex.test(mobileNumberInput.value);
    
    if (mobileNumberInput.value) {
        if (isValid) {
            mobileNumberInput.classList.remove('is-invalid');
            mobileNumberInput.classList.add('is-valid');
            validateButton.disabled = false;
        } else {
            mobileNumberInput.classList.remove('is-valid');
            mobileNumberInput.classList.add('is-invalid');
            validateButton.disabled = true;
        }
    } else {
        mobileNumberInput.classList.remove('is-valid', 'is-invalid');
        validateButton.disabled = false;
    }
}

/**
 * Validate mobile number with API
 */
async function validateMobileNumber() {
    // Show spinner
    validateSpinner.classList.remove('d-none');
    validateButton.disabled = true;
    statusMessage.innerHTML = '';
    registerForm.classList.add('d-none');
    
    try {
        const mobileNumber = mobileNumberInput.value;
        
        // Validate input first
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobileNumber)) {
            throw new Error('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
        }
        
        // Get token
        const token = await getToken();
        
        // Call API to validate mobile
        const response = await fetch(`${API_BASE_URL}/api/subscribers/validate/${mobileNumber}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Handle response
        if (response.ok) {
            const subscriber = await response.json();
            
            // Successful validation
            statusMessage.innerHTML = `
                <div class="alert alert-success">
                    <strong>Success!</strong> Mobile number verified.
                    <p>Name: ${subscriber.name}</p>
                    <p>Operator: ${subscriber.operator}</p>
                </div>
            `;
            
            // Store subscriber info in session storage for next page
            sessionStorage.setItem('current_subscriber', JSON.stringify(subscriber));
            
            // Redirect to plans page
            setTimeout(() => {
                window.location.href = 'prepaidPlan.html';
            }, 1500);
            
        } else if (response.status === 404) {
            // Subscriber not found
            statusMessage.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Not Found!</strong> This mobile number is not registered.
                </div>
            `;
            // Show registration form
            registerForm.classList.remove('d-none');
        } else {
            // Other errors
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to validate mobile number');
        }
    } catch (error) {
        statusMessage.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error!</strong> ${error.message}
            </div>
        `;
    } finally {
        // Hide spinner
        validateSpinner.classList.add('d-none');
        validateButton.disabled = false;
    }
}