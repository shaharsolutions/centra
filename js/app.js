const app = {
    currentView: 'dashboard',
    editingCustomerId: null,
    editingPackageId: null,

    init() {
        this.addEventListeners();
        this.navigate('dashboard');
        UI.populatePackages();
    },

    addEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                this.navigate(view);
            });
        });

        // Quick Add Button
        document.getElementById('quick-add-btn').addEventListener('click', () => {
            this.openModal('לקוח חדש');
        });

        // Modal Close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Form Submit
        document.getElementById('customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Delete Button
        document.getElementById('delete-customer-btn').addEventListener('click', () => {
            if (confirm('בטוחה שברצונך למחוק את הלקוח?')) {
                Store.deleteCustomer(this.editingCustomerId);
                this.closeModal();
                this.navigate(this.currentView);
            }
        });
    },

    navigate(view) {
        this.currentView = view;
        
        // Update active class in sidebar
        document.querySelectorAll('.nav-links li').forEach(item => {
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Render view
        switch(view) {
            case 'dashboard': UI.renderDashboard(); break;
            case 'customers': UI.renderCustomers(); break;
            case 'calendar': UI.renderCalendar(); break;
            case 'editing': UI.renderEditing(); break;
            case 'settings': UI.renderSettings(); break;
        }
    },

    openModal(title, customerId = null) {
        this.editingCustomerId = customerId;
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-container').classList.remove('hidden');
        const deleteBtn = document.getElementById('delete-customer-btn');
        
        if (customerId) {
            deleteBtn.style.display = 'block';
            const customers = Store.getCustomers();
            const c = customers.find(cust => cust.id === customerId);
            if (c) {
                document.getElementById('customer-name').value = c.name;
                document.getElementById('customer-phone').value = c.phone;
                document.getElementById('lead-source').value = c.source;
                document.getElementById('shoot-date').value = c.shootDate || '';
                document.getElementById('package').value = c.packageId || '';
                document.getElementById('total-price').value = c.payments?.total || '';
                document.getElementById('deposit-paid').value = c.payments?.deposit || '';
                document.getElementById('customer-status').value = c.status || 'new';
                document.getElementById('payment-status').value = c.payments?.status || 'unpaid';
                document.getElementById('notes').value = c.notes || '';
            }
        } else {
            document.getElementById('customer-form').reset();
            deleteBtn.style.display = 'none';
        }
    },

    closeModal() {
        document.getElementById('modal-container').classList.add('hidden');
        this.editingCustomerId = null;
    },

    handleFormSubmit() {
        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;
        const source = document.getElementById('lead-source').value;
        const shootDate = document.getElementById('shoot-date').value;
        const packageId = document.getElementById('package').value;
        const totalPrice = document.getElementById('total-price').value;
        const depositPaid = document.getElementById('deposit-paid').value;
        const status = document.getElementById('customer-status').value;
        const paymentStatus = document.getElementById('payment-status').value;
        const notes = document.getElementById('notes').value;

        const customer = {
            id: this.editingCustomerId,
            name,
            phone,
            source,
            shootDate,
            packageId,
            status,
            payments: {
                total: parseFloat(totalPrice) || 0,
                deposit: parseFloat(depositPaid) || 0,
                status: paymentStatus
            },
            notes
        };

        Store.saveCustomer(customer);
        this.closeModal();
        this.navigate(this.currentView); // Refresh current view
    },

    editCustomer(id) {
        this.openModal('עריכת לקוח', id);
    },

    updateStatus(id, newStatus) {
        const customers = Store.getCustomers();
        const index = customers.findIndex(c => c.id === id);
        if (index > -1) {
            customers[index].status = newStatus;
            localStorage.setItem('photographer_customers', JSON.stringify(customers));
            this.navigate(this.currentView);
        }
    },

    // Package Management
    savePackage() {
        const name = document.getElementById('new-pkg-name').value;
        const price = document.getElementById('new-pkg-price').value;
        
        if (!name || !price) {
            alert('נא למלא שם ומחיר לחבילה');
            return;
        }

        Store.savePackage({ 
            id: this.editingPackageId, 
            name, 
            price: parseFloat(price) 
        });
        
        this.clearPackageForm();
        this.navigate('settings');
        UI.populatePackages();
    },

    editPackage(id) {
        const pkg = Store.getPackages().find(p => p.id === id);
        if (pkg) {
            this.editingPackageId = id;
            document.getElementById('new-pkg-name').value = pkg.name;
            document.getElementById('new-pkg-price').value = pkg.price;
            document.getElementById('package-form-title').innerText = 'עריכת חבילה';
            document.getElementById('add-pkg-btn').innerText = 'שמירת שינויים';
            document.getElementById('cancel-pkg-btn').style.display = 'block';
            document.getElementById('package-form-container').style.background = '#F5F3FF';
            document.getElementById('package-form-container').style.borderColor = 'var(--primary)';
        }
    },

    clearPackageForm() {
        this.editingPackageId = null;
        const nameInput = document.getElementById('new-pkg-name');
        const priceInput = document.getElementById('new-pkg-price');
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        
        const title = document.getElementById('package-form-title');
        const btn = document.getElementById('add-pkg-btn');
        const cancelBtn = document.getElementById('cancel-pkg-btn');
        const container = document.getElementById('package-form-container');

        if (title) title.innerText = 'הוספת חבילה חדשה';
        if (btn) btn.innerText = 'הוספה';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (container) {
            container.style.background = 'white';
            container.style.borderColor = 'var(--border)';
        }
    },

    deletePackage(id) {
        if (confirm('בטוחה שברצונך למחוק חבילה זו?')) {
            Store.deletePackage(id);
            this.navigate('settings');
            UI.populatePackages();
        }
    },

    resetData() {
        if (confirm('אזהרה: כל הלקוחות והחבילות יימחקו. האם את בטוחה?')) {
            localStorage.clear();
            location.reload();
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
