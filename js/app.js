const app = {
    currentView: 'dashboard',
    editingClientId: null,
    editingProjectId: null,
    editingPackageId: null,

    async init() {
        await Store.init();
        this.addEventListeners();
        await this.navigate('dashboard');
    },

    addEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.addEventListener('click', async () => {
                const view = item.getAttribute('data-view');
                await this.navigate(view);
            });
        });

        // Quick Add Buttons
        document.getElementById('quick-add-client-btn').addEventListener('click', () => {
            this.openClientModal('לקוח חדש');
        });
        document.getElementById('quick-add-project-btn').addEventListener('click', () => {
            this.openProjectModal('פרויקט חדש');
        });

        // Modal Close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Form Submits
        document.getElementById('client-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleClientSubmit();
        });
        document.getElementById('project-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProjectSubmit();
        });

        // Delete Buttons (Using Custom Confirmation)
        document.getElementById('delete-client-btn').addEventListener('click', () => {
            this.confirmAction(
                'מחיקת לקוח',
                'האם את בטוחה שברצונך למחוק את הלקוח? שימי לב שלא ניתן למחוק לקוח שיש לו פרויקטים פתוחים.',
                async () => {
                    try {
                        await Store.deleteClient(this.editingClientId);
                        this.closeModal();
                        await this.navigate(this.currentView);
                    } catch (error) {
                        console.error('Delete client error:', error);
                        this.confirmAction('שגיאה', 'לא ניתן למחוק את הלקוח. יש למחוק תחילה את כל הפרויקטים המשויכים אליו.', null, true);
                    }
                }
            );
        });

        document.getElementById('delete-project-btn').addEventListener('click', () => {
            this.confirmAction(
                'מחיקת פרויקט',
                'האם את בטוחה שברצונך למחוק את הפרויקט?',
                async () => {
                    try {
                        await Store.deleteProject(this.editingProjectId);
                        this.closeModal();
                        await this.navigate(this.currentView);
                    } catch (error) {
                        console.error('Delete project error:', error);
                        this.confirmAction('שגיאה', 'חלה שגיאה במחיקת הפרויקט. אנא נסי שוב.', null, true);
                    }
                }
            );
        });

        document.getElementById('edit-project-toggle').addEventListener('click', () => {
            this.setProjectEditMode(true);
        });

        // Confirmation Modal Buttons
        document.getElementById('confirm-no-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
        });
    },

    confirmAction(title, desc, onConfirm, isAlert = false) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const descEl = document.getElementById('confirm-desc');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        titleEl.innerText = title;
        descEl.innerText = desc;
        modal.classList.remove('hidden');

        if (isAlert) {
            yesBtn.style.display = 'none';
            noBtn.innerText = 'הבנתי';
        } else {
            yesBtn.style.display = 'block';
            noBtn.innerText = 'ביטול';
            
            // Clean old event listeners by cloning
            const newYesBtn = yesBtn.cloneNode(true);
            yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
            
            newYesBtn.addEventListener('click', async () => {
                modal.classList.add('hidden');
                if (onConfirm) await onConfirm();
            });
        }
    },

    async navigate(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === view);
        });

        switch(view) {
            case 'dashboard': await UI.renderDashboard(); break;
            case 'clients': await UI.renderClients(); break;
            case 'projects': await UI.renderProjects(); break;
            case 'calendar': await UI.renderCalendar(); break;
            case 'settings': await UI.renderSettings(); break;
        }
    },

    // Client Modal
    openClientModal(title, clientId = null) {
        this.editingClientId = clientId;
        document.getElementById('client-modal-title').innerText = title;
        document.getElementById('client-modal').classList.remove('hidden');
        const deleteBtn = document.getElementById('delete-client-btn');
        
        if (clientId) {
            deleteBtn.style.display = 'block';
            Store.getClients().then(clients => {
                const c = clients.find(cust => cust.id === clientId);
                if (c) {
                    document.getElementById('client-name').value = c.name;
                    document.getElementById('client-phone').value = c.phone;
                    document.getElementById('client-source').value = c.source;
                }
            });
        } else {
            document.getElementById('client-form').reset();
            deleteBtn.style.display = 'none';
        }
    },

    // Project Modal
    async openProjectModal(title, projectId = null, selectedClientId = null) {
        this.editingProjectId = projectId;
        document.getElementById('project-modal-title').innerText = title;
        document.getElementById('project-modal').classList.remove('hidden');
        const deleteBtn = document.getElementById('delete-project-btn');
        const editToggle = document.getElementById('edit-project-toggle');
        const driveLink = document.getElementById('project-drive-link');
        
        await UI.populateClientsDropdown(selectedClientId);

        if (projectId) {
            editToggle.style.display = 'flex';
            const projects = await Store.getProjects();
            const p = projects.find(proj => proj.id === projectId);
            if (p) {
                document.getElementById('project-client').value = p.client_id;
                document.getElementById('project-name').value = p.name;
                document.getElementById('project-date').value = p.shoot_date || '';
                document.getElementById('project-status').value = p.status || 'new';
                document.getElementById('proj-total-price').value = p.payments?.total || '';
                document.getElementById('proj-deposit-paid').value = p.payments?.deposit || '';
                document.getElementById('project-drive').value = p.drive_link || '';
                document.getElementById('project-notes').value = p.notes || '';
                
                if (p.drive_link) {
                    driveLink.href = p.drive_link;
                    driveLink.style.display = 'flex';
                } else {
                    driveLink.style.display = 'none';
                }
            }
            this.setProjectEditMode(false);
            deleteBtn.style.display = 'block';
        } else {
            editToggle.style.display = 'none';
            driveLink.style.display = 'none';
            document.getElementById('project-form').reset();
            if (selectedClientId) document.getElementById('project-client').value = selectedClientId;
            this.setProjectEditMode(true);
            deleteBtn.style.display = 'none';
        }
        if (window.lucide) lucide.createIcons();
    },

    setProjectEditMode(isEdit) {
        const form = document.getElementById('project-form');
        const inputs = form.querySelectorAll('input, select, textarea');
        const saveBtn = document.getElementById('save-project-btn');
        const editToggle = document.getElementById('edit-project-toggle');

        inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
                input.disabled = !isEdit;
            } else {
                input.readOnly = !isEdit;
            }
        });

        saveBtn.style.display = isEdit ? 'block' : 'none';
        if (this.editingProjectId) {
            editToggle.style.display = isEdit ? 'none' : 'flex';
        }
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        this.editingClientId = null;
        this.editingProjectId = null;
    },

    async handleClientSubmit() {
        const client = {
            id: this.editingClientId,
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            source: document.getElementById('client-source').value
        };
        await Store.saveClient(client);
        this.closeModal();
        await this.navigate(this.currentView);
    },

    async handleProjectSubmit() {
        const project = {
            id: this.editingProjectId,
            clientId: document.getElementById('project-client').value,
            name: document.getElementById('project-name').value,
            shootDate: document.getElementById('project-date').value,
            status: document.getElementById('project-status').value,
            payments: {
                total: parseFloat(document.getElementById('proj-total-price').value) || 0,
                deposit: parseFloat(document.getElementById('proj-deposit-paid').value) || 0
            },
            driveLink: document.getElementById('project-drive').value,
            notes: document.getElementById('project-notes').value
        };
        await Store.saveProject(project);
        this.closeModal();
        await this.navigate(this.currentView);
    },

    editClient(id) { this.openClientModal('עריכת לקוח', id); },
    viewProject(id) { this.openProjectModal('פרטי פרויקט', id); },
    editProject(id) { 
        this.openProjectModal('עריכת פרויקט', id);
        this.setProjectEditMode(true);
    },

    // Direct Deletion from lists
    directDeleteClient(id) {
        this.editingClientId = id;
        document.getElementById('delete-client-btn').click();
    },

    directDeleteProject(id) {
        this.editingProjectId = id;
        document.getElementById('delete-project-btn').click();
    },

    async updateStatus(id, newStatus) {
        const projects = await Store.getProjects();
        const p = projects.find(proj => proj.id === id);
        if (p) {
            p.status = newStatus;
            await Store.saveProject({ ...p, clientId: p.client_id, driveLink: p.drive_link, shootDate: p.shoot_date });
            await this.navigate(this.currentView);
        }
    },

    // Packages logic stays similarly
    async savePackage() {
        const name = document.getElementById('new-pkg-name').value;
        const price = document.getElementById('new-pkg-price').value;
        await Store.savePackage({ id: this.editingPackageId, name, price: parseFloat(price) });
        this.clearPackageForm();
        await this.navigate('settings');
    },

    async editPackage(id) {
        const pkgs = await Store.getPackages();
        const pkg = pkgs.find(p => p.id === id);
        if (pkg) {
            this.editingPackageId = id;
            document.getElementById('new-pkg-name').value = pkg.name;
            document.getElementById('new-pkg-price').value = pkg.price;
            document.getElementById('package-form-title').innerText = 'עריכת חבילה';
            document.getElementById('add-pkg-btn').innerText = 'שמירה';
            document.getElementById('cancel-pkg-btn').style.display = 'block';
        }
    },
    
    clearPackageForm() {
        this.editingPackageId = null;
        document.getElementById('new-pkg-name').value = '';
        document.getElementById('new-pkg-price').value = '';
        document.getElementById('package-form-title').innerText = 'הוספת חבילה חדשה';
        document.getElementById('add-pkg-btn').innerText = 'הוספה';
        document.getElementById('cancel-pkg-btn').style.display = 'none';
    },

    async deletePackage(id) {
        if (confirm('מחיקת חבילה?')) {
            await Store.deletePackage(id);
            await this.navigate('settings');
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
