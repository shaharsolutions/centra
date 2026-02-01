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
        document.getElementById('package-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePackageSubmit();
        });

        // Delete Buttons (Using Custom Confirmation)
        document.getElementById('delete-client-btn').addEventListener('click', (e) => {
            e.stopPropagation();
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

        document.getElementById('delete-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
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

        document.getElementById('cancel-edit-project').addEventListener('click', () => {
            this.setProjectEditMode(false);
        });

        document.getElementById('edit-client-toggle').addEventListener('click', () => {
            this.setClientEditMode(true);
        });

        document.getElementById('cancel-edit-client').addEventListener('click', () => {
            this.setClientEditMode(false);
        });

        // Auto-save project status changes
        document.getElementById('project-status').addEventListener('change', async (e) => {
            if (this.editingProjectId) {
                const newStatus = e.target.value;
                await this.updateStatus(this.editingProjectId, newStatus);
            }
        });

        // Auto-fill price when selecting a package
        document.getElementById('project-name').addEventListener('input', async (e) => {
            const packageName = e.target.value;
            const packages = await Store.getPackages();
            const selectedPackage = packages.find(p => p.name === packageName);
            
            if (selectedPackage) {
                document.getElementById('proj-total-price').value = selectedPackage.price;
            }
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

        // Reset display
        yesBtn.style.display = isAlert ? 'none' : 'block';
        noBtn.innerText = isAlert ? 'הבנתי' : 'ביטול';

        // Use clonal replacement to clear ALL old listeners
        const newYesBtn = yesBtn.cloneNode(true);
        const newNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);

        // Add fresh listeners
        newNoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.add('hidden');
        }, { once: true });

        if (!isAlert) {
            newYesBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.add('hidden');
                if (onConfirm) await onConfirm();
            }, { once: true });
        }

        // Delay showing to avoid catching the current event bubble
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 10);
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
        const editToggle = document.getElementById('edit-client-toggle');
        
        if (clientId) {
            editToggle.style.display = 'flex';
            deleteBtn.style.display = 'block';
            Store.getClients().then(clients => {
                const c = clients.find(cust => cust.id === clientId);
                if (c) {
                    document.getElementById('client-name').value = c.name;
                    document.getElementById('client-phone').value = c.phone;
                    document.getElementById('client-source').value = c.source;

                    // Populate view spans
                    document.getElementById('client-name-view').innerText = c.name;
                    document.getElementById('client-phone-view').innerText = c.phone;
                    document.getElementById('client-source-view').innerText = UI.getSourceLabel(c.source);
                }
            });
            this.setClientEditMode(false);
            UI.renderNotes(clientId, null);
        } else {
            editToggle.style.display = 'none';
            deleteBtn.style.display = 'none';
            document.getElementById('client-form').reset();
            document.getElementById('client-notes-list').innerHTML = '';
            this.setClientEditMode(true);
        }
    },

    setClientEditMode(isEdit) {
        const form = document.getElementById('client-form');
        const saveBtn = document.getElementById('save-client-btn');
        const editToggle = document.getElementById('edit-client-toggle');
        const cancelEditBtn = document.getElementById('cancel-edit-client');
        const footerCancelBtn = document.getElementById('client-cancel-btn');

        // Toggle visibility of inputs and spans
        form.querySelectorAll('.view-group').forEach(group => {
            const input = group.querySelector('input, select, textarea');
            const span = group.querySelector('.view-text');
            
            if (isEdit) {
                input?.classList.remove('hidden');
                span?.classList.add('hidden');
                if (input && input.tagName === 'SELECT') input.disabled = false;
                if (input) input.readOnly = false;
            } else {
                input?.classList.add('hidden');
                span?.classList.remove('hidden');
                if (input && input.tagName === 'SELECT') input.disabled = true;
                if (input) input.readOnly = true;
            }
        });

        saveBtn.style.display = isEdit ? 'block' : 'none';
        
        if (this.editingClientId) {
            editToggle.style.display = isEdit ? 'none' : 'flex';
            cancelEditBtn.style.display = isEdit ? 'flex' : 'none';
            footerCancelBtn.style.display = isEdit ? 'none' : 'block';
        } else {
            // New client mode - always edit
            editToggle.style.display = 'none';
            cancelEditBtn.style.display = 'none';
            footerCancelBtn.style.display = 'block';
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
        await UI.populatePackagesDatalist();

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
                
                if (p.drive_link) {
                    driveLink.href = p.drive_link;
                    driveLink.style.display = 'flex';
                } else {
                    driveLink.style.display = 'none';
                }

                // Populate view spans
                document.getElementById('project-name-view').innerText = p.name;
                document.getElementById('project-date-view').innerText = p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : 'ללא תאריך';
                document.getElementById('proj-total-price-view').innerText = (p.payments?.total || 0) + ' ₪';
                document.getElementById('proj-deposit-paid-view').innerText = (p.payments?.deposit || 0) + ' ₪';
                document.getElementById('project-drive-view').innerText = p.drive_link || 'אין קישור';
            }
            this.setProjectEditMode(false);
            UI.renderNotes(null, projectId);
            deleteBtn.style.display = 'block';
        } else {
            editToggle.style.display = 'none';
            driveLink.style.display = 'none';
            document.getElementById('project-form').reset();
            document.getElementById('project-notes-list').innerHTML = '';
            if (selectedClientId) document.getElementById('project-client').value = selectedClientId;
            this.setProjectEditMode(true);
            deleteBtn.style.display = 'none';
        }
        if (window.lucide) lucide.createIcons();
    },

    setProjectEditMode(isEdit) {
        const form = document.getElementById('project-form');
        const saveBtn = document.getElementById('save-project-btn');
        const editToggle = document.getElementById('edit-project-toggle');
        const cancelEditBtn = document.getElementById('cancel-edit-project');
        const footerCancelBtn = document.getElementById('project-cancel-btn');

        // Toggle visibility of inputs and spans
        form.querySelectorAll('.view-group').forEach(group => {
            const input = group.querySelector('input, select, textarea');
            const span = group.querySelector('.view-text');
            
            if (isEdit) {
                input?.classList.remove('hidden');
                span?.classList.add('hidden');
                if (input && input.tagName === 'SELECT') input.disabled = false;
                if (input) input.readOnly = false;
            } else {
                input?.classList.add('hidden');
                span?.classList.remove('hidden');
                if (input && input.tagName === 'SELECT') input.disabled = true;
                if (input) input.readOnly = true;
            }
        });

        // Special handling for client dropdown (always visible but disabled/enabled)
        const clientSelect = document.getElementById('project-client');
        if (clientSelect) clientSelect.disabled = !isEdit;

        saveBtn.style.display = isEdit ? 'block' : 'none';
        
        if (this.editingProjectId) {
            editToggle.style.display = isEdit ? 'none' : 'flex';
            cancelEditBtn.style.display = isEdit ? 'flex' : 'none';
            footerCancelBtn.style.display = isEdit ? 'none' : 'block';
        } else {
            // New project mode - always edit, no view/cancel-edit toggle
            editToggle.style.display = 'none';
            cancelEditBtn.style.display = 'none';
            footerCancelBtn.style.display = 'block';
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
            driveLink: document.getElementById('project-drive').value
        };
        await Store.saveProject(project);
        this.closeModal();
        await this.navigate(this.currentView);
    },

    editClient(id) { 
        this.openClientModal('עריכת לקוח', id);
        this.setClientEditMode(true);
    },

    viewClient(id) { 
        this.openClientModal('פרטי לקוח', id);
    },

    viewProject(id) { 
        this.openProjectModal('פרטי פרויקט', id);
    },

    editProject(id) { 
        this.openProjectModal('עריכת פרויקט', id);
        this.setProjectEditMode(true);
    },

    // Direct Deletion from lists
    directDeleteClient(id) {
        this.editingClientId = id;
        this.confirmAction(
            'מחיקת לקוח',
            'האם את בטוחה שברצונך למחוק את הלקוח?',
            async () => {
                try {
                    await Store.deleteClient(id);
                    await this.navigate(this.currentView);
                } catch (error) {
                    console.error('Delete client error:', error);
                    this.confirmAction('שגיאה', 'לא ניתן למחוק לקוח עם פרויקטים פתוחים.', null, true);
                }
            }
        );
    },

    directDeleteProject(id) {
        this.editingProjectId = id;
        this.confirmAction(
            'מחיקת פרויקט',
            'האם את בטוחה שברצונך למחוק את הפרויקט?',
            async () => {
                try {
                    await Store.deleteProject(id);
                    await this.navigate(this.currentView);
                } catch (error) {
                    console.error('Delete project error:', error);
                    this.confirmAction('שגיאה', 'חלה שגיאה במחיקת הפרויקט.', null, true);
                }
            }
        );
    },

    async addNote(event, type) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const inputId = type === 'client' ? 'new-client-note' : 'new-project-note';
        const input = document.getElementById(inputId);
        const content = input.value.trim();
        
        if (!content) return;

        try {
            if (type === 'client') {
                if (!this.editingClientId) {
                    this.confirmAction('שימי לב', 'שמרי קודם את הלקוח לפני הוספת הערה.', null, true);
                    return;
                }
                await Store.addNote(content, this.editingClientId, null);
                UI.renderNotes(this.editingClientId, null);
            } else {
                if (!this.editingProjectId) {
                    this.confirmAction('שימי לב', 'שמרי קודם את הפרויקט לפני הוספת הערה.', null, true);
                    return;
                }
                await Store.addNote(content, null, this.editingProjectId);
                UI.renderNotes(null, this.editingProjectId);
            }
            input.value = '';
        } catch (error) {
            console.error('Add note error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בהוספת ההערה.', null, true);
        }
    },

    async deleteNote(event, id, type) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        this.confirmAction('מחיקת הערה', 'בטוחה שברצונך למחוק את ההערה?', async () => {
            try {
                await Store.deleteNote(id);
                if (type === 'client') UI.renderNotes(this.editingClientId, null);
                else UI.renderNotes(null, this.editingProjectId);
            } catch (error) {
                console.error('Delete note error:', error);
                this.confirmAction('שגיאה', 'חלה שגיאה במחיקת ההערה.', null, true);
            }
        });
    },

    editNote(event, id, type) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const contentEl = document.getElementById(`note-content-${id}`);
        const currentContent = contentEl.innerText;
        
        contentEl.innerHTML = `
            <div style="display:flex; gap:8px; margin-top:8px;">
                <input type="text" id="edit-note-input-${id}" value="${currentContent}" style="flex:1; padding:6px; font-size:0.9rem;">
                <button class="btn btn-primary btn-sm" onclick="app.saveNoteEdit('${id}', '${type}')">שירה</button>
                <button class="btn btn-secondary btn-sm" onclick="app.cancelNoteEdit('${id}', '${currentContent}')">ביטול</button>
            </div>
        `;
        document.getElementById(`edit-note-input-${id}`).focus();
    },

    cancelNoteEdit(id, originalContent) {
        document.getElementById(`note-content-${id}`).innerText = originalContent;
    },

    async saveNoteEdit(id, type) {
        const newContent = document.getElementById(`edit-note-input-${id}`).value.trim();
        if (!newContent) return;

        try {
            await Store.updateNote(id, newContent);
            if (type === 'client') UI.renderNotes(this.editingClientId, null);
            else UI.renderNotes(null, this.editingProjectId);
        } catch (error) {
            console.error('Update note error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בעדכון ההערה.', null, true);
        }
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

    // Package Modal
    openPackageModal(title, packageId = null) {
        this.editingPackageId = packageId;
        document.getElementById('package-modal-title').innerText = title;
        document.getElementById('package-modal').classList.remove('hidden');
        const deleteBtn = document.getElementById('delete-package-btn');
        
        if (packageId) {
            deleteBtn.style.display = 'block';
            Store.getPackages().then(packages => {
                const pkg = packages.find(p => p.id === packageId);
                if (pkg) {
                    document.getElementById('package-name').value = pkg.name;
                    document.getElementById('package-price').value = pkg.price;
                }
            });
        } else {
            document.getElementById('package-form').reset();
            deleteBtn.style.display = 'none';
        }
    },

    async handlePackageSubmit() {
        const pkg = {
            id: this.editingPackageId,
            name: document.getElementById('package-name').value,
            price: parseFloat(document.getElementById('package-price').value)
        };
        await Store.savePackage(pkg);
        this.closeModal();
        await this.navigate('settings');
    },

    async deletePackage(id) {
        this.confirmAction('מחיקת חבילה', 'בטוחה שברצונך למחוק את החבילה?', async () => {
            await Store.deletePackage(id);
            await this.navigate('settings');
        });
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
