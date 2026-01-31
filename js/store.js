const Store = {
    // Default system settings
    defaults: {
        packages: [
            { id: 'p1', name: 'סטילס בלבד - שעה', price: 800 },
            { id: 'p2', name: 'סטילס בלבד - שעתיים', price: 1400 },
            { id: 'p3', name: 'חבילת משפחה מורחבת', price: 2200 },
            { id: 'p4', name: 'בוק בת מצווה פרימיום', price: 3500 }
        ],
        statuses: [
            { id: 'new', label: 'פנייה חדשה', class: 'badge-new' },
            { id: 'quote', label: 'הצעת מחיר', class: 'badge-quote' },
            { id: 'closed', label: 'סגור', class: 'badge-closed' },
            { id: 'shooting', label: 'בצילום', class: 'badge-shooting' },
            { id: 'editing', label: 'בעריכה', class: 'badge-editing' },
            { id: 'delivered', label: 'נמסר', class: 'badge-delivered' }
        ]
    },

    // Get all initial state
    init() {
        if (!localStorage.getItem('photographer_customers')) {
            localStorage.setItem('photographer_customers', JSON.stringify([]));
        }
        if (!localStorage.getItem('photographer_packages')) {
            localStorage.setItem('photographer_packages', JSON.stringify(this.defaults.packages));
        }
    },

    // Customers
    getCustomers() {
        return JSON.parse(localStorage.getItem('photographer_customers')) || [];
    },

    saveCustomer(customer) {
        const customers = this.getCustomers();
        if (customer.id) {
            const index = customers.findIndex(c => c.id === customer.id);
            customers[index] = { ...customers[index], ...customer };
        } else {
            customer.id = 'c' + Date.now();
            customer.createdAt = new Date().toISOString();
            customer.status = customer.status || 'new';
            if (!customer.payments) {
                customer.payments = { total: 0, deposit: 0, status: 'unpaid' };
            }
            customers.push(customer);
        }
        localStorage.setItem('photographer_customers', JSON.stringify(customers));
        return customer;
    },

    deleteCustomer(id) {
        const customers = this.getCustomers().filter(c => c.id !== id);
        localStorage.setItem('photographer_customers', JSON.stringify(customers));
    },

    // Packages
    getPackages() {
        return JSON.parse(localStorage.getItem('photographer_packages')) || this.defaults.packages;
    },

    savePackage(pkg) {
        const packages = this.getPackages();
        if (pkg.id) {
            const index = packages.findIndex(p => p.id === pkg.id);
            packages[index] = pkg;
        } else {
            pkg.id = 'p' + Date.now();
            packages.push(pkg);
        }
        localStorage.setItem('photographer_packages', JSON.stringify(packages));
    },

    // Utils
    getStatusInfo(statusId) {
        return this.defaults.statuses.find(s => s.id === statusId) || this.defaults.statuses[0];
    }
};

Store.init();
window.Store = Store;
