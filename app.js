// Category Configurations
const PREDEFINED_CATEGORIES = {
    place: {
        food: { label: "Food", icon: "utensils", color: "#f59e0b" },
        travel: { label: "Travel", icon: "plane", color: "#3b82f6" },
        entertainment: { label: "Entertainment", icon: "film", color: "#ec4899" },
        groceries: { label: "Groceries", icon: "shopping-basket", color: "#10b981" },
        misc: { label: "Misc.", icon: "help-circle", color: "#9ca3af" },
        subscriptions: { label: "Subscriptions", icon: "tv", color: "#8b5cf6" }
    },
    global: {
        loan: { label: "Loan", icon: "landmark", color: "#ef4444" },
        emi: { label: "EMI", icon: "percent", color: "#f97316" },
        savings: { label: "Savings", icon: "piggy-bank", color: "#14b8a6" },
        investment: { label: "Investment (SIP, Stocks)", icon: "trending-up", color: "#06b6d4" }
    }
};

const DEFAULT_BUDGET_LIMITS = {
    food: 8000,
    travel: 15000,
    groceries: 6000,
    subscriptions: 3000
};

// Initial Mock data (populated on first ever load)
const INITIAL_DEMO_TRANSACTIONS = [
    { id: "mock-1", description: "Office Co-working Rent Share", amount: 12000, type: "debit", scope: "bangalore", category: "misc", date: "2026-06-02" },
    { id: "mock-2", description: "Indiranagar Pub Dinner with Team", amount: 4500, type: "debit", scope: "bangalore", category: "entertainment", date: "2026-06-06" },
    { id: "mock-3", description: "Ola Cab Ride to Airport", amount: 1500, type: "debit", scope: "bangalore", category: "travel", date: "2026-06-12" },
    { id: "mock-4", description: "Bhimas Hotel Traditional Lunch", amount: 1200, type: "debit", scope: "tirupati", category: "food", date: "2026-06-16" },
    { id: "mock-5", description: "Train Tickets Bangalore to Tirupati", amount: 1800, type: "debit", scope: "tirupati", category: "travel", date: "2026-06-14" },
    { id: "mock-6", description: "Consulting Software Monthly Inflow", amount: 120000, type: "credit", scope: "global", category: "savings", date: "2026-06-01" },
    { id: "mock-7", description: "Freelance Designing Milestone", amount: 35000, type: "credit", scope: "global", category: "investment", date: "2026-06-15" },
    { id: "mock-8", description: "HDFC Home Loan Interest Outflow", amount: 28000, type: "debit", scope: "global", category: "loan", date: "2026-06-05" },
    { id: "mock-9", description: "Car Loan EMI Auto Debit", amount: 14500, type: "debit", scope: "global", category: "emi", date: "2026-06-05" },
    { id: "mock-10", description: "Mutual Fund SIP Auto-Invest", amount: 15000, type: "debit", scope: "global", category: "investment", date: "2026-06-10" },
    { id: "mock-11", description: "Netflix Premium + Spotify subscription", amount: 950, type: "debit", scope: "bangalore", category: "subscriptions", date: "2026-06-05" },
    
    // July Mock Data
    { id: "mock-12", description: "Consulting Software Monthly Inflow", amount: 120000, type: "credit", scope: "global", category: "savings", date: "2026-07-01" },
    { id: "mock-13", description: "Grocery Store Supermarket Cart", amount: 4800, type: "debit", scope: "bangalore", category: "groceries", date: "2026-07-02" },
    { id: "mock-14", description: "Weekend Movie Ticket at Nexus", amount: 1100, type: "debit", scope: "bangalore", category: "entertainment", date: "2026-07-04" },
    { id: "mock-15", description: "Hotel Fortune Stay Tirupati", amount: 6500, type: "debit", scope: "tirupati", category: "travel", date: "2026-07-05" }
];

// App State
let state = {
    transactions: [],
    customCategories: [],
    initializedMonths: [],
    activeMonth: null, // "YYYY-MM" (e.g. "2026-07") - if null, show Home View
    settings: {
        clientId: ""
    },
    gmail: {
        tokenClient: null,
        accessToken: null,
        isGapiLoaded: false,
        parsedTransactions: []
    },
    filters: {
        search: "",
        scope: "all",
        category: "all",
        sortBy: "date-desc"
    },
    modal: {
        type: "debit",
        scope: "tirupati",
        editId: null
    },
    charts: {
        trend: null,
        category: null
    }
};

// Start App
document.addEventListener("DOMContentLoaded", () => {
    // Inject stylesheet wrapper for custom styles
    const styleEl = document.createElement("style");
    styleEl.id = "custom-categories-css-registry";
    document.head.appendChild(styleEl);

    loadData();
    initGoogleSDKs();
    initEventListeners();
    renderView();
});

// Load storage
function loadData() {
    const txSaved = localStorage.getItem("auraspend_transactions_v3");
    const catSaved = localStorage.getItem("auraspend_categories_v3");
    const monthsSaved = localStorage.getItem("auraspend_months_v3");
    const settingsSaved = localStorage.getItem("auraspend_settings_v3");

    if (txSaved) {
        state.transactions = JSON.parse(txSaved);
    } else {
        state.transactions = [...INITIAL_DEMO_TRANSACTIONS];
        localStorage.setItem("auraspend_transactions_v3", JSON.stringify(state.transactions));
    }

    if (catSaved) {
        state.customCategories = JSON.parse(catSaved);
    } else {
        state.customCategories = [];
    }

    if (monthsSaved) {
        state.initializedMonths = JSON.parse(monthsSaved);
    } else {
        state.initializedMonths = ["2026-06", "2026-07"];
        localStorage.setItem("auraspend_months_v3", JSON.stringify(state.initializedMonths));
    }

    if (settingsSaved) {
        state.settings = JSON.parse(settingsSaved);
    } else {
        state.settings = { clientId: "" };
    }

    // Try fetching cached OAuth token
    const token = localStorage.getItem("auraspend_gmail_token");
    if (token) {
        state.gmail.accessToken = token;
    }

    syncCategoryStyles();
}

// Save storage
function saveData() {
    localStorage.setItem("auraspend_transactions_v3", JSON.stringify(state.transactions));
    localStorage.setItem("auraspend_categories_v3", JSON.stringify(state.customCategories));
    localStorage.setItem("auraspend_months_v3", JSON.stringify(state.initializedMonths));
    localStorage.setItem("auraspend_settings_v3", JSON.stringify(state.settings));
}

// Google APIs client setup
function initGoogleSDKs() {
    // Initialize GAPI
    try {
        if (typeof gapi !== 'undefined') {
            gapi.load('client', async () => {
                await gapi.client.init({
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
                });
                state.gmail.isGapiLoaded = true;
                console.log("Google API Client library loaded.");
            });
        }
    } catch (e) {
        console.error("GAPI load error", e);
    }
}

// Initialize GIS Token Client dynamically with User Client ID
function initTokenClient() {
    if (!state.settings.clientId) {
        return false;
    }
    
    try {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            state.gmail.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: state.settings.clientId,
                scope: 'https://www.googleapis.com/auth/gmail.readonly',
                callback: async (resp) => {
                    if (resp.error !== undefined) {
                        alert("Authentication error: " + resp.error);
                        setGmailStatus("Authentication failed.", false);
                        return;
                    }
                    state.gmail.accessToken = resp.access_token;
                    localStorage.setItem("auraspend_gmail_token", resp.access_token);
                    gapi.client.setToken({ access_token: resp.access_token });
                    await runGmailSync();
                },
            });
            return true;
        }
    } catch (e) {
        console.error("TokenClient creation failed", e);
    }
    return false;
}

// Synchronize stylesheets rules for custom categories
function syncCategoryStyles() {
    const styleEl = document.getElementById("custom-categories-css-registry");
    let cssText = "";

    // Predefined place
    Object.entries(PREDEFINED_CATEGORIES.place).forEach(([key, val]) => {
        cssText += `
            .category-bg-${key} { 
                background-color: ${hexToRgba(val.color, 0.15)}; 
                color: ${val.color}; 
            }
        `;
    });
    // Predefined global
    Object.entries(PREDEFINED_CATEGORIES.global).forEach(([key, val]) => {
        cssText += `
            .category-bg-${key} { 
                background-color: ${hexToRgba(val.color, 0.15)}; 
                color: ${val.color}; 
            }
        `;
    });
    // Custom categories
    state.customCategories.forEach(cat => {
        cssText += `
            .category-bg-${cat.id} { 
                background-color: ${hexToRgba(cat.color, 0.15)}; 
                color: ${cat.color}; 
            }
        `;
    });

    styleEl.innerHTML = cssText;
}

function hexToRgba(hex, alpha) {
    let c = hex.substring(1);
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Get display metadata details for a category ID
function getCategoryMetadata(catId) {
    if (PREDEFINED_CATEGORIES.place[catId]) return PREDEFINED_CATEGORIES.place[catId];
    if (PREDEFINED_CATEGORIES.global[catId]) return PREDEFINED_CATEGORIES.global[catId];
    
    const custom = state.customCategories.find(c => c.id === catId);
    if (custom) {
        return {
            label: custom.label,
            icon: "tag",
            color: custom.color,
            class: `category-bg-${custom.id}`
        };
    }
    return { label: catId, icon: "help-circle", color: "#9ca3af", class: "category-bg-misc" };
}

// Populate the list of all categories dynamically in filters
function populateLedgerCategoryFilters() {
    const filterSelect = document.getElementById("filter-category");
    filterSelect.innerHTML = '<option value="all">All Categories</option>';

    // Place Group
    const grpPlace = document.createElement("optgroup");
    grpPlace.label = "Location-Linked Categories";
    Object.entries(PREDEFINED_CATEGORIES.place).forEach(([key, val]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = val.label;
        grpPlace.appendChild(opt);
    });
    state.customCategories.filter(c => c.scopeType === "place").forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.label;
        grpPlace.appendChild(opt);
    });
    filterSelect.appendChild(grpPlace);

    // Global Group
    const grpGlobal = document.createElement("optgroup");
    grpGlobal.label = "Global Categories";
    Object.entries(PREDEFINED_CATEGORIES.global).forEach(([key, val]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = val.label;
        grpGlobal.appendChild(opt);
    });
    state.customCategories.filter(c => c.scopeType === "global").forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.label;
        grpGlobal.appendChild(opt);
    });
    filterSelect.appendChild(grpGlobal);
}

// Populate categories dropdown inside form
function updateFormCategoriesDropdown() {
    const catSelect = document.getElementById("tx-category");
    catSelect.innerHTML = "";
    
    const scope = state.modal.scope;
    
    if (scope === "global") {
        Object.entries(PREDEFINED_CATEGORIES.global).forEach(([key, val]) => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = val.label;
            catSelect.appendChild(opt);
        });
        state.customCategories.filter(c => c.scopeType === "global").forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.label;
            catSelect.appendChild(opt);
        });
    } else {
        Object.entries(PREDEFINED_CATEGORIES.place).forEach(([key, val]) => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = val.label;
            catSelect.appendChild(opt);
        });
        state.customCategories.filter(c => c.scopeType === "place").forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.label;
            catSelect.appendChild(opt);
        });
    }
}

// Dynamic router rendering
function renderView() {
    const homeView = document.getElementById("home-view");
    const dashboardView = document.getElementById("dashboard-view");

    if (state.activeMonth) {
        homeView.style.display = "none";
        dashboardView.style.display = "block";
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const [year, month] = state.activeMonth.split("-");
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        document.getElementById("active-month-label").textContent = monthLabel;

        populateLedgerCategoryFilters();
        updateDashboardUI();
    } else {
        homeView.style.display = "block";
        dashboardView.style.display = "none";
        updateHomeUI();
    }

    lucide.createIcons();
}

// Update Home Directory list
function updateHomeUI() {
    let globalInflow = 0;
    let globalOutflow = 0;

    state.transactions.forEach(tx => {
        if (tx.type === "credit") {
            globalInflow += tx.amount;
        } else {
            globalOutflow += tx.amount;
        }
    });

    document.getElementById("global-total-inflow").textContent = formatCurrency(globalInflow);
    document.getElementById("global-total-outflow").textContent = formatCurrency(globalOutflow);
    document.getElementById("global-net-worth").textContent = formatCurrency(globalInflow - globalOutflow);

    const monthContainer = document.getElementById("month-cards-container");
    monthContainer.innerHTML = "";

    const monthKeys = new Set([
        ...state.initializedMonths,
        ...state.transactions.map(t => t.date.substring(0, 7))
    ]);

    const sortedMonths = Array.from(monthKeys).sort((a, b) => b.localeCompare(a));
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    sortedMonths.forEach(mKey => {
        const [year, month] = mKey.split("-");
        const displayTitle = `${monthNames[parseInt(month) - 1]} ${year}`;

        let monthInflow = 0;
        let monthOutflow = 0;
        state.transactions.filter(t => t.date.substring(0, 7) === mKey).forEach(tx => {
            if (tx.type === "credit") {
                monthInflow += tx.amount;
            } else {
                monthOutflow += tx.amount;
            }
        });

        const monthNet = monthInflow - monthOutflow;

        const card = document.createElement("div");
        card.className = "month-card";
        card.addEventListener("click", (e) => {
            if (e.target.closest(".month-card-delete") || e.target.closest("button")) return;
            state.activeMonth = mKey;
            renderView();
        });

        card.innerHTML = `
            <div class="month-card-header">
                <span class="month-card-title">${displayTitle}</span>
                <button class="btn-icon month-card-delete" title="Purge Month Ledger" onclick="deleteMonthLedger('${mKey}', event)">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="month-card-stats">
                <div class="month-card-stat-row">
                    <span class="label">Credits (+):</span>
                    <span class="value" style="color: var(--accent-credit);">₹${monthInflow.toLocaleString('en-IN')}</span>
                </div>
                <div class="month-card-stat-row">
                    <span class="label">Debits (-):</span>
                    <span class="value" style="color: var(--accent-debit);">₹${monthOutflow.toLocaleString('en-IN')}</span>
                </div>
                <div class="month-card-stat-row net">
                    <span class="label">Net Balance:</span>
                    <span class="value ${monthNet >= 0 ? 'positive' : 'negative'}">₹${monthNet.toLocaleString('en-IN')}</span>
                </div>
            </div>
            <div class="month-card-footer">
                <span>View Dashboard</span>
                <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
            </div>
        `;
        monthContainer.appendChild(card);
    });

    const emptyCard = document.createElement("div");
    emptyCard.className = "month-card month-card-empty";
    emptyCard.innerHTML = `
        <i data-lucide="plus-circle"></i>
        <h3>Add New Month</h3>
        <p style="font-size: 0.75rem; margin-top: 0.25rem;">Initialize a new ledger</p>
    `;
    emptyCard.addEventListener("click", () => {
        document.getElementById("month-init-modal").classList.add("active");
    });
    monthContainer.appendChild(emptyCard);
}

function deleteMonthLedger(mKey, event) {
    if (event) event.stopPropagation();

    if (confirm(`Are you sure you want to permanently delete all transactions associated with ${mKey}? This cannot be undone.`)) {
        state.transactions = state.transactions.filter(t => t.date.substring(0, 7) !== mKey);
        state.initializedMonths = state.initializedMonths.filter(m => m !== mKey);
        saveData();
        updateHomeUI();
        lucide.createIcons();
    }
}

// Scoped Dashboard calculations
function updateDashboardUI() {
    const scopedTransactions = state.transactions.filter(tx => tx.date.substring(0, 7) === state.activeMonth);

    let totalCredits = 0;
    let totalDebits = 0;
    let savingsAndInvestmentsDebits = 0;

    scopedTransactions.forEach(tx => {
        if (tx.type === "credit") {
            totalCredits += tx.amount;
        } else {
            totalDebits += tx.amount;
            if (tx.category === "savings" || tx.category === "investment") {
                savingsAndInvestmentsDebits += tx.amount;
            }
        }
    });

    const netBalance = totalCredits - totalDebits;
    const actualSavings = Math.max(0, netBalance + savingsAndInvestmentsDebits);
    const savingsRate = totalCredits > 0 ? Math.round((actualSavings / totalCredits) * 100) : 0;

    const balEl = document.getElementById("kpi-net-balance");
    balEl.textContent = formatCurrency(netBalance);
    if (netBalance >= 0) {
        balEl.style.color = "var(--text-primary)";
        document.getElementById("kpi-balance-status").className = "kpi-change up";
        document.getElementById("kpi-balance-status").innerHTML = `<i data-lucide="trending-up" style="width: 12px; height: 12px;"></i> Safe zone`;
    } else {
        balEl.style.color = "var(--accent-debit)";
        document.getElementById("kpi-balance-status").className = "kpi-change down";
        document.getElementById("kpi-balance-status").innerHTML = `<i data-lucide="trending-down" style="width: 12px; height: 12px;"></i> Deficit balance`;
    }

    document.getElementById("kpi-total-credits").textContent = formatCurrency(totalCredits);
    document.getElementById("kpi-total-debits").textContent = formatCurrency(totalDebits);
    
    document.getElementById("kpi-savings-rate").textContent = `${savingsRate}%`;
    const savingsStatusEl = document.getElementById("kpi-savings-status");
    if (savingsRate >= 35) {
        savingsStatusEl.className = "kpi-change up";
        savingsStatusEl.innerHTML = `<i data-lucide="sparkles" style="width: 12px; height: 12px;"></i> Excellent rate!`;
    } else if (savingsRate >= 15) {
        savingsStatusEl.className = "kpi-change up";
        savingsStatusEl.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px;"></i> Moderate savings`;
    } else {
        savingsStatusEl.className = "kpi-change down";
        savingsStatusEl.innerHTML = `<i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i> Increase savings`;
    }

    renderDashboardLedger(scopedTransactions);
    updateDashboardBudgets(scopedTransactions);
    renderDashboardCharts(scopedTransactions);
}

// Render Ledger list scoped to active month
function renderDashboardLedger(scopedTx) {
    const listContainer = document.getElementById("transaction-list-container");
    listContainer.innerHTML = "";

    let filtered = scopedTx.filter(tx => {
        if (state.filters.search) {
            const query = state.filters.search.toLowerCase();
            if (!tx.description.toLowerCase().includes(query)) return false;
        }
        if (state.filters.scope !== "all") {
            if (tx.scope !== state.filters.scope) return false;
        }
        if (state.filters.category !== "all") {
            if (tx.category !== state.filters.category) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        const valA = a.amount;
        const valB = b.amount;
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        switch (state.filters.sortBy) {
            case "date-desc": return dateB - dateA;
            case "date-asc": return dateA - dateB;
            case "amount-desc": return valB - valA;
            case "amount-asc": return valA - valB;
            default: return dateB - dateA;
        }
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="layers-3"></i>
                <p>No transactions match your search filters.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(tx => {
        const cat = getCategoryMetadata(tx.category);
        const item = document.createElement("div");
        item.className = `transaction-item ${tx.type}`;
        
        let scopeText = "Global";
        if (tx.scope === "tirupati") scopeText = "Tirupati";
        if (tx.scope === "bangalore") scopeText = "Bangalore";

        item.innerHTML = `
            <div class="tx-info-block">
                <div class="tx-icon ${cat.class}">
                    <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="tx-details">
                    <span class="tx-desc">${tx.description}</span>
                    <div class="tx-meta">
                        <span class="badge badge-scope">${scopeText}</span>
                        <span class="badge badge-category" style="background-color: ${hexToRgba(cat.color, 0.15)}; color: ${cat.color};">${cat.label}</span>
                        <span>•</span>
                        <span>${formatDateDisplay(tx.date)}</span>
                    </div>
                </div>
            </div>
            <div class="tx-amount-actions">
                <span class="tx-amount ${tx.type}">${tx.type === "credit" ? "+" : "-"} ₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                <div class="tx-actions">
                    <button class="btn-icon edit" onclick="openModal('${tx.id}')" title="Edit">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteTransaction('${tx.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
        listContainer.appendChild(item);
    });

    lucide.createIcons();
}

function updateDashboardBudgets(scopedTx) {
    let tirupatiTotal = 0;
    let bangaloreTotal = 0;
    let categorySpendMap = {};

    scopedTx.forEach(tx => {
        if (tx.type === "debit") {
            if (tx.scope === "tirupati") tirupatiTotal += tx.amount;
            else if (tx.scope === "bangalore") bangaloreTotal += tx.amount;
            categorySpendMap[tx.category] = (categorySpendMap[tx.category] || 0) + tx.amount;
        }
    });

    document.getElementById("stats-tirupati-amount").textContent = formatCurrency(tirupatiTotal);
    document.getElementById("stats-bangalore-amount").textContent = formatCurrency(bangaloreTotal);
    
    const placeLinkTotal = tirupatiTotal + bangaloreTotal;
    const tirupatiPct = placeLinkTotal > 0 ? Math.round((tirupatiTotal / placeLinkTotal) * 100) : 0;
    const bangalorePct = placeLinkTotal > 0 ? Math.round((bangaloreTotal / placeLinkTotal) * 100) : 0;
    
    document.getElementById("stats-tirupati-percentage").textContent = `${tirupatiPct}% of place-linked`;
    document.getElementById("stats-bangalore-percentage").textContent = `${bangalorePct}% of place-linked`;
    
    document.getElementById("stats-tirupati-bar").style.width = `${tirupatiPct}%`;
    document.getElementById("stats-bangalore-bar").style.width = `${bangalorePct}%`;

    const tirupatiCount = scopedTx.filter(t => t.scope === "tirupati").length;
    const bangaloreCount = scopedTx.filter(t => t.scope === "bangalore").length;
    document.getElementById("stats-tirupati-count").textContent = `${tirupatiCount} item${tirupatiCount !== 1 ? 's' : ''}`;
    document.getElementById("stats-bangalore-count").textContent = `${bangaloreCount} item${bangaloreCount !== 1 ? 's' : ''}`;

    // Budgets progress rendering
    const budgetListContainer = document.getElementById("budgets-container");
    budgetListContainer.innerHTML = "";

    const budgetsToTrack = [
        { id: "food", label: "Food", limit: DEFAULT_BUDGET_LIMITS.food, icon: "utensils", color: "#f59e0b" },
        { id: "travel", label: "Travel", limit: DEFAULT_BUDGET_LIMITS.travel, icon: "plane", color: "#3b82f6" },
        { id: "groceries", label: "Groceries", limit: DEFAULT_BUDGET_LIMITS.groceries, icon: "shopping-basket", color: "#10b981" },
        { id: "subscriptions", label: "Subscriptions", limit: DEFAULT_BUDGET_LIMITS.subscriptions, icon: "tv", color: "#8b5cf6" }
    ];

    state.customCategories.filter(c => c.scopeType === "place").forEach(cat => {
        budgetsToTrack.push({
            id: cat.id,
            label: cat.label,
            limit: 5000, 
            icon: "tag",
            color: cat.color
        });
    });

    budgetsToTrack.forEach(b => {
        const spent = categorySpendMap[b.id] || 0;
        const pct = Math.min(100, Math.round((spent / b.limit) * 100));

        let warningClass = "";
        if (pct >= 100) warningClass = "danger";
        else if (pct >= 80) warningClass = "warning";

        const budgetEl = document.createElement("div");
        budgetEl.className = "budget-item";
        budgetEl.innerHTML = `
            <div class="budget-info">
                <span class="budget-label">
                    <i data-lucide="${b.icon}" style="width: 14px; height: 14px; color: ${b.color};"></i> ${b.label}
                </span>
                <span class="budget-values">₹${spent.toLocaleString('en-IN')} / ₹${b.limit.toLocaleString('en-IN')}</span>
            </div>
            <div class="budget-bar">
                <div class="budget-progress ${warningClass}" style="width: ${pct}%; background: ${b.color};"></div>
            </div>
        `;
        budgetListContainer.appendChild(budgetEl);
    });

    lucide.createIcons();
}

function renderDashboardCharts(scopedTx) {
    const [year, month] = state.activeMonth.split("-");
    const totalDays = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    const periodsLabels = ["1-5", "6-10", "11-15", "16-20", "21-25", `26-${totalDays}`];
    const creditsPeriods = Array(6).fill(0);
    const debitsPeriods = Array(6).fill(0);

    scopedTx.forEach(tx => {
        const day = parseInt(tx.date.substring(8, 10));
        let pIdx = 0;
        if (day <= 5) pIdx = 0;
        else if (day <= 10) pIdx = 1;
        else if (day <= 15) pIdx = 2;
        else if (day <= 20) pIdx = 3;
        else if (day <= 25) pIdx = 4;
        else pIdx = 5;

        if (tx.type === "credit") creditsPeriods[pIdx] += tx.amount;
        else debitsPeriods[pIdx] += tx.amount;
    });

    const ctxTrend = document.getElementById("trendChart").getContext("2d");
    if (state.charts.trend) state.charts.trend.destroy();
    
    state.charts.trend = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: periodsLabels,
            datasets: [
                {
                    label: 'Credits (Income)',
                    data: creditsPeriods,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Debits (Expenses)',
                    data: debitsPeriods,
                    backgroundColor: 'rgba(244, 63, 94, 0.75)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f3f4f6', font: { family: 'Inter', weight: '500' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#9ca3af', 
                        font: { family: 'Inter' },
                        callback: function(value) { return '₹' + value.toLocaleString('en-IN'); }
                    }
                }
            }
        }
    });

    let categoryExpenses = {};
    scopedTx.forEach(tx => {
        if (tx.type === "debit") {
            const meta = getCategoryMetadata(tx.category);
            categoryExpenses[meta.label] = {
                amount: (categoryExpenses[meta.label]?.amount || 0) + tx.amount,
                color: meta.color
            };
        }
    });

    const categoriesLabels = Object.keys(categoryExpenses);
    const categoryData = Object.values(categoryExpenses).map(c => c.amount);
    const chartColors = Object.values(categoryExpenses).map(c => c.color);

    const ctxCat = document.getElementById("categoryChart").getContext("2d");
    if (state.charts.category) state.charts.category.destroy();

    if (categoryData.length === 0) {
        state.charts.category = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ["No expenses"],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    } else {
        state.charts.category = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: categoriesLabels,
                datasets: [{
                    data: categoryData,
                    backgroundColor: chartColors,
                    borderWidth: 1,
                    borderColor: '#11131f'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ₹${context.raw.toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// Event bindings
function initEventListeners() {
    document.getElementById("logo-home-trigger").addEventListener("click", () => {
        state.activeMonth = null;
        renderView();
    });

    document.getElementById("btn-back-to-months").addEventListener("click", () => {
        state.activeMonth = null;
        renderView();
    });

    document.getElementById("btn-reset-data").addEventListener("click", () => {
        if (confirm("WARNING: Are you sure you want to delete all transactions, initialized months, and custom categories? This will wipe the database to zero.")) {
            state.transactions = [];
            state.initializedMonths = [];
            state.customCategories = [];
            state.activeMonth = null;
            saveData();
            syncCategoryStyles();
            renderView();
        }
    });

    // Categories Modal
    document.getElementById("btn-manage-categories").addEventListener("click", openCategoriesModal);
    document.getElementById("btn-cat-modal-close").addEventListener("click", closeCategoriesModal);
    document.getElementById("category-modal").addEventListener("click", (e) => {
        if (e.target.id === "category-modal") closeCategoriesModal();
    });
    document.getElementById("category-form").addEventListener("submit", handleCategorySubmit);
    document.getElementById("new-cat-color").addEventListener("input", (e) => {
        document.getElementById("color-hex-label").textContent = e.target.value.toUpperCase();
    });

    // Initialize Month Modal
    document.getElementById("btn-init-month").addEventListener("click", () => {
        document.getElementById("month-init-modal").classList.add("active");
    });
    document.getElementById("btn-month-modal-close").addEventListener("click", closeMonthModal);
    document.getElementById("btn-month-init-cancel").addEventListener("click", closeMonthModal);
    document.getElementById("month-init-modal").addEventListener("click", (e) => {
        if (e.target.id === "month-init-modal") closeMonthModal();
    });
    document.getElementById("month-init-form").addEventListener("submit", handleMonthInitSubmit);

    // Settings Modal
    document.getElementById("btn-open-settings").addEventListener("click", openSettingsModal);
    document.getElementById("btn-settings-close").addEventListener("click", closeSettingsModal);
    document.getElementById("btn-settings-cancel").addEventListener("click", closeSettingsModal);
    document.getElementById("settings-modal").addEventListener("click", (e) => {
        if (e.target.id === "settings-modal") closeSettingsModal();
    });
    document.getElementById("settings-form").addEventListener("submit", handleSettingsSubmit);

    // Gmail Modal
    document.getElementById("btn-sync-gmail").addEventListener("click", openGmailModal);
    document.getElementById("btn-gmail-close").addEventListener("click", closeGmailModal);
    document.getElementById("btn-gmail-cancel").addEventListener("click", closeGmailModal);
    document.getElementById("gmail-modal").addEventListener("click", (e) => {
        if (e.target.id === "gmail-modal") closeGmailModal();
    });
    document.getElementById("btn-gmail-auth").addEventListener("click", startGoogleAuthentication);
    document.getElementById("btn-gmail-import-submit").addEventListener("click", handleGmailImportSubmit);

    // Add Transaction Modal
    document.getElementById("btn-add-tx").addEventListener("click", () => openTransactionModal());
    document.getElementById("btn-modal-close").addEventListener("click", closeTransactionModal);
    document.getElementById("btn-form-cancel").addEventListener("click", closeTransactionModal);
    document.getElementById("tx-modal").addEventListener("click", (e) => {
        if (e.target.id === "tx-modal") closeTransactionModal();
    });

    const typeButtons = document.querySelectorAll("#tx-modal [data-type]");
    typeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            typeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.modal.type = btn.dataset.type;
        });
    });

    const scopeButtons = document.querySelectorAll("#scope-segments [data-scope]");
    scopeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            scopeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.modal.scope = btn.dataset.scope;
            updateFormCategoriesDropdown();
        });
    });

    document.getElementById("tx-form").addEventListener("submit", handleTransactionSubmit);

    // Ledger Filters
    document.getElementById("search-tx").addEventListener("input", (e) => {
        state.filters.search = e.target.value;
        renderDashboardLedger(state.transactions.filter(tx => tx.date.substring(0, 7) === state.activeMonth));
    });
    document.getElementById("filter-scope").addEventListener("change", (e) => {
        state.filters.scope = e.target.value;
        renderDashboardLedger(state.transactions.filter(tx => tx.date.substring(0, 7) === state.activeMonth));
    });
    document.getElementById("filter-category").addEventListener("change", (e) => {
        state.filters.category = e.target.value;
        renderDashboardLedger(state.transactions.filter(tx => tx.date.substring(0, 7) === state.activeMonth));
    });
    document.getElementById("sort-by").addEventListener("change", (e) => {
        state.filters.sortBy = e.target.value;
        renderDashboardLedger(state.transactions.filter(tx => tx.date.substring(0, 7) === state.activeMonth));
    });
}

// Categories modals logic
function openCategoriesModal() {
    document.getElementById("category-modal").classList.add("active");
    renderCategoriesManagerList();
    lucide.createIcons();
}
function closeCategoriesModal() {
    document.getElementById("category-modal").classList.remove("active");
}
function renderCategoriesManagerList() {
    const list = document.getElementById("categories-list-container");
    list.innerHTML = "";

    if (state.customCategories.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8125rem; padding: 1.5rem 0;">No custom categories created yet.</div>`;
        return;
    }

    state.customCategories.forEach(cat => {
        const row = document.createElement("div");
        row.className = "category-manager-row";
        row.innerHTML = `
            <div class="category-manager-label-block">
                <span class="category-manager-dot" style="background-color: ${cat.color}; box-shadow: 0 0 8px ${cat.color};"></span>
                <span style="font-weight: 600; font-size: 0.875rem;">${cat.label}</span>
                <span class="badge" style="font-size: 0.625rem; background: rgba(255,255,255,0.05); color: var(--text-secondary);">${cat.scopeType === 'place' ? 'Place-Linked' : 'Global'}</span>
            </div>
            <button class="btn-icon delete" style="border: none;" onclick="deleteCustomCategory('${cat.id}')" title="Delete Category">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        list.appendChild(row);
    });
}
function handleCategorySubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById("new-cat-name");
    const name = nameInput.value.trim();
    const scopeType = document.getElementById("new-cat-scope").value;
    const color = document.getElementById("new-cat-color").value;

    if (!name) return;

    const lowerName = name.toLowerCase();
    const conflict = 
        PREDEFINED_CATEGORIES.place[lowerName] || 
        PREDEFINED_CATEGORIES.global[lowerName] || 
        state.customCategories.some(c => c.label.toLowerCase() === lowerName);

    if (conflict) {
        alert("A category with this name already exists.");
        return;
    }

    const newCat = {
        id: "cat-" + Date.now(),
        label: name,
        scopeType,
        color
    };

    state.customCategories.push(newCat);
    saveData();
    syncCategoryStyles();
    
    nameInput.value = "";
    document.getElementById("new-cat-color").value = "#6366f1";
    document.getElementById("color-hex-label").textContent = "#6366F1";

    renderCategoriesManagerList();
    if (state.activeMonth) {
        populateLedgerCategoryFilters();
        updateDashboardUI();
    }
    lucide.createIcons();
}
function deleteCustomCategory(catId) {
    if (confirm("Are you sure you want to delete this custom category? Transactions tagged with it will remain but default to miscellaneous displays.")) {
        state.customCategories = state.customCategories.filter(c => c.id !== catId);
        saveData();
        syncCategoryStyles();
        renderCategoriesManagerList();
        
        if (state.activeMonth) {
            populateLedgerCategoryFilters();
            updateDashboardUI();
        }
        lucide.createIcons();
    }
}

// Month modals logic
function closeMonthModal() {
    document.getElementById("month-init-modal").classList.remove("active");
}
function handleMonthInitSubmit(e) {
    e.preventDefault();
    const selected = document.getElementById("init-month-select").value;

    if (state.initializedMonths.includes(selected)) {
        alert("This month is already initialized.");
        return;
    }

    state.initializedMonths.push(selected);
    saveData();
    closeMonthModal();
    updateHomeUI();
    lucide.createIcons();
}

// Settings modals logic
function openSettingsModal() {
    document.getElementById("settings-client-id").value = state.settings.clientId || "";
    
    // Attempt to guess IP for helper text
    const helper = document.getElementById("local-ip-suggestion");
    const pcHostname = window.location.hostname;
    if (pcHostname && pcHostname !== "localhost" && pcHostname !== "127.0.0.1") {
        helper.textContent = `http://${pcHostname}:8080`;
    }
    
    document.getElementById("settings-modal").classList.add("active");
    lucide.createIcons();
}
function closeSettingsModal() {
    document.getElementById("settings-modal").classList.remove("active");
}
function handleSettingsSubmit(e) {
    e.preventDefault();
    state.settings.clientId = document.getElementById("settings-client-id").value.trim();
    saveData();
    closeSettingsModal();
    
    // Reinitialize client oauth if id changed
    initTokenClient();
}

// Gmail Sync Modal logic
function openGmailModal() {
    document.getElementById("gmail-modal").classList.add("active");
    
    if (!state.settings.clientId) {
        setGmailStatus("OAuth Client ID is missing. Go to Settings and configure it first.", false);
        document.getElementById("gmail-action-block").innerHTML = `
            <button type="button" class="btn btn-secondary" onclick="closeGmailModal(); openSettingsModal();">
                <i data-lucide="settings"></i> Configure Settings
            </button>
        `;
    } else {
        if (state.gmail.accessToken) {
            gapi.client.setToken({ access_token: state.gmail.accessToken });
            setGmailStatus("Authenticated. Ready to scan inbox.", true);
            document.getElementById("gmail-action-block").innerHTML = `
                <button type="button" class="btn btn-primary" id="btn-run-gmail-scan">
                    <i data-lucide="refresh-cw"></i> Scan Emails Now
                </button>
            `;
            document.getElementById("btn-run-gmail-scan").addEventListener("click", runGmailSync);
        } else {
            setGmailStatus("Authentication required.", false);
            document.getElementById("gmail-action-block").innerHTML = `
                <button type="button" class="btn btn-primary" id="btn-gmail-auth">
                    <i data-lucide="log-in"></i> Authenticate with Google
                </button>
            `;
            document.getElementById("btn-gmail-auth").addEventListener("click", startGoogleAuthentication);
        }
    }
    
    document.getElementById("gmail-status-panel").style.display = "block";
    document.getElementById("gmail-results-panel").style.display = "none";
    lucide.createIcons();
}
function closeGmailModal() {
    document.getElementById("gmail-modal").classList.remove("active");
}
function setGmailStatus(text, showSpinner = false) {
    document.getElementById("gmail-status-text").textContent = text;
    document.getElementById("gmail-spinner").style.display = showSpinner ? "block" : "none";
}
function startGoogleAuthentication() {
    if (!state.gmail.tokenClient) {
        const ok = initTokenClient();
        if (!ok) {
            alert("Could not initialize authentication client. Verify your Client ID in Settings.");
            return;
        }
    }
    
    setGmailStatus("Authenticating via Google popup...", true);
    
    // Request access token
    try {
        state.gmail.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
        console.error("AccessToken request error", e);
        setGmailStatus("Failed to open OAuth popup. Check popup blocker.", false);
    }
}

// Gmail scanner and parser implementation
async function runGmailSync() {
    if (!state.gmail.isGapiLoaded) {
        alert("Google API Library is still loading. Please try again in a few seconds.");
        return;
    }
    
    setGmailStatus("Scanning Gmail threads for financial receipts...", true);
    document.getElementById("gmail-action-block").style.display = "none";
    
    try {
        // Query recent billing alerts (newer_than:7d)
        const response = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'q': 'subject:("debited" OR "credited" OR "transaction" OR "payment" OR "spent" OR "OTP" OR "receipt") newer_than:7d',
            'maxResults': 12
        });
        
        const messages = response.result.messages;
        if (!messages || messages.length === 0) {
            setGmailStatus("No financial alert emails found in the last 7 days.", false);
            document.getElementById("gmail-action-block").style.display = "block";
            return;
        }
        
        state.gmail.parsedTransactions = [];
        setGmailStatus(`Fetching details for ${messages.length} email thread${messages.length !== 1 ? 's' : ''}...`, true);
        
        // Fetch message details
        for (const msg of messages) {
            try {
                const msgDetails = await gapi.client.gmail.users.messages.get({
                    'userId': 'me',
                    'id': msg.id
                });
                
                const parsed = parseEmailToTransaction(msgDetails.result);
                if (parsed) {
                    // Prevent duplicate syncing (check if already imported)
                    const isDuplicate = state.transactions.some(t => 
                        t.description === parsed.description && 
                        t.amount === parsed.amount && 
                        t.date === parsed.date
                    );
                    if (!isDuplicate) {
                        state.gmail.parsedTransactions.push(parsed);
                    }
                }
            } catch (e) {
                console.error("Error fetching message details for " + msg.id, e);
            }
        }
        
        if (state.gmail.parsedTransactions.length === 0) {
            setGmailStatus("No new unique transactions parsed from email snippets.", false);
            document.getElementById("gmail-action-block").style.display = "block";
            return;
        }
        
        // Display results review panel
        document.getElementById("gmail-status-panel").style.display = "none";
        document.getElementById("gmail-results-panel").style.display = "block";
        renderGmailTransactionsList();
        
    } catch (err) {
        console.error("Gmail list threads failed", err);
        if (err.status === 401) {
            // Token expired
            state.gmail.accessToken = null;
            localStorage.removeItem("auraspend_gmail_token");
            setGmailStatus("Session expired. Please re-authenticate.", false);
            openGmailModal();
        } else {
            setGmailStatus("Error querying Gmail API: " + (err.result?.error?.message || err.message), false);
            document.getElementById("gmail-action-block").style.display = "block";
        }
    }
}

// Regex matching alert signals
function parseEmailToTransaction(gMsg) {
    const snippet = gMsg.snippet || "";
    // Clean spaces
    const body = snippet.replace(/\s+/g, " ");
    
    // 1. Amount Extraction (Rupee matches: Rs., INR, or ₹)
    const amountRegex = /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const amountMatch = body.match(amountRegex);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // 2. Transaction Type detection (Credits vs Debits)
    let type = "debit";
    if (/credited|received|refunded|added|cashback/i.test(body)) {
        type = "credit";
    }

    // 3. Description/Vendor extraction
    let description = "Google Sync Alert";
    
    // Look for merchant keywords: "paid to X", "spent at X", "transfer to X"
    const paidToMatch = body.match(/(?:paid to|spent at|transfer to|sent to|spent on)\s*([A-Za-z0-9\s]+?)(?:on|at|via|Rs|\.|$)/i);
    if (paidToMatch && paidToMatch[1].trim()) {
        description = paidToMatch[1].trim().substring(0, 32);
    } else {
        const subjectHeader = gMsg.payload.headers.find(h => h.name.toLowerCase() === "subject");
        if (subjectHeader) {
            description = subjectHeader.value.replace(/Fwd:|Re:|Alert:|Notification:/gi, "").trim().substring(0, 32);
        }
    }

    // 4. Date extraction
    let dateStr = new Date().toISOString().substring(0, 10);
    if (gMsg.internalDate) {
        dateStr = new Date(parseInt(gMsg.internalDate)).toISOString().substring(0, 10);
    }

    // 5. Category mapping based on description text
    let category = "misc";
    const descLower = description.toLowerCase();
    if (type === "credit") {
        category = "savings";
    } else {
        if (/swiggy|zomato|ubereats|restaurant|hotel|food|cafe|starbucks|bhimas/i.test(descLower)) category = "food";
        else if (/ola|uber|rapido|irctc|metro|flight|cab|rail|train|travel/i.test(descLower)) category = "travel";
        else if (/netflix|spotify|disney|prime|amazon|tv|sub|youtube/i.test(descLower)) category = "subscriptions";
        else if (/grocery|mart|supermarket|bigbasket|blinkit|milk/i.test(descLower)) category = "groceries";
        else if (/movie|theatre|cinema|bookmyshow|pub|club|beer/i.test(descLower)) category = "entertainment";
        else if (/loan|hdfc|sbi|mortgage/i.test(descLower)) category = "loan";
        else if (/emi|installment/i.test(descLower)) category = "emi";
    }

    return {
        id: gMsg.id,
        description,
        amount,
        type,
        date: dateStr,
        category,
        scope: "global"
    };
}

// Render dynamic parsed sync ledger lists
function renderGmailTransactionsList() {
    const list = document.getElementById("gmail-transactions-list");
    list.innerHTML = "";
    
    // Sort transactions by date descending
    state.gmail.parsedTransactions.sort((a,b) => b.date.localeCompare(a.date));

    state.gmail.parsedTransactions.forEach((tx, idx) => {
        const row = document.createElement("div");
        row.className = `gmail-row ${tx.type}`;
        
        // Scope options select string
        const scopeOptions = `
            <select class="form-control form-control-sm" id="gmail-scope-${idx}" onchange="updateGmailRowScope(${idx}, this.value)" style="border: none; padding: 0.15rem 0.25rem;">
                <option value="global" ${tx.scope === 'global' ? 'selected' : ''}>Global</option>
                <option value="tirupati" ${tx.scope === 'tirupati' ? 'selected' : ''}>Tirupati</option>
                <option value="bangalore" ${tx.scope === 'bangalore' ? 'selected' : ''}>Bangalore</option>
            </select>
        `;

        // Category options string based on scope
        const categoriesOptions = getGmailRowCategoryOptionsHTML(tx.scope, tx.category);

        row.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                <input type="checkbox" id="gmail-chk-${idx}" checked style="cursor: pointer; width: 16px; height: 16px;" onchange="updateGmailImportCount()">
            </div>
            <div class="gmail-description" title="${tx.description}">${tx.description}</div>
            <div class="gmail-amount ${tx.type}">${tx.type === 'credit' ? '+' : '-'} ₹${tx.amount.toLocaleString('en-IN')}</div>
            <div class="gmail-date">${tx.date}</div>
            <div>${scopeOptions}</div>
            <div id="gmail-cat-col-${idx}">${categoriesOptions}</div>
        `;
        list.appendChild(row);
    });

    updateGmailImportCount();
}

function getGmailRowCategoryOptionsHTML(scope, selectedCat) {
    let optsHTML = "";
    if (scope === "global") {
        Object.entries(PREDEFINED_CATEGORIES.global).forEach(([key, val]) => {
            optsHTML += `<option value="${key}" ${key === selectedCat ? 'selected' : ''}>${val.label}</option>`;
        });
        state.customCategories.filter(c => c.scopeType === 'global').forEach(cat => {
            optsHTML += `<option value="${cat.id}" ${cat.id === selectedCat ? 'selected' : ''}>${cat.label}</option>`;
        });
    } else {
        Object.entries(PREDEFINED_CATEGORIES.place).forEach(([key, val]) => {
            optsHTML += `<option value="${key}" ${key === selectedCat ? 'selected' : ''}>${val.label}</option>`;
        });
        state.customCategories.filter(c => c.scopeType === 'place').forEach(cat => {
            optsHTML += `<option value="${cat.id}" ${cat.id === selectedCat ? 'selected' : ''}>${cat.label}</option>`;
        });
    }
    return `
        <select class="form-control form-control-sm" id="gmail-cat-select-${optsHTML ? '' : 'fallback'}" style="border: none; padding: 0.15rem 0.25rem;">
            ${optsHTML}
        </select>
    `;
}

// Triggered when changing scope in a parsed review checklist row
window.updateGmailRowScope = function(idx, newScope) {
    state.gmail.parsedTransactions[idx].scope = newScope;
    
    // If scope changes, categories select must update to display matching scopes options
    const col = document.getElementById(`gmail-cat-col-${idx}`);
    if (col) {
        // Auto-assign first matching category or fallback
        const defaultCat = newScope === 'global' ? 'savings' : 'food';
        state.gmail.parsedTransactions[idx].category = defaultCat;
        col.innerHTML = getGmailRowCategoryOptionsHTML(newScope, defaultCat);
    }
};

function updateGmailImportCount() {
    let checkedCount = 0;
    state.gmail.parsedTransactions.forEach((tx, idx) => {
        const chk = document.getElementById(`gmail-chk-${idx}`);
        if (chk && chk.checked) checkedCount++;
    });
    
    document.getElementById("btn-gmail-import-submit").textContent = `Import Selected (${checkedCount})`;
}

// Bulk insert parsed list into ledger
function handleGmailImportSubmit() {
    let imported = 0;
    let monthsToInit = new Set(state.initializedMonths);

    state.gmail.parsedTransactions.forEach((tx, idx) => {
        const chk = document.getElementById(`gmail-chk-${idx}`);
        if (chk && chk.checked) {
            // Get final category and scope from dropdowns
            const scopeSelect = document.getElementById(`gmail-scope-${idx}`);
            const rowScope = scopeSelect ? scopeSelect.value : tx.scope;
            
            const catRow = document.getElementById(`gmail-cat-col-${idx}`);
            const catSelect = catRow ? catRow.querySelector("select") : null;
            const rowCategory = catSelect ? catSelect.value : tx.category;

            const finalTx = {
                id: "tx-gmail-" + tx.id,
                description: tx.description,
                amount: tx.amount,
                type: tx.type,
                scope: rowScope,
                category: rowCategory,
                date: tx.date
            };

            // Prepend new item
            state.transactions.unshift(finalTx);
            
            // Auto initialize month if not already present
            const mKey = tx.date.substring(0, 7);
            monthsToInit.add(mKey);
            
            imported++;
        }
    });

    if (imported > 0) {
        state.initializedMonths = Array.from(monthsToInit);
        saveData();
        closeGmailModal();
        
        // If we are currently in dashboard, reload scoped stats. If not, reload home.
        if (state.activeMonth) {
            updateDashboardUI();
        } else {
            updateHomeUI();
        }
        alert(`Successfully imported ${imported} transaction${imported !== 1 ? 's' : ''} from Gmail.`);
    } else {
        alert("No items selected for import.");
    }
}

// Add/Edit transaction inside scoped dashboard modal
function openTransactionModal(editId = null) {
    const modal = document.getElementById("tx-modal");
    const heading = document.getElementById("modal-heading");
    const form = document.getElementById("tx-form");
    
    form.reset();
    state.modal.editId = editId;

    const todayStr = new Date().toISOString().substring(8, 10);
    document.getElementById("tx-date").value = `${state.activeMonth}-${todayStr}`;

    if (editId) {
        heading.textContent = "Edit Transaction";
        const tx = state.transactions.find(t => t.id === editId);
        if (tx) {
            document.querySelectorAll("#tx-modal [data-type]").forEach(btn => {
                if (btn.dataset.type === tx.type) btn.classList.add("active");
                else btn.classList.remove("active");
            });
            state.modal.type = tx.type;

            document.querySelectorAll("#scope-segments [data-scope]").forEach(btn => {
                if (btn.dataset.scope === tx.scope) btn.classList.add("active");
                else btn.classList.remove("active");
            });
            state.modal.scope = tx.scope;

            updateFormCategoriesDropdown();
            
            document.getElementById("tx-id").value = tx.id;
            document.getElementById("tx-description").value = tx.description;
            document.getElementById("tx-amount").value = tx.amount;
            document.getElementById("tx-date").value = tx.date;
            document.getElementById("tx-category").value = tx.category;
        }
    } else {
        heading.textContent = "Add Transaction";
        document.getElementById("tx-id").value = "";
        
        document.querySelectorAll("#tx-modal [data-type]").forEach(btn => {
            if (btn.dataset.type === "debit") btn.classList.add("active");
            else btn.classList.remove("active");
        });
        state.modal.type = "debit";

        document.querySelectorAll("#scope-segments [data-scope]").forEach(btn => {
            if (btn.dataset.scope === "tirupati") btn.classList.add("active");
            else btn.classList.remove("active");
        });
        state.modal.scope = "tirupati";
        
        updateFormCategoriesDropdown();
    }

    modal.classList.add("active");
    lucide.createIcons();
}

function closeTransactionModal() {
    document.getElementById("tx-modal").classList.remove("active");
    state.modal.editId = null;
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById("tx-id").value;
    const description = document.getElementById("tx-description").value.trim();
    const amount = parseFloat(document.getElementById("tx-amount").value);
    const date = document.getElementById("tx-date").value;
    const category = document.getElementById("tx-category").value;
    
    const type = state.modal.type;
    const scope = state.modal.scope;

    if (date.substring(0, 7) !== state.activeMonth) {
        alert(`You are adding a transaction for date ${date}, but this dashboard is scoped specifically for ${state.activeMonth}. Please enter a date within the active month.`);
        return;
    }

    if (!description || isNaN(amount) || amount <= 0 || !date || !category) {
        alert("Please fill in all transaction values correctly.");
        return;
    }

    const txData = {
        id: id || "tx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        description,
        amount,
        type,
        scope,
        category,
        date
    };

    if (id) {
        const idx = state.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            state.transactions[idx] = txData;
        }
    } else {
        state.transactions.unshift(txData);
    }

    saveData();
    closeTransactionModal();
    updateDashboardUI();
}

function deleteTransaction(id) {
    if (confirm("Are you sure you want to permanently delete this transaction?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveData();
        updateDashboardUI();
    }
}

// Formatting helpers
function formatCurrency(num) {
    const formatted = Math.abs(num).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    });
    return num < 0 ? `-${formatted}` : formatted;
}

function formatDateDisplay(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
