// Constants
const API_BASE_URL = 'http://localhost:8015'; // Update with your actual API URL
const AUTH_TOKEN_KEY = 'mobi_comm_auth_token';
const TOKEN_EXPIRY_KEY = 'mobi_comm_token_expiry';

// DOM Elements
const categoryTabs = document.getElementById('categoryTabs');
const plansContainer = document.getElementById('plans-container');
const searchInput = document.getElementById('searchPlans');

// Initialize plans data and categories
let plansData = [];
let categories = new Set();

// Event listeners
document.addEventListener('DOMContentLoaded', initializeApp);
if (searchInput) {
    searchInput.addEventListener('input', filterPlans);
}

/**
 * Initialize the application
 */
async function initializeApp() {
    // Check if we have a valid token already
    await refreshTokenIfNeeded();
    
    // Fetch and display plans
    fetchPlans('all');
    
    // Load subscriber info if available
    loadSubscriberInfo();
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
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'user1', // Replace with your actual default user
                password: 'user1' // Replace with your actual default password
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get authentication token');
        }

        const data = await response.json();
        
        // Store token and expiry
        localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
        localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
        
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
 * Load subscriber information if available
 */
function loadSubscriberInfo() {
    const subscriberData = sessionStorage.getItem('current_subscriber');
    if (subscriberData) {
        const subscriber = JSON.parse(subscriberData);
        const subscriberInfoElement = document.getElementById('subscriber-info');
        
        if (subscriberInfoElement) {
            subscriberInfoElement.innerHTML = `
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">Subscriber Information</h5>
                        <p><strong>Mobile:</strong> ${subscriber.mobileNumber}</p>
                        <p><strong>Name:</strong> ${subscriber.name || 'N/A'}</p>
                        <p><strong>Operator:</strong> ${subscriber.operator || 'MobiComm'}</p>
                        ${subscriber.currentPlan ? `<p><strong>Current Plan:</strong> ${subscriber.currentPlan}</p>` : ''}
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Fetch plans from API
 * @param {string} category - Category of plans to fetch ('all' for all categories)
 */
async function fetchPlans(category) {
    try {
        showLoadingSpinner();
        
        const token = await getToken();
        
        let url = `${API_BASE_URL}/api/plans`;
        if (category && category !== 'all') {
            url = `${API_BASE_URL}/api/plans/category/${category}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch plans');
        }
        
        const data = await response.json();
        plansData = data;
        
        renderPlans(plansData);
        loadCategories(plansData);
        
    } catch (error) {
        console.error('Error fetching plans:', error);
        plansContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    <strong>Error!</strong> Failed to load plans. Please try again later.
                </div>
            </div>
        `;
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Filter plans based on search input
 */
function filterPlans() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        renderPlans(plansData);
        return;
    }
    
    const filteredPlans = plansData.filter(plan => 
        plan.planName.toLowerCase().includes(searchTerm) || 
        plan.description?.toLowerCase().includes(searchTerm) ||
        plan.category.toLowerCase().includes(searchTerm)
    );
    
    renderPlans(filteredPlans);
}

/**
 * Show loading spinner
 */
function showLoadingSpinner() {
    plansContainer.innerHTML = `
        <div class="col-12 loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner() {
    // This function doesn't need to do anything as renderPlans will replace content
}

/**
 * Render plans to the container
 * @param {Array} plans - Array of plan objects to render
 */
function renderPlans(plans) {
    if (plans.length === 0) {
        plansContainer.innerHTML = `
            <div class="col-12 text-center">
                <p>No plans found for this category.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    plans.forEach(plan => {
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card plan-card">
                    <div class="card-header">
                        <h5 class="mb-0">${plan.planName}</h5>
                        <span class="badge-custom">${plan.category}</span>
                    </div>
                    <div class="card-body">
                        <div class="plan-price">₹${plan.amount}</div>
                        <div class="plan-validity">${plan.validity} days validity</div>
                        <div class="plan-features mb-3">
                            <div class="feature-item">
                                <div class="feature-icon">
                                    <i class="fas fa-wifi"></i>
                                </div>
                                <div>${plan.data} GB data</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">
                                    <i class="fas fa-phone-alt"></i>
                                </div>
                                <div>${plan.voice}</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon">
                                    <i class="fas fa-sms"></i>
                                </div>
                                <div>${plan.sms} SMS</div>
                            </div>
                        </div>
                        <button class="btn btn-view-details" onclick="showPlanDetails('${plan.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    plansContainer.innerHTML = html;
}

/**
 * Load categories and create category tabs
 * @param {Array} plans - Array of plan objects to extract categories from
 */
function loadCategories(plans) {
    categories = new Set();
    plans.forEach(plan => categories.add(plan.category));
    
    // Keep the "All Plans" tab and add other categories
    let categoryTabsHTML = `
        <li class="nav-item">
            <a class="nav-link active" href="#" data-category="all">All Plans</a>
        </li>
    `;
    
    categories.forEach(category => {
        categoryTabsHTML += `
            <li class="nav-item">
                <a class="nav-link" href="#" data-category="${category}">${category}</a>
            </li>
        `;
    });
    
    categoryTabs.innerHTML = categoryTabsHTML;
    
    // Add event listeners to category tabs
    document.querySelectorAll('#categoryTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            document.querySelectorAll('#categoryTabs .nav-link').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Fetch plans for the selected category
            const category = this.getAttribute('data-category');
            fetchPlans(category);
        });
    });
}

/**
 * Show plan details in modal
 * @param {string} planId - ID of the plan to show details for
 */
function showPlanDetails(planId) {
    // Ensure Bootstrap's Modal is loaded
    if (typeof bootstrap === 'undefined') {
        console.error("Bootstrap is not loaded.");
        return;
    }

    // Find the plan using the ID
    const plan = plansData.find(p => p.id === planId);
    if (!plan) {
        console.error("Plan not found for ID:", planId);
        return;
    }

    // Get modal elements
    const modalElement = document.getElementById('planDetailModal');
    const modalTitle = document.getElementById('modalPlanName');
    const modalBody = document.getElementById('modalPlanDetails');

    if (!modalElement) {
        console.error("Modal element not found.");
        return;
    }

    // Update modal content
    modalTitle.textContent = plan.planName;
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="mb-3">
                    <h5>Plan Details</h5>
                    <p><strong>Price:</strong> ₹${plan.amount}</p>
                    <p><strong>Validity:</strong> ${plan.validity} days</p>
                    <p><strong>Category:</strong> ${plan.category}</p>
                </div>
                <div class="mb-3">
                    <h5>Benefits</h5>
                    <div class="feature-item">
                        <div class="feature-icon"><i class="fas fa-wifi"></i></div>
                        <div><strong>Data:</strong> ${plan.data} GB</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon"><i class="fas fa-phone-alt"></i></div>
                        <div><strong>Voice:</strong> ${plan.voice}</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon"><i class="fas fa-sms"></i></div>
                        <div><strong>SMS:</strong> ${plan.sms} SMS</div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="mb-3">
                    <h5>Description</h5>
                    <p>${plan.description || 'No description available'}</p>
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <button class="btn btn-primary" onclick="rechargePlan('${plan.id}')">Recharge Now</button>
            </div>
        </div>
    `;

    // Ensure Bootstrap Modal is initialized properly
    const planDetailModal = new bootstrap.Modal(modalElement);
    planDetailModal.show();
}

/**
 * Recharge with a plan
 * @param {string} planId - ID of the plan to recharge with
 */
async function rechargePlan(planId) {
    const subscriberData = sessionStorage.getItem('current_subscriber');
    
    // If no subscriber data, redirect to validation page
    if (!subscriberData) {
        alert('Please validate your mobile number first');
        window.location.href = 'validate.html';
        return;
    }
    
    const subscriber = JSON.parse(subscriberData);
    const plan = plansData.find(p => p.id === planId);
    
    if (!plan) {
        alert('Plan information not found');
        return;
    }
    
    try {
        const token = await getToken();
        
        // Use the recharge API endpoint from your RechargeTransactionController
        const response = await fetch(`${API_BASE_URL}/api/recharge/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mobileNumber: subscriber.mobileNumber,
                planId: planId,
                paymentMethod: 'online' // Default payment method
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to process recharge');
        }
        
        const result = await response.json();
        
        // Combine recharge result with plan details to ensure we have all info
        const rechargeData = {
            ...result,
            planName: plan.planName,
            price: plan.amount,
            validity: plan.validity,
            data: plan.data,
            voice: plan.voice,
            sms: plan.sms
        };
        
        // Show success message
        alert(`Successfully recharged with ${plan.planName} plan!`);
        
        // Close the modal
        const modalElement = document.getElementById('planDetailModal');
        const planDetailModal = bootstrap.Modal.getInstance(modalElement);
        if (planDetailModal) {
            planDetailModal.hide();
        }
        
        // Store recharge info and redirect to confirmation page
        sessionStorage.setItem('current_recharge', JSON.stringify(rechargeData));
        window.location.href = 'recharge-confirmation.html';
        
    } catch (error) {
        console.error('Error processing recharge:', error);
        alert('Failed to process recharge. Please try again later.');
    }
}

// Make sure these functions are globally accessible
window.showPlanDetails = showPlanDetails;
window.rechargePlan = rechargePlan;
