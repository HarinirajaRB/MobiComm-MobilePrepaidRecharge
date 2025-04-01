// Constants
const API_BASE_URL = 'http://localhost:8015';
const AUTH_TOKEN_KEY = 'mobi_comm_auth_token';
const TOKEN_EXPIRY_KEY = 'mobi_comm_token_expiry';

// DOM Elements
const categoryTabs = document.getElementById('categoryTabs');
const plansContainer = document.getElementById('plans-container');
const searchInput = document.getElementById('searchPlans');
const modalPlanName = document.getElementById("modalPlanName");
const modalPlanDetails = document.getElementById("modalPlanDetails");

// Initialize plans data and categories
let plansData = [];
let categories = new Set();

// Event listeners
document.addEventListener('DOMContentLoaded', initializeApp);
searchInput.addEventListener('input', filterPlans);
plansContainer.addEventListener('click', handlePlanDetailsClick);

// Initialize the modal
const planDetailModal = new bootstrap.Modal(document.getElementById('planDetailModal'));

async function initializeApp() {
    await refreshTokenIfNeeded();
    await fetchPlans('all');
    loadSubscriberInfo();
}

async function refreshTokenIfNeeded() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiryTime || Date.now() > (parseInt(expiryTime) - 300000)) {
        await getNewToken();
    }
}

async function getNewToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'user1', password: 'user1' })
        });
        if (!response.ok) throw new Error('Failed to get authentication token');
        const data = await response.json();
        localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
        localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + 24 * 60 * 60 * 1000);
        return data.accessToken;
    } catch (error) {
        console.error('Error getting new token:', error);
        throw error;
    }
}

async function getToken() {
    await refreshTokenIfNeeded();
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function loadSubscriberInfo() {
    const subscriberData = sessionStorage.getItem('current_subscriber');
    if (subscriberData) {
        const subscriber = JSON.parse(subscriberData);
        const subscriberInfoElement = document.getElementById('subscriber-info');
        subscriberInfoElement.innerHTML = `
            <div class="card mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Subscriber Information</h5>
                        <button class="btn btn-sm btn-outline-primary change-subscriber" onclick="window.location.href='index.html'">Change</button>
                    </div>
                    <p class="mt-3"><strong>Mobile:</strong> ${subscriber.mobileNumber || subscriber.mobile || 'N/A'}</p>
                    <p><strong>Name:</strong> ${subscriber.name || 'N/A'}</p>
                    ${subscriber.currentPlan ? `<p><strong>Current Plan:</strong> ${subscriber.currentPlan}</p>` : ''}
                </div>
            </div>
        `;
    }
}

async function fetchPlans(category) {
    try {
        showLoadingSpinner();
        const token = await getToken();
        const url = category && category !== 'all' 
            ? `${API_BASE_URL}/api/plans/category/${category}`
            : `${API_BASE_URL}/api/plans`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch plans');
        
        plansData = await response.json();
        console.log('Fetched plans:', plansData); // Debug log
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
    }
}

function filterPlans() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredPlans = plansData.filter(plan => 
        plan.planName.toLowerCase().includes(searchTerm) || 
        (plan.description?.toLowerCase().includes(searchTerm)) ||
        plan.category.toLowerCase().includes(searchTerm)
    );
    renderPlans(filteredPlans);
}

function showLoadingSpinner() {
    plansContainer.innerHTML = `
        <div class="col-12 loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

function renderPlans(plans) {
    if (!plans || plans.length === 0) {
        plansContainer.innerHTML = `<div class="col-12 text-center"><p>No plans found.</p></div>`;
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
                                <div class="feature-icon"><i class="fas fa-wifi"></i></div>
                                <div>${plan.data} GB data</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"><i class="fas fa-phone-alt"></i></div>
                                <div>${plan.voice}</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon"><i class="fas fa-sms"></i></div>
                                <div>${plan.sms} SMS</div>
                            </div>
                        </div>
                        <button class="btn btn-view-details" data-plan-id="${plan.id}">View Details</button>
                    </div>
                </div>
            </div>
        `;
    });
    plansContainer.innerHTML = html;
}

function loadCategories(plans) {
    categories = new Set(plans.map(plan => plan.category));
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
    
    categoryTabs.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            categoryTabs.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            fetchPlans(this.getAttribute('data-category'));
        });
    });
}

function handlePlanDetailsClick(e) {
    const button = e.target.closest('.btn-view-details');
    if (button) {
        const planId = button.getAttribute('data-plan-id');
        showPlanDetails(planId);
        planDetailModal.show(); // Show the modal after setting content
    }
}

function showPlanDetails(planId) {
    console.log('Showing details for planId:', planId); // Debug log
    console.log('Current plansData:', plansData); // Debug log
    
    // Ensure planId matches the type in plansData (convert to string if needed)
    const plan = plansData.find(p => String(p.id) === String(planId));
    
    if (!plan) {
        modalPlanName.textContent = 'Error';
        modalPlanDetails.innerHTML = '<p>Plan not found. Please try again.</p>';
        console.error('Plan not found for ID:', planId);
        return;
    }

    modalPlanName.textContent = plan.planName;
    modalPlanDetails.innerHTML = `
        <p><strong>Price:</strong> ₹${plan.amount}</p>
        <p><strong>Validity:</strong> ${plan.validity} days</p>
        <p><strong>Benefits:</strong> ${plan.data}GB Data, ${plan.voice}, ${plan.sms} SMS</p>
        <p><strong>Description:</strong> ${plan.description || "No description available."}</p>
        <hr>
        <p><strong>Terms & Conditions:</strong> ${plan.termsandcondition || "Standard terms apply."}</p>
        <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button class="btn btn-success" onclick="rechargePlan('${plan.id}')">Recharge Now</button>
        </div>
    `;
}

async function rechargePlan(planId) {
    const subscriberData = sessionStorage.getItem('current_subscriber');
    if (!subscriberData) {
        alert('Please validate your mobile number first');
        window.location.href = 'index.html';
        return;
    }

    const subscriber = JSON.parse(subscriberData);
    const plan = plansData.find(p => String(p.id) === String(planId));
    
    // Store the recharge data in sessionStorage for the recharge page
    const rechargeData = {
        mobileNumber: subscriber.mobileNumber || subscriber.mobile,
        planId: plan.id,
        planName: plan.planName,
        amount: plan.amount,
        validity: plan.validity,
        data: plan.data,
        voice: plan.voice,
        sms: plan.sms
    };
    sessionStorage.setItem('pending_recharge', JSON.stringify(rechargeData));

    // Redirect to recharge page
    window.location.href = 'recharge.html';
}

