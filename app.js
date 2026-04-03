// State Management & Mock Data
let state = {
    role: 'viewer', // 'viewer' or 'admin'
    filterType: 'all', // 'all', 'income', 'expense'
    searchQuery: '',
    transactions: [
        { id: 1, name: 'Freelance Design', amount: 1250.00, type: 'income', category: 'Salary', date: '2026-04-01' },
        { id: 2, name: 'Whole Foods Market', amount: 145.20, type: 'expense', category: 'Groceries', date: '2026-04-02' },
        { id: 3, name: 'Netflix Subscription', amount: 15.99, type: 'expense', category: 'Subscriptions', date: '2026-04-02' },
        { id: 4, name: 'Electric Bill', amount: 89.50, type: 'expense', category: 'Utilities', date: '2026-03-28' },
        { id: 5, name: 'Stock Dividends', amount: 340.00, type: 'income', category: 'Other', date: '2026-03-25' },
        { id: 6, name: 'Uber Rides', amount: 45.00, type: 'expense', category: 'Entertainment', date: '2026-03-24' },
        { id: 7, name: 'Client Retainer', amount: 3000.00, type: 'income', category: 'Salary', date: '2026-03-15' },
        { id: 8, name: 'Amazon Shopping', amount: 210.00, type: 'expense', category: 'Other', date: '2026-03-10' },
    ]
};

// DOM Elements
const els = {
    totalBalance: document.getElementById('totalBalance'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    transactionList: document.getElementById('transactionList'),
    roleSelect: document.getElementById('roleSelect'),
    adminElements: document.querySelectorAll('.admin-only'),
    addBtn: document.getElementById('addTransactionBtn'),
    modal: document.getElementById('transactionModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    txForm: document.getElementById('transactionForm'),
    txSearch: document.getElementById('transactionSearch'),
    txFilter: document.getElementById('transactionFilter'),
    insightsList: document.getElementById('insightsList'),
};

// Charts instances
let trendChartInstance = null;
let categoryChartInstance = null;

// Initialize app
function init() {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (e) {
        console.error('Error creating icons:', e);
    }
    setupEventListeners();
    updateUI();
    try {
        renderCharts();
    } catch (e) {
        console.error('Error rendering charts:', e);
    }
}

// ------------------- UI Rendering -------------------

function updateUI() {
    calculateSummary();
    renderTransactions();
    generateInsights();
    applyRoleUI();
    
    // Smooth update for charts if they exist
    if (trendChartInstance && categoryChartInstance) {
        updateChartsData();
    }
}

function calculateSummary() {
    const { income, expense } = state.transactions.reduce((acc, curr) => {
        if (curr.type === 'income') acc.income += curr.amount;
        else acc.expense += curr.amount;
        return acc;
    }, { income: 0, expense: 0 });

    const balance = income - expense;

    // Animate numbers (simple implementation)
    els.totalBalance.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    els.totalIncome.textContent = `$${income.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    els.totalExpense.textContent = `$${expense.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function formatAmount(amount, type) {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return type === 'income' ? `+$${formatted}` : `-$${formatted}`;
}

function renderTransactions() {
    let filteredList = state.transactions.filter(tx => {
        const matchesType = state.filterType === 'all' || tx.type === state.filterType;
        const matchesSearch = tx.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                              tx.category.toLowerCase().includes(state.searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    // Sort by date descending
    filteredList.sort((a, b) => new Date(b.date) - new Date(a.date));

    els.transactionList.innerHTML = '';

    if (filteredList.length === 0) {
        els.transactionList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 32px;">No transactions found.</td></tr>`;
        return;
    }

    filteredList.forEach(tx => {
        const typeClass = tx.type === 'income' ? 'income' : 'expense';
        const dateObj = new Date(tx.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="tx-name">${tx.name}</span>
                <span class="tx-category">${tx.category}</span>
            </td>
            <td>${formattedDate}</td>
            <td class="tx-amount ${typeClass}">${formatAmount(tx.amount, tx.type)}</td>
            <td><span class="tx-pill ${typeClass}">${tx.type}</span></td>
            <td class="admin-only ${state.role === 'viewer' ? 'hidden' : ''}">
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="window.editTransaction(${tx.id})" title="Edit">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteTransaction(${tx.id})" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        els.transactionList.appendChild(tr);
    });

    // Re-initialize icons for new DOM elements
    lucide.createIcons();
}

function applyRoleUI() {
    const adminElements = document.querySelectorAll('.admin-only');
    const addBtn = document.getElementById('addTransactionBtn');
    
    if (state.role === 'admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
        addBtn.classList.remove('hidden');
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        addBtn.classList.add('hidden');
    }
}

// ------------------- Charts -------------------

function getChartTheme() {
    const style = getComputedStyle(document.body);
    return {
        textPrimary: style.getPropertyValue('--text-primary').trim(),
        textMuted: style.getPropertyValue('--text-muted').trim(),
        panelBorder: style.getPropertyValue('--panel-border').trim(),
        accentPrimary: style.getPropertyValue('--accent-primary').trim(),
        success: style.getPropertyValue('--success').trim(),
        danger: style.getPropertyValue('--danger').trim(),
    };
}

function updateChartsData() {
    // 1. Process Trend Data (Group by Month for simple view)
    const monthlyData = {};
    const monthsStr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    state.transactions.forEach(tx => {
        const d = new Date(tx.date);
        const monthKey = monthsStr[d.getMonth()];
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        monthlyData[monthKey][tx.type] += tx.amount;
    });

    // Extract ordered data for the last few months present in data
    const labels = Object.keys(monthlyData).sort((a, b) => monthsStr.indexOf(a) - monthsStr.indexOf(b));
    const incomes = labels.map(l => monthlyData[l].income);
    const expenses = labels.map(l => monthlyData[l].expense);

    trendChartInstance.data.labels = labels;
    trendChartInstance.data.datasets[0].data = incomes;
    trendChartInstance.data.datasets[1].data = expenses;
    trendChartInstance.update();

    // 2. Process Category Data (Expenses only)
    const categoryData = {};
    state.transactions.filter(tx => tx.type === 'expense').forEach(tx => {
        categoryData[tx.category] = (categoryData[tx.category] || 0) + tx.amount;
    });

    categoryChartInstance.data.labels = Object.keys(categoryData);
    categoryChartInstance.data.datasets[0].data = Object.values(categoryData);
    categoryChartInstance.update();
}

function renderCharts() {
    const theme = getChartTheme();
    
    // Set global Chart.js defaults for our aesthetic
    Chart.defaults.color = theme.textMuted;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Time-based Visualization (Area Chart)
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    
    // Create gradient
    const gradientIncome = ctxTrend.createLinearGradient(0, 0, 0, 400);
    gradientIncome.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // success
    gradientIncome.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    
    const gradientExpense = ctxTrend.createLinearGradient(0, 0, 0, 400);
    gradientExpense.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // danger
    gradientExpense.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: [], // Populated by updateChartsData
            datasets: [
                {
                    label: 'Income',
                    data: [],
                    borderColor: theme.success,
                    backgroundColor: gradientIncome,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: theme.success
                },
                {
                    label: 'Expenses',
                    data: [],
                    borderColor: theme.danger,
                    backgroundColor: gradientExpense,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: theme.danger
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6 } },
                tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', titleColor: '#fff', padding: 12, borderRadius: 8 }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false } },
                y: { grid: { color: theme.panelBorder, drawBorder: false }, beginAtZero: true }
            }
        }
    });

    // 2. Categorical Visualization (Doughnut Chart)
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6 } },
                tooltip: { backgroundColor: 'rgba(17, 24, 39, 0.9)', padding: 12, borderRadius: 8 }
            }
        }
    });

    updateChartsData();
}

// ------------------- Insights -------------------

function generateInsights() {
    els.insightsList.innerHTML = '';
    const expenses = state.transactions.filter(tx => tx.type === 'expense');
    
    // 1. Highest Spending Category
    const categoryTotals = {};
    expenses.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });
    
    let maxCat = '';
    let maxAmount = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > maxAmount) {
            maxAmount = amt;
            maxCat = cat;
        }
    }

    // 2. Largest single transaction
    let largestTx = expenses.length ? expenses.reduce((max, tx) => tx.amount > max.amount ? tx : max, expenses[0]) : null;

    // 3. Save rate
    const totalInc = state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExp = expenses.reduce((sum, t) => sum + t.amount, 0);
    const saveRate = totalInc > 0 ? ((totalInc - totalExp) / totalInc * 100).toFixed(1) : 0;

    const insights = [];
    if (maxCat) insights.push({ title: 'Top Expense Category', value: `${maxCat} ($${maxAmount.toLocaleString()})` });
    if (largestTx) insights.push({ title: 'Largest Single Expense', value: `${largestTx.name} ($${largestTx.amount.toLocaleString()})` });
    insights.push({ title: 'Overall Savings Rate', value: `${saveRate}% of income` });

    insights.forEach(ins => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="insight-title">${ins.title}</span>
            <span class="insight-value">${ins.value}</span>
        `;
        els.insightsList.appendChild(li);
    });
}

// ------------------- Event Listeners & Actions -------------------

function setupEventListeners() {
    // Sidebar Navigation
    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
        });
    });

    // Top Controls
    const notificationBtn = document.querySelector('.icon-btn.tooltip');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            alert('Notifications feature coming soon!');
        });
    }

    const timeRangeFilter = document.getElementById('timeRangeFilter');
    if (timeRangeFilter) {
        timeRangeFilter.addEventListener('change', (e) => {
            updateChartsData();
        });
    }

    els.roleSelect.addEventListener('change', (e) => {
        state.role = e.target.value;
        updateUI();
    });

    // Transaction Controls
    els.txSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTransactions();
    });

    els.txFilter.addEventListener('change', (e) => {
        state.filterType = e.target.value;
        renderTransactions();
    });

    // Modal Controls
    els.addBtn.addEventListener('click', () => openModal());
    els.closeModalBtn.addEventListener('click', closeModal);
    els.cancelModalBtn.addEventListener('click', closeModal);
    
    els.txForm.addEventListener('submit', handleFormSubmit);

    // Make functions globally available for inline onclick attributes
    window.editTransaction = (id) => openModal(id);
    window.deleteTransaction = (id) => deleteTransaction(id);
}

function openModal(txId = null) {
    if (state.role !== 'admin') return;

    if (txId) {
        const tx = state.transactions.find(t => t.id === txId);
        if (tx) {
            document.getElementById('modalTitle').textContent = 'Edit Transaction';
            document.getElementById('txId').value = tx.id;
            document.getElementById('txName').value = tx.name;
            document.getElementById('txAmount').value = tx.amount;
            document.getElementById('txType').value = tx.type;
            document.getElementById('txCategory').value = tx.category;
            document.getElementById('txDate').value = tx.date;
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Transaction';
        els.txForm.reset();
        document.getElementById('txId').value = '';
        document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    }
    
    els.modal.classList.remove('hidden');
}

function closeModal() {
    els.modal.classList.add('hidden');
    els.txForm.reset();
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (state.role !== 'admin') return;

    const id = document.getElementById('txId').value;
    const name = document.getElementById('txName').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const type = document.getElementById('txType').value;
    const category = document.getElementById('txCategory').value;
    const date = document.getElementById('txDate').value;

    if (id) {
        // Edit existing
        const index = state.transactions.findIndex(t => t.id === parseInt(id));
        if (index !== -1) {
            state.transactions[index] = { id: parseInt(id), name, amount, type, category, date };
        }
    } else {
        // Add new
        const newId = Math.max(...state.transactions.map(t => t.id), 0) + 1;
        state.transactions.push({ id: newId, name, amount, type, category, date });
    }

    closeModal();
    updateUI();
}

function deleteTransaction(id) {
    if (state.role !== 'admin') return;
    if (confirm('Are you sure you want to delete this transaction?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        updateUI();
    }
}

// Bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
