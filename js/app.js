const app = {
    currentView: 'dashboard',
    editingClientId: null,
    editingProjectId: null,
    editingPackageId: null,
    editingTaskId: null,
    currentCalendarDate: new Date(),

    async init() {
        await Store.init();
        this.addEventListeners();
        
        // Cleanup tasks linked to deleted projects
        await Store.cleanupOrphanTasks().catch(e => console.error('Cleanup orphan tasks failed:', e));
        
        // Auto-archive projects that were delivered/published more than a week ago
        await Store.autoArchiveProjects().catch(e => console.error('Auto-archived failed:', e));
        
        await this.navigate('dashboard');
    },

    addEventListeners() {
        // Navigation (Desktop & Mobile)
        const navElements = document.querySelectorAll('.nav-links li, .mobile-nav-item');
        navElements.forEach(item => {
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
        document.getElementById('location-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLocationSubmit();
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

        document.getElementById('project-status').addEventListener('change', (e) => {
            this.toggleNotClosedReason(e.target.value);
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

        // Auto-save styling call changes
        document.getElementById('project-styling-call').addEventListener('change', async (e) => {
            if (this.editingProjectId) {
                await this.updateStylingCall(this.editingProjectId, e.target.value);
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

        // Auto-update payment status when deposit is entered
        document.getElementById('proj-deposit-paid').addEventListener('input', (e) => {
            const deposit = parseFloat(e.target.value) || 0;
            const statusSelect = document.getElementById('project-payment-status');
            const totalPrice = parseFloat(document.getElementById('proj-total-price').value) || 0;
            
            if (deposit > 0 && deposit < totalPrice) {
                statusSelect.value = 'deposit';
                // Trigger manual change if necessary for other logic
                statusSelect.dispatchEvent(new Event('change'));
            } else if (deposit >= totalPrice && totalPrice > 0) {
                statusSelect.value = 'paid_full';
                statusSelect.dispatchEvent(new Event('change'));
            }
        });

        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleTaskSubmit();
        });

        document.getElementById('delete-task-btn').addEventListener('click', () => {
            this.confirmAction('מחיקת משימה', 'בטוחה שברצונך למחוק משימה זו?', async () => {
                await Store.deleteChecklistItem(this.editingTaskId);
                this.closeModal();
                if (this.currentView === 'tasks') await UI.renderTasks();
            });
        });

        document.getElementById('confirm-no-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
        });

        document.getElementById('delete-location-btn').addEventListener('click', () => {
            if (this.editingLocationId) {
                this.deleteLocation(this.editingLocationId);
            }
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
        noBtn.innerText = isAlert ? 'הבנתי' : 'סגירה';

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
        
        // Update Desktop Nav
        document.querySelectorAll('.nav-links li').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === view);
        });

        // Update Mobile Nav
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === view);
        });

        switch(view) {
            case 'dashboard': await UI.renderDashboard(); break;
            case 'clients': await UI.renderClients(); break;
            case 'projects': await UI.renderProjects(); break;
            case 'archive': await UI.renderArchive(); break;
            case 'tasks': await UI.renderTasks(); break;
            case 'calendar': await UI.renderCalendar(); break;
            case 'shoots': await UI.renderShoots(); break;
            case 'payments': await UI.renderPayments(); break;
            case 'locations': await UI.renderLocations(); break;
            case 'settings': await UI.renderSettings(); break;
        }
    },

    async filterLocations(region) {
        await UI.renderLocations(region);
    },

    // Location Modal
    async openLocationModal(locationId = null) {
        this.editingLocationId = locationId;
        const modal = document.getElementById('location-modal');
        const deleteBtn = document.getElementById('delete-location-btn');
        
        if (locationId) {
            document.getElementById('location-modal-title').innerText = 'עריכת לוקיישן';
            deleteBtn.style.display = 'block';
            
            const locations = await Store.getLocations();
            const loc = locations.find(l => l.id == locationId);
            if (loc) {
                document.getElementById('location-title').value = loc.title;
                document.getElementById('location-region').value = loc.region;
                document.getElementById('location-type').value = loc.type;
                document.getElementById('location-description').value = loc.description;
            }
        } else {
            document.getElementById('location-modal-title').innerText = 'לוקיישן חדש';
            document.getElementById('location-form').reset();
            deleteBtn.style.display = 'none';
        }
        
        modal.classList.remove('hidden');
    },

    async handleLocationSubmit() {
        const location = {
            id: this.editingLocationId,
            title: document.getElementById('location-title').value,
            region: document.getElementById('location-region').value,
            type: document.getElementById('location-type').value,
            description: document.getElementById('location-description').value
        };
        
        try {
            await Store.saveLocation(location);
            this.closeModal();
            await UI.renderLocations();
        } catch (error) {
            console.error('Save location error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בשמירת הלוקיישן. אנא נסי שוב.', null, true);
        }
    },

    async deleteLocation(id) {
        this.confirmAction(
            'מחיקת לוקיישן',
            'האם את בטוחה שברצונך למחוק את הלוקיישן?',
            async () => {
                try {
                    await Store.deleteLocation(id);
                    this.closeModal();
                    await UI.renderLocations();
                } catch (error) {
                    console.error('Delete location error:', error);
                    this.confirmAction('שגיאה', error.message || 'חלה שגיאה במחיקת הלוקיישן.', null, true);
                }
            }
        );
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

                    document.getElementById('client-city').value = c.city || '';
                    document.getElementById('client-email').value = c.email || '';
                    document.getElementById('client-instagram').value = c.instagram || '';
                    document.getElementById('client-facebook').value = c.facebook || '';
                    document.getElementById('client-website').value = c.website || '';

                    // Populate view spans
                    document.getElementById('client-name-view').innerText = c.name;
                    document.getElementById('client-phone-view').innerText = c.phone;
                    document.getElementById('client-source-view').innerText = UI.getSourceLabel(c.source);
                    UI.renderClientProjects(clientId);
                    document.getElementById('client-city-view').innerText = c.city || 'לא צוין';
                    document.getElementById('client-email-view').innerText = c.email || '---';
                    document.getElementById('client-instagram-view').innerText = c.instagram || '---';
                    document.getElementById('client-facebook-view').innerText = c.facebook || '---';
                    document.getElementById('client-website-view').innerText = c.website || '---';
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
            footerCancelBtn.style.display = 'none';
        }
    },

    // Project Modal
    async openProjectModal(title, projectId = null, selectedClientId = null) {
        // If opening an existing project, fetch it first to verify it exists
        let p = null;
        if (projectId) {
            const projects = await Store.getProjects();
            p = projects.find(proj => String(proj.id) === String(projectId));
            if (!p) {
                console.warn('Project not found with ID:', projectId);
                alert('הפרויקט לא נמצא. ייתכן שנמחק.');
                return;
            }
        }
        
        this.editingProjectId = projectId;
        document.getElementById('project-modal-title').innerText = title;
        document.getElementById('project-modal').classList.remove('hidden');
        const deleteBtn = document.getElementById('delete-project-btn');
        const editToggle = document.getElementById('edit-project-toggle');
        const driveLink = document.getElementById('project-drive-link');
        
        let projectClientId = selectedClientId || (p ? p.client_id : null);
        
        await UI.populateClientsDropdown(projectClientId);
        await UI.populatePackagesDatalist();

        if (projectId && p) {
            editToggle.style.display = 'flex';
            this.editingProjectPaymentStatus = p.payment_status || 'not_paid';
            document.getElementById('project-client').value = p.client_id;
            document.getElementById('project-name').value = p.name;
            document.getElementById('project-date').value = p.shoot_date || '';
            document.getElementById('project-time').value = p.shoot_time || '';
            document.getElementById('project-location').value = p.location || '';
            document.getElementById('project-subjects-count').value = p.subjects_count || '';
            document.getElementById('project-subjects-details').value = p.subjects_details || '';
            document.getElementById('project-styling-call').value = p.styling_call || 'none';
            document.getElementById('project-status').value = p.status || 'new';
            document.getElementById('project-payment-status').value = p.payment_status || 'not_paid';
            document.getElementById('not-closed-reason').value = p.not_closed_reason || '';
            this.toggleNotClosedReason(p.status || 'new');
            
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
            document.getElementById('project-time-view').innerText = p.shoot_time || '--:--';
            document.getElementById('project-location-view').innerText = p.location || 'לא הוגדר מיקום';
            document.getElementById('project-subjects-count-view').innerText = p.subjects_count || '0';
            document.getElementById('project-subjects-details-view').innerText = p.subjects_details || 'ללא פירוט';
            
            document.getElementById('proj-total-price-view').innerText = (p.payments?.total || 0) + ' ₪';
            document.getElementById('proj-deposit-paid-view').innerText = (p.payments?.deposit || 0) + ' ₪';
            document.getElementById('project-drive-view').innerText = p.drive_link || 'אין קישור';
            document.getElementById('not-closed-reason-view').innerText = p.not_closed_reason || 'לא צוינה סיבה';

            if (p.location && p.shoot_date) {
                this.fetchWeatherForProject();
            } else {
                document.getElementById('project-weather-container').classList.add('hidden');
            }
            
            this.setProjectEditMode(false);
            UI.renderNotes(null, projectId);
            UI.renderChecklist(projectId);
            deleteBtn.style.display = 'block';
        } else {
            editToggle.style.display = 'none';
            driveLink.style.display = 'none';
            document.getElementById('project-form').reset();
            document.getElementById('project-notes-list').innerHTML = '';
            document.getElementById('project-status').value = 'new';
            document.getElementById('project-payment-status').value = 'not_paid';
            this.toggleNotClosedReason('new');
            this.setProjectEditMode(true);
            UI.renderChecklist(null);
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
        
        const status = document.getElementById('project-status').value;
        this.toggleNotClosedReason(status);

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
            footerCancelBtn.style.display = 'none'; // Only the main save button should be visible
        }
    },

    toggleNotClosedReason(status) {
        const container = document.getElementById('not-closed-reason-container');
        if (container) {
            if (status === 'not_closed') {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    },


    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        this.editingClientId = null;
        this.editingProjectId = null;
        this.editingProjectPaymentStatus = null;
        this.editingPackageId = null;
        this.editingTaskId = null;
        this.editingLocationId = null;
    },

    async handleClientSubmit() {
        const client = {
            id: this.editingClientId,
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            source: document.getElementById('client-source').value,
            city: document.getElementById('client-city').value,
            email: document.getElementById('client-email').value,
            instagram: document.getElementById('client-instagram').value,
            facebook: document.getElementById('client-facebook').value,
            website: document.getElementById('client-website').value
        };
        await Store.saveClient(client);
        this.closeModal();
        await this.navigate(this.currentView);
    },

    async handleProjectSubmit() {
        const isNew = !this.editingProjectId;
        
        const deposit = parseFloat(document.getElementById('proj-deposit-paid').value) || 0;
        const total = parseFloat(document.getElementById('proj-total-price').value) || 0;
        
        const project = {
            id: this.editingProjectId,
            clientId: document.getElementById('project-client').value,
            name: document.getElementById('project-name').value,
            shootDate: document.getElementById('project-date').value,
            shootTime: document.getElementById('project-time').value,
            status: document.getElementById('project-status').value,
            notClosedReason: document.getElementById('not-closed-reason').value,
            subjectsCount: document.getElementById('project-subjects-count').value,
            subjectsDetails: document.getElementById('project-subjects-details').value,
            stylingCall: document.getElementById('project-styling-call').value,
            paymentStatus: document.getElementById('project-payment-status').value, // Use explicit value from select
            payments: {
                total: total,
                deposit: deposit
            },
            driveLink: document.getElementById('project-drive').value,
            location: document.getElementById('project-location').value
        };
        const savedProject = await Store.saveProject(project);
        
        this.closeModal();
        await this.navigate(this.currentView);
    },

    async importDefaults(category) {
        if (!this.editingProjectId) {
            this.confirmAction('שימי לב', 'יש לשמור את הפרויקט בפעם הראשונה לפני שניתן לייבא רשימות נוספות.', null, true);
            return;
        }
        
        try {
            const projects = await Store.getProjects();
            const project = projects.find(p => String(p.id) === String(this.editingProjectId));
            
            const imported = await Store.importCategoryDefaults(this.editingProjectId, category, project?.shoot_date, project);
            
            if (imported && imported.length > 0) {
                await UI.renderChecklist(this.editingProjectId);
            } else {
                this.confirmAction('מידע', 'כל פריטי ברירת המחדל כבר קיימים ברשימה.', null, true);
            }
        } catch (error) {
            console.error('Import defaults error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בייבוא הרשימה.', null, true);
        }
    },


    // Checklist Defaults Actions
    addChecklistDefault(category) {
        const inputId = `new-default-${category}`;
        const input = document.getElementById(inputId);
        const content = input.value.trim();
        if (!content) return;

        const defaults = Store.getChecklistDefaults();
        defaults[category].push(content);
        Store.saveChecklistDefaults(defaults);
        UI.renderSettings();
    },

    deleteChecklistDefault(category, index) {
        const defaults = Store.getChecklistDefaults();
        defaults[category].splice(index, 1);
        Store.saveChecklistDefaults(defaults);
        UI.renderSettings();
    },

    editClient(id) { 
        this.openClientModal('עריכת לקוח', id);
        this.setClientEditMode(true);
    },

    viewClient(id) { 
        this.openClientModal('פרטי לקוח', id);
    },

    async viewProject(id) {
        // First check if project exists
        const projects = await Store.getProjects();
        const projectExists = projects.some(p => String(p.id) === String(id));
        
        if (!projectExists) {
            // Project doesn't exist - maybe it was deleted
            // Check if there's a task that references this project and show it instead
            const tasks = await Store.getAllTasks();
            const orphanTask = tasks.find(t => String(t.project_id) === String(id));
            
            if (orphanTask) {
                // Show the task details instead
                alert('הפרויקט שהמשימה מקושרת אליו נמחק. מציג את פרטי המשימה.');
                this.openTaskModal(orphanTask);
                return;
            } else {
                alert('הפרויקט לא נמצא. ייתכן שנמחק.');
                return;
            }
        }
        
        this.openProjectModal('פרטי פרויקט', id);
    },

    async viewTask(id) {
        const task = await Store.getTaskById(id);
        if (task) {
            this.openTaskModal(task);
        }
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
                <button class="btn btn-secondary btn-sm" onclick="app.cancelNoteEdit('${id}', '${currentContent}')">סגירה</button>
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

    async updateStylingCall(id, value) {
        try {
            await Store.updateProjectStylingCall(id, value);
            
            // Sync modal if open
            if (this.editingProjectId === id) {
                document.getElementById('project-styling-call').value = value;
                UI.renderChecklist(id);
            }

            if (this.currentView === 'calendar') {
                await UI.renderCalendar();
            } else {
                UI.renderCalendar().catch(() => {});
            }
        } catch (error) {
            console.error('Update styling call error:', error);
        }
    },

    async updateStatus(id, newStatus) {
        try {
            await Store.updateProjectStatus(id, newStatus);
            
            // Sync modal if open for this project
            if (this.editingProjectId === id) {
                const statusSelect = document.getElementById('project-status');
                if (statusSelect) statusSelect.value = newStatus;
                this.toggleNotClosedReason(newStatus);
            }

            if (this.currentView === 'projects') await UI.renderProjects();
            if (this.currentView === 'calendar') await UI.renderCalendar();
            else await this.navigate(this.currentView);
        } catch (error) {
            console.error('Update status error:', error);
        }
    },

    async updatePaymentStatus(id, newStatus) {
        try {
            await Store.updateProjectPaymentStatus(id, newStatus);

            // Sync modal if open for this project
            if (this.editingProjectId === id) {
                const paymentSelect = document.getElementById('project-payment-status');
                if (paymentSelect) paymentSelect.value = newStatus;
            }

            if (this.currentView === 'projects') await UI.renderProjects();
            if (this.currentView === 'payments') await UI.renderPayments();
            else await this.navigate(this.currentView);
        } catch (error) {
            console.error('Update payment status error:', error);
        }
    },

    handleCardDragStart(event, projectId) {
        event.dataTransfer.setData('projectId', projectId);
        setTimeout(() => {
            const card = event.target.closest('.kanban-card');
            if (card) card.classList.add('dragging');
        }, 0);
    },

    async handleCardDrop(event, newStatus) {
        event.preventDefault();
        const projectId = event.dataTransfer.getData('projectId');
        
        // Remove dragging class from all cards
        document.querySelectorAll('.kanban-card.dragging').forEach(c => c.classList.remove('dragging'));
        
        if (projectId) {
            await this.updateStatus(projectId, newStatus);
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
    },

    // Checklist Actions
    async addChecklistItem(category, projectId) {
        const inputId = `new-${category}-item`;
        const input = document.getElementById(inputId);
        const content = input.value.trim();
        
        if (!content) return;

        try {
            await Store.saveChecklistItem({
                projectId,
                content,
                category,
                isCompleted: false
            });
            input.value = '';
            UI.renderChecklist(projectId);
        } catch (error) {
            console.error('Add checklist item error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בהוספת הפריט.', null, true);
        }
    },

    async toggleChecklistItem(id, isCompleted, projectId) {
        try {
            await Store.toggleChecklistItem(id, isCompleted);
            UI.renderChecklist(projectId);
        } catch (error) {
            console.error('Toggle checklist item error:', error);
        }
    },

    async deleteChecklistItem(id, projectId) {
        try {
            await Store.deleteChecklistItem(id);
            if (projectId) UI.renderChecklist(projectId);
        } catch (error) {
            console.error('Delete checklist item error:', error);
        }
    },

    async addGlobalTask() {
        const input = document.getElementById('new-global-task-input');
        const content = input.value?.trim();
        if (!content) return;

        try {
            await Store.saveChecklistItem({
                projectId: null,
                content,
                category: 'task',
                isCompleted: false
            });
            input.value = '';
            UI.renderTasks();
        } catch (error) {
            console.error('Add global task error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בהוספת המשימה.', null, true);
        }
    },

    openTaskModal(task) {
        this.editingTaskId = task.id;
        document.getElementById('task-content').value = task.content;
        document.getElementById('task-due-date').value = task.due_date ? task.due_date.split('T')[0] : '';
        document.getElementById('task-completed-checkbox').checked = task.is_completed;
        document.getElementById('task-notes').value = task.notes || '';
        
        const projectInfo = document.getElementById('task-project-info');
        if (task.projects) {
            projectInfo.innerText = `משויך לפרויקט: ${task.projects.name}`;
            projectInfo.style.display = 'block';
        } else {
            projectInfo.style.display = 'none';
        }

        document.getElementById('task-modal').classList.remove('hidden');
    },

    async handleTaskSubmit() {
        const task = await Store.getTaskById(this.editingTaskId);
        const updatedTask = {
            ...task,
            content: document.getElementById('task-content').value,
            dueDate: document.getElementById('task-due-date').value,
            isCompleted: document.getElementById('task-completed-checkbox').checked,
            notes: document.getElementById('task-notes').value
        };

        try {
            await Store.saveChecklistItem(updatedTask);
            this.closeModal();
            if (this.currentView === 'tasks') await UI.renderTasks();
            if (task.project_id) UI.renderChecklist(task.project_id);
        } catch (error) {
            console.error('Save task error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בשמירת המשימה.', null, true);
        }
    },

    updateChecklistDisplayMode(mode) {
        Store.setChecklistDisplayMode(mode);
        UI.renderSettings();
    },

    async handleCalendarDrop(event, newDate) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('taskId');
        const projectId = event.dataTransfer.getData('projectId');
        
        if (!taskId && !projectId) return;

        try {
            if (taskId) {
                const task = await Store.getTaskById(taskId);
                if (!task) return;
                const updatedTask = {
                    ...task,
                    dueDate: newDate,
                    isCompleted: task.is_completed,
                    projectId: task.project_id
                };
                await Store.saveChecklistItem(updatedTask);
            } else if (projectId) {
                const projects = await Store.getProjects();
                const project = projects.find(p => p.id === projectId);
                if (!project) return;
                
                const updatedProject = {
                    ...project,
                    shootDate: newDate,
                    // Map back to camelCase for the saveProject function which uses properties like clientId
                    clientId: project.client_id,
                    driveLink: project.drive_link,
                    payments: project.payments
                };
                await Store.saveProject(updatedProject);
                
                // Also update any reminder tasks associated with this project that depend on the shoot date
                const tasks = await Store.getChecklistItems(projectId);
                for (const t of tasks) {
                    if (t.content.includes('תזכורת')) {
                        const date = new Date(newDate);
                        date.setDate(date.getDate() - 1);
                        const newDueDate = date.toISOString().split('T')[0];
                        await Store.saveChecklistItem({
                            ...t,
                            dueDate: newDueDate,
                            isCompleted: t.is_completed,
                            projectId: t.project_id
                        });
                    }
                }
            }
            UI.renderCalendar();
        } catch (error) {
            console.error('Calendar drag drop error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בעדכון התאריך.', null, true);
        }
    },

    async showDayDetails(dateStr) {
        // On desktop, clicking a day in the calendar doesn't need a popup
        if (window.innerWidth > 768) return;

        const projects = await Store.getProjects();
        const tasks = await Store.getAllTasks();
        const [year, month] = dateStr.split('-').map(Number);
        const holidays = await Store.getJewishHolidays(year, month);

        const dayProjects = projects.filter(p => p.shoot_date === dateStr && p.status !== 'archived');
        
        // De-duplicate tasks for this day
        const allDayTasks = tasks.filter(t => t.due_date === dateStr);
        const seenTaskContent = new Set();
        const dayTasks = allDayTasks.filter(t => {
            const key = String(t.content || '').trim();
            if (seenTaskContent.has(key)) return false;
            seenTaskContent.add(key);
            return true;
        });
        
        const dayHolidays = holidays[dateStr] || [];

        const dateObj = new Date(dateStr);
        const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        const formattedDate = `יום ${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ב${monthNames[dateObj.getMonth()]}`;

        let contentHtml = '';

        // Holidays
        const holidayItems = dayHolidays.filter(h => h.category === 'holiday');
        if (holidayItems.length > 0) {
            contentHtml += `<div style="margin-bottom:12px;">
                ${holidayItems.map(h => `<div style="background:#FEF3C7; color:#B45309; padding:6px 10px; border-radius:6px; font-size:0.85rem; font-weight:600;">${h.hebrew}</div>`).join('')}
            </div>`;
        }

        // Shabbat Times
        const shabbatTimes = dayHolidays.filter(h => h.category === 'candles' || h.category === 'havdalah');
        if (shabbatTimes.length > 0) {
            contentHtml += `<div style="margin-bottom:12px; background:var(--bg-main); padding:10px; border-radius:8px;">
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">זמני שבת</div>
                ${shabbatTimes.map(h => {
                    const time = new Date(h.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                    const label = h.category === 'candles' ? '🕯️ הדלקת נרות:' : '✨ צאת שבת:';
                    return `<div style="font-size:0.9rem; color:var(--text-muted);">${label} <strong>${time}</strong></div>`;
                }).join('')}
            </div>`;
        }

        // Projects
        if (dayProjects.length > 0) {
            contentHtml += `<div style="margin-bottom:12px;">
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">📷 צילומים</div>
                ${dayProjects.map(p => {
                    const clientName = p.clients?.name || '';
                    const displayName = clientName ? `${p.name} (${clientName})` : p.name;
                    return `<div onclick="document.getElementById('day-details-popup')?.remove(); app.viewProject('${p.id}')" style="background:#E0F2FE; color:#0369A1; padding:8px 12px; border-radius:6px; margin-bottom:4px; cursor:pointer; font-size:0.85rem;">${displayName}</div>`;
                }).join('')}
            </div>`;
        }

        // Tasks
        if (dayTasks.length > 0) {
            contentHtml += `<div>
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:6px; color:var(--text-main);">✅ משימות</div>
                ${dayTasks.map(t => {
                    const isStyling = t.category === 'styling' || t.content.includes('שיחת סטיילינג');
                    const bg = isStyling ? '#ECFDF5' : '#F3E8FF';
                    const color = isStyling ? '#059669' : '#7E22CE';
                    const clickAction = t.project_id ? `app.viewProject('${t.project_id}')` : `app.viewTask('${t.id}')`;
                    return `<div onclick="document.getElementById('day-details-popup')?.remove(); ${clickAction}" style="background:${bg}; color:${color}; padding:8px 12px; border-radius:6px; margin-bottom:4px; cursor:pointer; font-size:0.85rem; ${t.is_completed ? 'opacity:0.6; text-decoration:line-through;' : ''}">${t.content}</div>`;
                }).join('')}
            </div>`;
        }

        if (!contentHtml) {
            contentHtml = '<div style="text-align:center; color:var(--text-muted); padding:20px;">אין אירועים ביום זה.</div>';
        }

        // Create a simple popup
        let popup = document.getElementById('day-details-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'day-details-popup';
            popup.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; align-items:flex-end; justify-content:center;';
            popup.innerHTML = `
                <div id="day-details-content" style="background:white; width:100%; max-height:70vh; border-radius:20px 20px 0 0; padding:20px; overflow-y:auto; animation: slideUp 0.3s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 id="day-details-title" style="margin:0; font-size:1.1rem;"></h3>
                        <button onclick="document.getElementById('day-details-popup').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                    </div>
                    <div id="day-details-body"></div>
                </div>
            `;
            popup.onclick = (e) => { if (e.target === popup) popup.remove(); };
            document.body.appendChild(popup);

            // Add animation style if not exists
            if (!document.getElementById('day-popup-style')) {
                const style = document.createElement('style');
                style.id = 'day-popup-style';
                style.textContent = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }';
                document.head.appendChild(style);
            }
        }

        document.getElementById('day-details-title').innerText = formattedDate;
        document.getElementById('day-details-body').innerHTML = contentHtml;
    },

    async handlePaymentDrop(event, newPaymentStatus) {
        event.preventDefault();
        const projectId = event.dataTransfer.getData('projectId');
        const dragType = event.dataTransfer.getData('dragType');
        
        // Only handle payment drops here
        if (dragType !== 'payment' || !projectId) return;

        try {
            const projects = await Store.getProjects();
            const project = projects.find(p => p.id === projectId);
            if (!project) return;
            
            const updatedProject = {
                ...project,
                paymentStatus: newPaymentStatus,
                clientId: project.client_id,
                shootDate: project.shoot_date,
                driveLink: project.drive_link,
                payments: project.payments
            };
            
            await Store.saveProject(updatedProject);
            UI.renderPayments();
        } catch (error) {
            console.error('Payment status update error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בעדכון סטטוס התשלום.', null, true);
        }
    },

    changeMonth(delta) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
        UI.renderCalendar();
    },

    async loadProjectDefaults(projectId) {
        const projects = await Store.getProjects();
        const project = projects.find(p => p.id === projectId);
        await Store.addDefaultsToProject(projectId, project?.shoot_date);
        UI.renderChecklist(projectId);
    },

    async fetchWeatherForProject() {
        const location = document.getElementById('project-location').value;
        const dateStr = document.getElementById('project-date').value;
        const container = document.getElementById('project-weather-container');

        if (!location || !dateStr) {
            container.classList.add('hidden');
            return;
        }

        try {
            container.classList.remove('hidden');
            container.innerHTML = '<div style="font-size:0.9rem; color:var(--text-muted);">טוען מזג אוויר...</div>';
            
            // 1. Geocode
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=he&format=json`);
            const geoData = await geoRes.json();
            
            if (!geoData.results || geoData.results.length === 0) {
                container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">לא נמצא מיקום מדויק לתחזית</div>';
                return;
            }

            const { latitude, longitude, name: geoName } = geoData.results[0];
            const shootDate = new Date(dateStr);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const diffDays = Math.ceil((shootDate - today) / (1000 * 60 * 60 * 24));
            
            let weatherData;
            if (diffDays >= 0 && diffDays <= 14) {
                // Forecast API
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`);
                weatherData = await weatherRes.json();
            } else if (diffDays < 0) {
                // Archive API for past dates
                const weatherRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
                weatherData = await weatherRes.json();
            } else {
                container.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; width:100%;">התאריך רחוק מדי לתחזית מדויקת (זמין עד 14 יום קדימה).</div>`;
                return;
            }

            if (weatherData && weatherData.daily) {
                UI.renderWeather(weatherData.daily, geoName);
            } else {
                throw new Error('No weather data');
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted);">תקלה בטעינת מזג האוויר</div>';
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
