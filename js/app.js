const app = {
    currentView: 'dashboard',
    editingClientId: null,
    editingProjectId: null,
    editingPackageId: null,
    editingTaskId: null,
    currentCalendarDate: new Date(),
    dashboardWeekOffset: 0, 
    isStatsExpanded: false,
    _pendingChecklistItems: [],

    initialized: false,

    async init() {
        if (!Auth.session || this.initialized) return;
        this.initialized = true;
        await Store.init();
        this.applyGender();
        this.addEventListeners();
        
        // Initialize Flatpickr for date inputs
        if (window.flatpickr) {
            flatpickr("input[type='date']", {
                locale: "he",
                altInput: true,
                altFormat: "d/m/Y",
                dateFormat: "Y-m-d",
                disableMobile: true, // Ensures modern UI on mobile instead of native
                onReady: function(selectedDates, dateStr, instance) {
                    const yearInput = instance.currentYearElement;
                    const yearWrapper = yearInput.parentNode;
                    yearWrapper.style.display = 'none'; // Hide the entire wrapper with arrows

                    const yearSelect = document.createElement('select');
                    yearSelect.className = 'flatpickr-monthDropdown-months flatpickr-year-select'; 
                    
                    const currentYear = new Date().getFullYear();
                    const selectedYear = instance.currentYear;
                    
                    const minYear = Math.min(currentYear - 2, selectedYear);
                    const maxYear = Math.max(currentYear + 3, selectedYear);
                    
                    for (let i = minYear; i <= maxYear; i++) {
                        const option = document.createElement('option');
                        option.value = i;
                        option.text = i;
                        if (i === selectedYear) option.selected = true;
                        yearSelect.appendChild(option);
                    }
                    
                    yearSelect.addEventListener('change', function(e) {
                        yearInput.value = e.target.value;
                        instance.changeYear(e.target.value);
                    });
                    
                    instance.yearSelectElement = yearSelect;
                    yearWrapper.parentNode.insertBefore(yearSelect, yearWrapper.nextSibling);
                },
                onYearChange: function(selectedDates, dateStr, instance) {
                    if (instance.yearSelectElement) {
                        instance.yearSelectElement.value = instance.currentYear;
                    }
                }
            });
        }
        
        // Cleanup tasks linked to deleted projects
        await Store.cleanupOrphanTasks().catch(e => console.error('Cleanup orphan tasks failed:', e));
        
        // Auto-archive projects that were delivered/published more than a week ago
        await Store.autoArchiveProjects().catch(e => console.error('Auto-archived failed:', e));
        
        // Check if the 14-day trial for Pro has expired
        await this.checkTrialStatus().catch(e => console.error('Trial check failed:', e));
        
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
        const quickAddTaskBtn = document.getElementById('quick-add-task-btn');
        if (quickAddTaskBtn) {
            quickAddTaskBtn.addEventListener('click', () => {
                this.openNewTaskModal();
            });
        }

        // Modal Close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this._isCreatingClientFromProject && btn.closest('#client-modal')) {
                    this.closeSpecificModal('client-modal');
                    this._isCreatingClientFromProject = false;
                } else {
                    const modalOverlay = btn.closest('.modal-overlay');
                    if (modalOverlay) {
                        this.closeSpecificModal(modalOverlay.id);
                    } else {
                        this.closeTopModal();
                    }
                }
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
                'האם בטוח/ה שברצונך למחוק את הלקוח? שים לב שלא ניתן למחוק לקוח שיש לו פרויקטים פתוחים.',
                async () => {
                    try {
                        const clients = await Store.getClients();
                        const c = clients.find(cust => cust.id === this.editingClientId);
                        await Store.deleteClient(this.editingClientId);
                        await Store.logAction('מחיקת לקוח', `הלקוח/ה ${c?.name || 'לא ידוע'} נמחק/ה`, 'client', this.editingClientId);
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
                'האם בטוח/ה שברצונך למחוק את הפרויקט?',
                async () => {
                    try {
                        const projects = await Store.getProjects();
                        const p = projects.find(proj => String(proj.id) === String(this.editingProjectId));
                        await Store.deleteProject(this.editingProjectId);
                        const clientNameText = p?.clients?.name ? ` (${p.clients.name})` : '';
                        await Store.logAction('מחיקת פרויקט', `הפרויקט ${p?.name || 'לא ידוע'}${clientNameText} נמחק`, 'project', this.editingProjectId);
                        this.closeModal();
                        await this.navigate(this.currentView);
                    } catch (error) {
                        console.error('Delete project error:', error);
                        this.confirmAction('שגיאה', 'חלה שגיאה במחיקת הפרויקט. נא לנסות שוב.', null, true);
                    }
                }
            );
        });

        document.getElementById('edit-client-toggle').addEventListener('click', () => {
            this.setClientEditMode(true);
        });

        document.getElementById('cancel-edit-client').addEventListener('click', () => {
            this.setClientEditMode(false);
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
            const totalPrice = parseFloat(document.getElementById('proj-total-price').value) || 0;
            
            if (deposit > 0 && deposit < totalPrice) {
                this.setProjectPaymentStatus('deposit');
            } else if (deposit >= totalPrice && totalPrice > 0) {
                this.setProjectPaymentStatus('paid_full');
            }
        });

        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleTaskSubmit();
        });

        document.getElementById('delete-task-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const taskId = this.editingTaskId;
            const projectId = this.editingProjectId;
            if (!taskId) return;
            
            this.confirmAction('מחיקת משימה', 'האם בטוח/ה שברצונך למחוק משימה זו?', async () => {
                await Store.deleteChecklistItem(taskId);
                this.closeModal();
                if (this.currentView === 'tasks') {
                    await UI.renderTasks();
                } else if (projectId) {
                    await UI.renderChecklist(projectId);
                }
                await this.navigate(this.currentView);
            });
        });

        // Show admin menu item if user is admin
        if (window.Admin && window.Admin.isAdmin()) {
            const adminNav = document.getElementById('nav-admin');
            if (adminNav) adminNav.classList.remove('hidden');
        }

        document.getElementById('confirm-no-btn').addEventListener('click', () => {
            document.getElementById('confirm-modal').classList.add('hidden');
        });

        document.getElementById('delete-location-btn').addEventListener('click', () => {
            if (this.editingLocationId) {
                this.deleteLocation(this.editingLocationId);
            }
        });

        // Global Keyboard Event Listeners
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Also close confirm modal if open
                const confirmModal = document.getElementById('confirm-modal');
                if (confirmModal && !confirmModal.classList.contains('hidden')) {
                    confirmModal.classList.add('hidden');
                } else {
                    this.closeTopModal();
                }
            }
        });

        // Click on overlay to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (overlay.id === 'confirm-modal') {
                        overlay.classList.add('hidden');
                    } else if (this._isCreatingClientFromProject && overlay.closest('#client-modal')) {
                        this.closeSpecificModal('client-modal');
                        this._isCreatingClientFromProject = false;
                    } else {
                        this.closeSpecificModal(overlay.id);
                    }
                }
            });
        });

        // Mobile nav scroll hint: hide arrow after user scrolls
        const navScroll = document.querySelector('.mobile-nav-scroll');
        const navHint = document.getElementById('nav-scroll-hint');
        const mobileNav = document.querySelector('.mobile-nav');
        if (navScroll && navHint) {
            let hasScrolled = false;
            navScroll.addEventListener('scroll', () => {
                // Hide the bounce arrow after first scroll
                if (!hasScrolled) {
                    hasScrolled = true;
                    navHint.classList.add('hidden-hint');
                }
                // Toggle gradient fade based on scroll position (RTL: scrollLeft is negative)
                const scrollLeft = navScroll.scrollLeft;
                const maxScroll = navScroll.scrollWidth - navScroll.clientWidth;
                // In RTL scrollLeft goes from 0 to negative (or stays at 0 for no-scroll)
                const atEnd = Math.abs(scrollLeft) >= maxScroll - 5;
                if (mobileNav) {
                    mobileNav.classList.toggle('scrolled-end', atEnd);
                }
            });
        }
    },

    confirmAction(title, desc, onConfirm, isAlert = false) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const descEl = document.getElementById('confirm-desc');
        const inputContainer = document.getElementById('confirm-input-container');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        const gender = Store.getUserGender();
        const isMale = gender === 'male';

        // Gender-aware replacements
        let finalTitle = title.replace('בטוח/ה', isMale ? 'בטוח' : 'בטוחה')
                              .replace('שים לב', isMale ? 'שים לב' : 'שימי לב')
                              .replace('שימי לב', isMale ? 'שים לב' : 'שימי לב');
        let finalDesc = desc.replace('בטוח/ה', isMale ? 'בטוח' : 'בטוחה')
                            .replace('בטוחה', isMale ? 'בטוח' : 'בטוחה')
                            .replace('זמינה', isMale ? 'זמין' : 'זמינה')
                            .replace('הלקוח/ה', isMale ? 'הלקוח' : 'הלקוחה')
                            .replace('נמחק/ה', isMale ? 'נמחק' : 'נמחקה')
                            .replace('שתעבירי', isMale ? 'שתעביר' : 'שתעבירי')
                            .replace('שתעביר', isMale ? 'שתעביר' : 'שתעבירי');

        titleEl.innerHTML = finalTitle;
        descEl.innerHTML = finalDesc;

        // Reset display
        if (inputContainer) inputContainer.classList.add('hidden');
        yesBtn.style.display = isAlert ? 'none' : 'block';
        
        // Dynamic style based on action type
        const isDelete = title.includes('מחיקה') || title.includes('מחק');
        yesBtn.innerText = isDelete ? 'כן, למחוק' : 'כן, בצע';
        yesBtn.style.background = isDelete ? '#EF4444' : '#7C3AED';
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
            this.bringModalToFront(modal);
        }, 10);
    },

    setProjectStatus(status, skipUpdate = false) {
        // Update hidden input
        const statusEl = document.getElementById('project-status');
        if (statusEl) statusEl.value = status;
        
        // Update UI buttons - scoped to status picker
        const picker = document.getElementById('project-status-picker');
        if (picker) {
            const buttons = picker.querySelectorAll('.status-picker-btn');
            buttons.forEach(btn => {
                if (btn.getAttribute('data-status') === status) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Trigger logic
        this.toggleNotClosedReason(status);
        if (!skipUpdate && this.editingProjectId) {
            this.updateStatus(this.editingProjectId, status);
        }
    },

    setProjectStylingCall(value, skipUpdate = false) {
        const el = document.getElementById('project-styling-call');
        if (el) el.value = value;
        
        const picker = document.getElementById('project-styling-call-picker');
        if (picker) {
            const buttons = picker.querySelectorAll('.status-picker-btn');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-value') === value);
            });
        }

        if (!skipUpdate && this.editingProjectId) {
            this.updateStylingCall(this.editingProjectId, value);
        }
    },

    setProjectPaymentStatus(value, skipUpdate = false) {
        const el = document.getElementById('project-payment-status');
        if (el) el.value = value;
        
        const picker = document.getElementById('project-payment-status-picker');
        if (picker) {
            const buttons = picker.querySelectorAll('.status-picker-btn');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-value') === value);
            });
        }

        if (!skipUpdate && this.editingProjectId) {
            this.updatePaymentStatus(this.editingProjectId, value);
        }
    },

    promptAction(title, desc, placeholder, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const descEl = document.getElementById('confirm-desc');
        const inputContainer = document.getElementById('confirm-input-container');
        const input = document.getElementById('confirm-input');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        const gender = Store.getUserGender();
    const isMale = gender === 'male';

    // Gender-aware replacements
    let finalTitle = title.replace('בטוח/ה', isMale ? 'בטוח' : 'בטוחה')
                          .replace('שים לב', isMale ? 'שים לב' : 'שימי לב');
    let finalDesc = desc.replace('בטוח/ה', isMale ? 'בטוח' : 'בטוחה')
                        .replace('שתף/י', isMale ? 'שתף' : 'שתפי')
                        .replace('שתף', isMale ? 'שתף' : 'שתפי')
                        .replace('שתפי', isMale ? 'שתף' : 'שתפי')
                        .replace('שלח/י', isMale ? 'שלח' : 'שלחי')
                        .replace('הזן/י', isMale ? 'הזן' : 'הזיני');

    titleEl.innerHTML = finalTitle;
    descEl.innerHTML = finalDesc;
        
        if (inputContainer) {
            inputContainer.classList.remove('hidden');
            input.value = '';
            input.placeholder = placeholder || 'הזינו כאן...';
        }

        yesBtn.style.display = 'block';
        yesBtn.innerText = 'שמירה';
        yesBtn.style.background = '#7C3AED'; // Project default primary
        noBtn.innerText = 'ביטול';

        const newYesBtn = yesBtn.cloneNode(true);
        const newNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);

        newNoBtn.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
        newYesBtn.addEventListener('click', async () => {
            const val = input.value.trim();
            modal.classList.add('hidden');
            if (onConfirm) await onConfirm(val);
        }, { once: true });

        setTimeout(() => {
            modal.classList.remove('hidden');
            input.focus();
        }, 10);
    },

    async changeDashboardWeek(offset) {
        this.dashboardWeekOffset += offset;
        await UI.renderDashboard();
    },

    async goToTodayDashboard() {
        this.dashboardWeekOffset = 0;
        await UI.renderDashboard();
    },

    async toggleStatExpansion() {
        this.isStatsExpanded = !this.isStatsExpanded;
        await UI.renderDashboard();
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
            case 'reports': await UI.renderReports(); break;
            case 'shoots': await UI.renderShoots(); break;
            case 'payments': await UI.renderPayments(); break;
            case 'locations': await UI.renderLocations(); break;
            case 'logs': await UI.renderLogs(); break;
            case 'settings': await UI.renderSettings(); break;
            case 'admin': if (window.Admin && Admin.isAdmin()) { Admin.renderAdminPage(); } break;
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
        this.bringModalToFront(modal);
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
            const isNew = !this.editingLocationId;
            const savedLoc = await Store.saveLocation(location);
            await Store.logAction(isNew ? 'לוקיישן חדש' : 'עדכון לוקיישן', isNew ? `לוקיישן חדש נוסף: ${location.title}` : `פרטי הלוקיישן ${location.title} עודכנו`, 'location', location.id);
            this.closeModal();
            await UI.renderLocations();
        } catch (error) {
            console.error('Save location error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בשמירת הלוקיישן. נא לנסות שוב.', null, true);
        }
    },

    async deleteLocation(id) {
        this.confirmAction(
            'מחיקת לוקיישן',
            'האם בטוח/ה שברצונך למחוק את הלוקיישן?',
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
        const modal = document.getElementById('client-modal');
        modal.classList.remove('hidden');
        document.querySelector('#client-modal .modal').scrollTop = 0;
        this.bringModalToFront(modal);
        const deleteBtn = document.getElementById('delete-client-btn');
        const editToggle = document.getElementById('edit-client-toggle');
        const addProjectBtn = document.getElementById('client-add-project-btn');
        
        if (clientId) {
            // Toggle document upload visibility based on plan
            Store.getUserProfile().then(profile => {
                const uploadBox = document.getElementById('client-upload-box');
                const upgradeMsg = document.getElementById('client-upload-upgrade-msg');
                const isStarter = profile?.plan === 'starter';
                
                if (uploadBox) uploadBox.style.display = isStarter ? 'none' : 'block';
                if (upgradeMsg) {
                    if (isStarter) upgradeMsg.classList.remove('hidden');
                    else upgradeMsg.classList.add('hidden');
                }
            });

            editToggle.style.display = 'flex';
            deleteBtn.style.display = 'block';
            if (addProjectBtn) addProjectBtn.style.display = 'flex';
            Store.getClients().then(clients => {
                const c = clients.find(cust => cust.id === clientId);
                if (c) {
                    document.getElementById('client-name').value = c.name;
                    document.getElementById('client-organization').value = c.organization || '';
                    document.getElementById('client-phone').value = c.phone;
                    document.getElementById('client-source').value = c.source;

                    document.getElementById('client-city').value = c.city || '';
                    document.getElementById('client-email').value = c.email || '';
                    document.getElementById('client-instagram').value = c.instagram || '';
                    document.getElementById('client-facebook').value = c.facebook || '';
                    document.getElementById('client-website').value = c.website || '';

                    // Populate view spans
                    document.getElementById('client-name-view').innerText = c.name;
                    document.getElementById('client-organization-view').innerText = c.organization || '';
                    document.getElementById('client-phone-view').innerText = c.phone;
                    document.getElementById('client-source-view').innerText = UI.getSourceLabel(c.source);
                    UI.renderClientProjects(clientId);
                UI.renderDocuments(clientId, null);
                    document.getElementById('client-city-view').innerText = c.city || 'לא צוין';
                    document.getElementById('client-email-view').innerText = c.email || '---';

                    const formatLink = (val, platform) => {
                        if (!val) return '---';
                        let url = val.trim();
                        if (!url.startsWith('http')) {
                            if (platform === 'instagram') {
                                url = `https://instagram.com/${url.replace('@', '')}`;
                            } else if (platform === 'facebook') {
                                if (url.includes(' ')) {
                                    url = `https://www.facebook.com/search/top?q=${encodeURIComponent(url)}`;
                                } else {
                                    url = `https://facebook.com/${url}`;
                                }
                            } else {
                                url = `https://${url}`;
                            }
                        }
                        return `<a href="${url}" target="_blank" dir="ltr" style="color:var(--primary); text-decoration:underline; font-weight:500; direction:ltr; display:inline-block;">${val}</a>`;
                    };

                    document.getElementById('client-instagram-view').innerHTML = formatLink(c.instagram, 'instagram');
                    document.getElementById('client-facebook-view').innerHTML = formatLink(c.facebook, 'facebook');
                    document.getElementById('client-website-view').innerHTML = formatLink(c.website, 'website');
                }
            });
            this.setClientEditMode(false);
            UI.renderNotes(clientId, null);
        } else {
            editToggle.style.display = 'none';
            deleteBtn.style.display = 'none';
            if (addProjectBtn) addProjectBtn.style.display = 'none';
            document.getElementById('client-form').reset();
            document.getElementById('client-notes-list').innerHTML = '';
            document.getElementById('client-projects-list').innerHTML = '';
            const clientDocsContainer = document.getElementById('client-documents-list');
            if (clientDocsContainer) clientDocsContainer.innerHTML = '';
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
                this.confirmAction('שגיאה', 'הפרויקט לא נמצא. ייתכן שנמחק.', null, true);
                return;
            }
        }
        
        this.editingProjectId = projectId;
        document.getElementById('project-modal-title').innerText = title;
        const modal = document.getElementById('project-modal');
        modal.classList.remove('hidden');
        document.querySelector('#project-modal .modal').scrollTop = 0;
        this.bringModalToFront(modal);

        // Toggle document upload visibility based on plan
        Store.getUserProfile().then(profile => {
            const uploadBox = document.getElementById('project-upload-box');
            const upgradeMsg = document.getElementById('project-upload-upgrade-msg');
            const isStarter = profile?.plan === 'starter';

            if (uploadBox) uploadBox.style.display = isStarter ? 'none' : 'block';
            if (upgradeMsg) {
                if (isStarter) upgradeMsg.classList.remove('hidden');
                else upgradeMsg.classList.add('hidden');
            }

            // Hide checklist import buttons for Starter
            document.querySelectorAll('.import-defaults-btn').forEach(btn => {
                btn.style.display = isStarter ? 'none' : 'flex';
            });
        });

        const deleteBtn = document.getElementById('delete-project-btn');
        const driveLink = document.getElementById('project-drive-link');
        
        let projectClientId = selectedClientId || (p ? p.client_id : null);
        
        await UI.populateClientsDropdown(projectClientId);
        await UI.populatePackagesDatalist();

        if (projectId && p) {
            this.editingProjectPaymentStatus = p.payment_status || 'not_paid';
            document.getElementById('project-client').value = p.client_id;
            document.getElementById('project-name').value = p.name;
            const projectDateEl = document.getElementById('project-date');
            if (projectDateEl._flatpickr) {
                projectDateEl._flatpickr.setDate(p.shoot_date || '');
            } else {
                projectDateEl.value = p.shoot_date || '';
            }
            document.getElementById('project-time').value = p.shoot_time || '';
            document.getElementById('project-location').value = p.location || '';
            document.getElementById('project-subjects-count').value = p.subjects_count || '';
            document.getElementById('project-subjects-details').value = p.subjects_details || '';
            this.setProjectStylingCall(p.styling_call || 'none', true);
            document.getElementById('project-publication-approval').checked = p.publication_approval || false;
            this.setProjectStatus(p.status || 'new', true);
            this.setProjectPaymentStatus(p.payment_status || 'not_paid', true);
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
            
            this.setProjectEditMode(true);
            UI.renderNotes(null, projectId);
            UI.renderChecklist(projectId);
            UI.renderDocuments(p.client_id, projectId);
            deleteBtn.style.display = 'block';
        } else {
            driveLink.style.display = 'none';
            document.getElementById('project-form').reset();
            const projectDateEl = document.getElementById('project-date');
            if (projectDateEl._flatpickr) {
                projectDateEl._flatpickr.clear();
            }
            if (selectedClientId) {
                document.getElementById('project-client').value = selectedClientId;
            }
            document.getElementById('project-notes-list').innerHTML = '';
            this.setProjectStatus('new', true);
            this.setProjectStylingCall('none', true);
            document.getElementById('proj-total-price').value = '';
            this.setProjectPaymentStatus('not_paid', true);
            this.toggleNotClosedReason('new');
            this.setProjectEditMode(true);
            this._pendingChecklistItems = [];
            UI.renderChecklist(null);
            deleteBtn.style.display = 'none';
        }
        if (this.updateProjectClientLink) {
            this.updateProjectClientLink(document.getElementById('project-client').value);
        }
        if (window.lucide) lucide.createIcons();
    },

    updateProjectClientLink(clientId) {
        const btn = document.getElementById('project-client-link-btn');
        if (btn) {
            if (clientId) {
                btn.style.display = 'flex';
                btn.dataset.clientid = clientId;
            } else {
                btn.style.display = 'none';
                btn.dataset.clientid = '';
            }
        }
    },

    openNewClientFromProject() {
        this._isCreatingClientFromProject = true;
        this.openClientModal('לקוח חדש');
    },

    openProjectClientCard() {
        this._isCreatingClientFromProject = true;
        const btn = document.getElementById('project-client-link-btn');
        if (btn && btn.dataset.clientid) {
            this.openClientModal('פרטי לקוח', btn.dataset.clientid);
        }
    },

    setProjectEditMode(isEdit) {
        // Force isEdit to true to allow editing by default
        isEdit = true;
        
        const form = document.getElementById('project-form');
        const saveBtn = document.getElementById('save-project-btn');
        const footerCancelBtn = document.getElementById('project-cancel-btn');
        
        const status = document.getElementById('project-status').value;
        this.toggleNotClosedReason(status);

        // Toggle visibility of inputs and spans
        form.querySelectorAll('.view-group').forEach(group => {
            const input = group.querySelector('input, select, textarea');
            const span = group.querySelector('.view-text');
            
            input?.classList.remove('hidden');
            span?.classList.add('hidden');
            if (input && input.tagName === 'SELECT') input.disabled = false;
            if (input) input.readOnly = false;
        });

        // Special handling for client dropdown
        const clientSelect = document.getElementById('project-client');
        if (clientSelect) clientSelect.disabled = false;

        // Ensure buttons are visible
        if (saveBtn) saveBtn.style.display = 'block';
        if (footerCancelBtn) footerCancelBtn.style.display = 'block';
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

    bringModalToFront(modalElement) {
        if (!modalElement) return;
        let maxZ = 1000; // Base z-index for modals in styles is usually 1000
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
            if (m !== modalElement) {
                const z = parseInt(window.getComputedStyle(m).zIndex, 10) || 1000;
                if (z > maxZ) maxZ = z;
            }
        });
        modalElement.style.zIndex = maxZ + 10;
    },

    closeSpecificModal(id) {
        const m = document.getElementById(id);
        if (m) {
            m.classList.add('hidden');
            m.style.zIndex = '';
        }
        
        switch (id) {
            case 'client-modal': 
                this.editingClientId = null; 
                this._isCreatingClientFromProject = false;
                break;
            case 'project-modal': this.editingProjectId = null; break;
            case 'task-modal': this.editingTaskId = null; break;
            case 'package-modal': this.editingPackageId = null; break;
            case 'location-modal': this.editingLocationId = null; break;
        }
    },

    closeTopModal() {
        const open = Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'))
            .filter(m => m.id !== 'upgrade-modal' && m.id !== 'confirm-modal');
        if (open.length > 0) {
            open.sort((a, b) => {
                let za = parseInt(window.getComputedStyle(a).zIndex) || 0;
                let zb = parseInt(window.getComputedStyle(b).zIndex) || 0;
                return za - zb; // lowest first
            });
            this.closeSpecificModal(open[open.length - 1].id);
        } else {
            this.closeModal();
        }
    },

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            // Don't close upgrade-modal OR confirm-modal in general closeModal
            if (m.id !== 'upgrade-modal' && m.id !== 'confirm-modal') {
                m.classList.add('hidden');
                if (m.id === 'client-modal' || m.id === 'project-modal') {
                    m.style.zIndex = ''; // Reset z-index
                }
            }
        });
        this.editingClientId = null;
        this.editingProjectId = null;
        this.editingProjectPaymentStatus = null;
        this.editingPackageId = null;
        this.editingTaskId = null;
        this.editingLocationId = null;
        this._isCreatingClientFromProject = false;
    },

    openUpgradeModal() {
        const modal = document.getElementById('upgrade-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            if (window.lucide) lucide.createIcons();
        }
    },

    closeUpgradeModal() {
        const modal = document.getElementById('upgrade-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    },

    async handleClientSubmit() {
        const client = {
            id: this.editingClientId,
            name: document.getElementById('client-name').value,
            organization: document.getElementById('client-organization').value,
            phone: document.getElementById('client-phone').value,
            source: document.getElementById('client-source').value,
            city: document.getElementById('client-city').value,
            email: document.getElementById('client-email').value,
            instagram: document.getElementById('client-instagram').value,
            facebook: document.getElementById('client-facebook').value,
            website: document.getElementById('client-website').value
        };
        const isNew = !this.editingClientId;
        const submitBtn = document.getElementById('save-client-btn');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'שומר...';

        try {
            const savedClient = await Store.saveClient(client);
            
            // Log action
            const action = isNew ? 'הוספת לקוח' : 'עדכון פרטי לקוח';
            await Store.logAction(action, isNew ? `לקוח/ה חדש/ה נוסף/פה: ${savedClient.name}` : `פרטי הלקוח/ה ${savedClient.name} עודכנו`, 'client', savedClient.id);

            if (this._isCreatingClientFromProject) {
                this.closeSpecificModal('client-modal');
                await UI.populateClientsDropdown(savedClient.id);
                if (this.updateProjectClientLink) this.updateProjectClientLink(savedClient.id);
                this._isCreatingClientFromProject = false;
            } else {
                this.closeModal();
                await this.navigate(this.currentView);
            }
        } catch (error) {
            console.error('Save client error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בשמירת הלקוח.', null, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    },

    async handleProjectSubmit() {
        const isNew = !this.editingProjectId;
        
        // Enforce Starter Plan Limit (max 5 projects per month)
        if (isNew) {
            const profile = await Store.getUserProfile();
            const isProfessional = profile?.plan === 'professional';
            
            if (!isProfessional) {
                const projects = await Store.getProjects();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const monthlyProjects = projects.filter(p => {
                    if (!p.created_at) return false;
                    const date = new Date(p.created_at);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                });

                if (monthlyProjects.length >= 3) {
                    this.confirmAction(
                        'הגעת למכסה החודשית',
                        'בחבילת ה-Starter ניתן ליצור עד 3 פרויקטים בחודש.<br><br><b>רוצה להמשיך ללא הגבלה?</b> שדרג/י עכשיו לחבילת Pro ונהל/י את כל העסק במקום אחד.',
                        () => { window.location.href = 'pricing.html'; }
                    );
                    const yesBtn = document.getElementById('confirm-yes-btn');
                    if (yesBtn) yesBtn.innerText = 'לשדרוג עכשיו';
                    return; // Stop submission
                }
            }
        }

        const deposit = parseFloat(document.getElementById('proj-deposit-paid').value) || 0;
        const total = parseFloat(document.getElementById('proj-total-price').value) || 0;
        
        const project = {
            id: this.editingProjectId,
            clientId: document.getElementById('project-client').value,
            hasManualDefaults: this._pendingChecklistItems && this._pendingChecklistItems.length > 0,
            name: document.getElementById('project-name').value,
            shootDate: document.getElementById('project-date').value,
            shootTime: document.getElementById('project-time').value,
            status: document.getElementById('project-status').value,
            notClosedReason: document.getElementById('not-closed-reason').value,
            subjectsCount: document.getElementById('project-subjects-count').value,
            subjectsDetails: document.getElementById('project-subjects-details').value,
            stylingCall: document.getElementById('project-styling-call').value,
            publicationApproval: document.getElementById('project-publication-approval').checked,
            paymentStatus: document.getElementById('project-payment-status').value, // Use explicit value from select
            payments: {
                total: total,
                deposit: deposit
            },
            driveLink: document.getElementById('project-drive').value,
            location: document.getElementById('project-location').value
        };
        const submitBtn = document.getElementById('save-project-btn');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'שומר...';

        try {
            const savedProject = await Store.saveProject(project);
            
            // Background operations - DO NOT AWAIT for faster feel
            this._runBackgroundPostSave(savedProject, isNew);

            this.closeSpecificModal('project-modal');
            const clientModal = document.getElementById('client-modal');
            if (clientModal && !clientModal.classList.contains('hidden') && this.editingClientId === savedProject.client_id) {
                UI.renderClientProjects(this.editingClientId);
            } else {
                this.navigate(this.currentView);
            }
        } catch (error) {
            console.error('Save project error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בשמירת הפרויקט.', null, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    },

    async _runBackgroundPostSave(savedProject, isNew) {
        try {
            // Log action in background
            const action = isNew ? 'פרויקט חדש' : 'עדכון פרויקט';
            let clientDisplayName = '';
            if (savedProject?.clients?.name) {
                clientDisplayName = ` (${savedProject.clients.name})`;
            }
            const name = savedProject.name || 'פרויקט ללא שם';
            Store.logAction(action, isNew ? `פרויקט חדש נוצר: ${name}${clientDisplayName}` : `פרטי הפרויקט ${name}${clientDisplayName} עודכנו`, 'project', savedProject.id);

            // Save pending checklist items if any
            if (isNew && this._pendingChecklistItems && this._pendingChecklistItems.length > 0) {
                const itemsToSave = [...this._pendingChecklistItems];
                this._pendingChecklistItems = [];
                
                // Fetch existing (could have automations)
                const existingItems = await Store.getChecklistItems(savedProject.id);
                
                for (const item of itemsToSave) {
                    const exists = existingItems.some(ei => {
                        const normalize = (s) => s.replace('הלקוח/ה', 'הלקוח').replace('הלקוחה', 'הלקוח').trim();
                        return normalize(ei.content) === normalize(item.content) && ei.category === item.category;
                    });

                    if (!exists) {
                        await Store.saveChecklistItem({
                            ...item,
                            projectId: savedProject.id
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Background post-save tasks failed:', e);
        }
    },

    async importDefaults(e, category) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const profile = await Store.getUserProfile();
        if (profile?.plan === 'starter') {
            this.openUpgradeModal();
            return;
        }

        if (!this.editingProjectId) {
            // New project - import to pending items
            try {
                const defaults = Store.getChecklistDefaults();
                const categoryDefaults = defaults[category] || [];
                const shootDate = document.getElementById('project-date').value;
                const projectName = document.getElementById('project-name').value;
                const clientSelect = document.getElementById('project-client');
                const clientName = clientSelect.options[clientSelect.selectedIndex]?.text.split(' (')[0] || '';

                const newItems = categoryDefaults.map(content => {
                    let dueDate = null;
                    let finalContent = content;
                    if (category === 'shoot' && content.includes('תזכורת')) {
                        if (shootDate) {
                            const date = new Date(shootDate);
                            date.setDate(date.getDate() - 1);
                            dueDate = date.toISOString().split('T')[0];
                        }
                        if (clientName) {
                            finalContent = `${content} (${clientName})`;
                        }
                    }
                    return { content: finalContent, category, dueDate, is_completed: false, tempId: Date.now() + Math.random() };
                });

                // Filter out duplicates in pending items
                const currentPending = this._pendingChecklistItems || [];
                const finalNewItems = newItems.filter(newItem => 
                    !currentPending.some(existing => {
                        if (existing.category !== newItem.category) return false;
                        const normalize = (s) => s.replace('הלקוח/ה', 'הלקוח').replace('הלקוחה', 'הלקוח').trim();
                        return normalize(existing.content) === normalize(newItem.content);
                    })
                );

                this._pendingChecklistItems = [...currentPending, ...finalNewItems];
                UI.renderChecklist(null);
                
                if (finalNewItems.length === 0) {
                    this.confirmAction('מידע', 'כל פריטי ברירת המחדל כבר נמצאים ברשימה.', null, true);
                }
            } catch (error) {
                console.error('Import defaults (new project) error:', error);
            }
            return;
        }
        
        try {
            const pid = this.editingProjectId;
            if (!pid) {
                console.warn('Import defaults: editingProjectId is missing');
                return;
            }

            const projects = await Store.getProjects();
            const project = projects.find(p => String(p.id) === String(pid));
            
            const imported = await Store.importCategoryDefaults(pid, category, project?.shoot_date, project);
            
            if (imported && imported.length > 0) {
                await UI.renderChecklist(pid);
            } else {
                this.confirmAction('מידע', 'כל פריטי ברירת המחדל כבר קיימים ברשימה.', null, true);
            }
        } catch (error) {
            console.error('Import defaults error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בייבוא הרשימה.', null, true);
        }
    },

    removePendingItem(tempId) {
        this._pendingChecklistItems = this._pendingChecklistItems.filter(i => i.tempId !== tempId);
        UI.renderChecklist(null);
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

    async updateCalendarCity(city) {
        Store.setCalendarCity(city);
        
        // Log action
        const cityName = Store.defaults.shabbatCities.find(c => c.id === city)?.name || city;
        await Store.logAction('שינוי עיר לזמני שבת', `העיר לחישוב זמני שבת שונתה ל: ${cityName}`, 'settings');

        // Refresh views that use Shabbat times
        if (this.currentView === 'calendar') await UI.renderCalendar();
        if (this.currentView === 'dashboard') await UI.renderDashboard();
    },

    async updateGender(gender) {
        await Store.setUserGender(gender);
        
        // Log action
        const genderName = gender === 'male' ? 'צלם' : 'צלמת';
        await Store.logAction('שינוי מגדר פנייה', `מגדר הפנייה שונה ל: ${genderName}`, 'settings');

        this.applyGender();
        
        // Refresh views that might have gendered content
        if (this.currentView === 'settings') await UI.renderSettings();
        if (this.currentView === 'dashboard') await UI.renderDashboard();
        if (this.currentView === 'locations') await UI.renderLocations();
    },

    async changePassword() {
        const passwordInput = document.getElementById('settings-new-password');
        const confirmInput = document.getElementById('settings-confirm-password');
        const errorDiv = document.getElementById('password-change-error');
        const successDiv = document.getElementById('password-change-success');
        const btn = document.getElementById('change-password-btn');

        const password = passwordInput.value;
        const confirm = confirmInput.value;

        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');

        if (!password || password.length < 6) {
            errorDiv.textContent = 'הסיסמה חייבת להכיל לפחות 6 תווים';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (password !== confirm) {
            errorDiv.textContent = 'הסיסמאות אינן תואמות';
            errorDiv.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> מעדכן...';

        const result = await Auth.updatePassword(password);

        if (result.success) {
            successDiv.textContent = 'הסיסמה עודכנה בהצלחה!';
            successDiv.classList.remove('hidden');
            passwordInput.value = '';
            confirmInput.value = '';
            
            // Log action
            await Store.logAction('עדכון סיסמה', 'המשתמש עדכן את סיסמת ההתחברות', 'settings');
        } else {
            errorDiv.textContent = result.error;
            errorDiv.classList.remove('hidden');
        }

        btn.disabled = false;
        btn.innerHTML = originalText;
    },

    async exportData() {
        const btn = document.getElementById('export-data-btn');
        const status = document.getElementById('export-status');
        const checkboxes = document.querySelectorAll('.export-checkbox:checked');
        
        if (checkboxes.length === 0) {
            this.confirmAction('שים לב', 'נא לבחור לפחות סוג נתונים אחד לייצוא.', null, true);
            return;
        }

        const selectedTypes = Array.from(checkboxes).map(cb => cb.value);
        
        btn.disabled = true;
        status.classList.remove('hidden');

        try {
            // Create a new workbook
            const wb = XLSX.utils.book_new();

            // Fetch and add each selected data type as a sheet
            for (const type of selectedTypes) {
                let data = [];
                let sheetName = '';
                let columns = [];

                switch (type) {
                    case 'clients':
                        const clients = await Store.getClients();
                        sheetName = 'לקוחות';
                        data = clients.map(c => ({
                            'שם': c.name,
                            'טלפון': c.phone,
                            'מקור': UI.getSourceLabel(c.source),
                            'עיר': c.city || '',
                            'אימייל': c.email || '',
                            'אינסטגרם': c.instagram || '',
                            'תאריך הצטרפות': new Date(c.created_at).toLocaleDateString('he-IL')
                        }));
                        break;
                    case 'projects':
                        const projects = await Store.getProjects();
                        sheetName = 'פרויקטים';
                        data = projects.map(p => ({
                            'שם הפרויקט': p.name,
                            'לקוח': p.clients?.name || 'לא ידוע',
                            'תאריך צילום': p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : '',
                            'שעה': p.shoot_time || '',
                            'סטטוס': Store.getStatusInfo(p.status || 'new').label,
                            'לוקיישן': p.location || '',
                            'מחיר כולל': p.payments?.total || 0,
                            'שולם מקדמה': p.payments?.deposit || 0,
                            'סטטוס תשלום': p.payment_status === 'paid_full' ? 'שולם' : (p.payment_status === 'deposit' ? 'מקדמה' : 'לא שולם'),
                            'סיבה אם לא נסגר': p.not_closed_reason || ''
                        }));
                        break;
                    case 'tasks':
                        const tasks = await Store.getAllTasks();
                        sheetName = 'משימות';
                        data = tasks.map(t => ({
                            'משימה': t.content,
                            'פרויקט': t.projects?.name || 'כללי',
                            'קטגוריה': t.category === 'shoot' ? 'צילום' : (t.category === 'equipment' ? 'ציוד' : 'אחר'),
                            'בוצע': t.is_completed ? 'כן' : 'לא',
                            'תאריך יעד': t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : '',
                            'נוצרה ב': new Date(t.created_at).toLocaleDateString('he-IL')
                        }));
                        break;
                    case 'logs':
                        const logs = await Store.getActionLogs();
                        sheetName = 'יומן פעולות';
                        data = logs.map(l => ({
                            'תאריך': new Date(l.created_at).toLocaleString('he-IL'),
                            'פעולה': l.action,
                            'פרטים': l.details
                        }));
                        break;
                    case 'packages':
                        const packages = await Store.getPackages();
                        sheetName = 'חבילות';
                        data = packages.map(p => ({
                            'שם החבילה': p.name,
                            'מחיר': p.price,
                            'משך זמן': p.duration || ''
                        }));
                        break;
                    case 'locations':
                        const locations = await Store.getLocations();
                        sheetName = 'לוקיישנים';
                        const regionMap = { 'center': 'מרכז', 'north': 'צפון', 'south': 'דרום', 'jerusalem': 'ירושלים', 'sharon': 'שרון' };
                        const typeMap = { 'urban': 'אורבני', 'nature': 'טבע', 'beach': 'ים', 'village': 'כפרי' };
                        data = locations.map(l => ({
                            'שם': l.title,
                            'אזור': regionMap[l.region] || l.region,
                            'סוג': typeMap[l.type] || l.type,
                            'תיאור': l.description
                        }));
                        break;
                    case 'notes':
                        const allNotes = await Store.getNotes();
                        sheetName = 'הערות';
                        data = allNotes.map(n => ({
                            'תוכן': n.content,
                            'סוג': n.client_id ? 'לקוח' : (n.project_id ? 'פרויקט' : 'כללי'),
                            'תאריך': new Date(n.created_at).toLocaleString('he-IL')
                        }));
                        break;
                }

                if (data.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(data, { header: Object.keys(data[0]) });
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                } else {
                    // Even if empty, create a dummy sheet to avoid errors if all are empty
                    const ws = XLSX.utils.json_to_sheet([{ 'מידע': 'אין נתונים זמינים' }]);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                }
            }

            // Generate file name with current date
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `Centra_Export_${dateStr}.xlsx`;

            // Download file
            XLSX.writeFile(wb, fileName);

            // Log action
            await Store.logAction('ייצוא נתונים', `בוצע ייצוא לקובץ אקסל עבור: ${selectedTypes.join(', ')}`, 'settings');

        } catch (error) {
            console.error('Export error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בייצוא הנתונים. נא לנסות שוב.', null, true);
        } finally {
            btn.disabled = false;
            status.classList.add('hidden');
        }
    },

    applyGender() {
        const gender = Store.getUserGender();
        const isMale = gender === 'male';
        
        // Update Static Elements in index.html
        const greeting = document.getElementById('view-title');
        if (greeting && greeting.innerText.includes('שלום')) {
            greeting.innerText = isMale ? 'שלום צלם! 👋' : 'שלום צלמת! 👋';
        }

        // Update Project Location placeholder
        const locInput = document.getElementById('project-location');
        if (locInput) locInput.placeholder = isMale ? 'הזן מיקום...' : 'הזיני מיקום...';

        // Update Location Description placeholder
        const locDesc = document.getElementById('location-description');
        if (locDesc) locDesc.placeholder = isMale ? 'תאר את הלוקיישן - מה יש בו, למה הוא מתאים, באיזה עונה הכי יפה...' : 'תארי את הלוקיישן - מה יש בו, למה הוא מתאים, באיזה עונה הכי יפה...';

        // Update not-closed reason placeholder
        const reasonInput = document.getElementById('not-closed-reason');
        if (reasonInput) reasonInput.placeholder = isMale ? 'למה הלקוח לא סגר? (למשל: מחיר יקר מדי, לא זמין בתאריך...)' : 'למה הלקוח לא סגר? (למשל: מחיר יקר מדי, לא זמינה בתאריך...)';

        // Update confirm title
        const confirmTitle = document.getElementById('confirm-title');
        if (confirmTitle && (confirmTitle.innerText.includes('בטוח/ה') || confirmTitle.innerText.includes('בטוח'))) {
            confirmTitle.innerText = isMale ? 'האם אתה בטוח?' : 'האם את בטוחה?';
        }

        // SEO/Meta
        document.title = 'Centra - ניהול עסק לצילום';
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = 'Centra - מערכת פשוטה וחכמה לניהול לקוחות ופרויקטים לעסק לצילום.';
        }
    },

    editClient(id) { 
        this.openClientModal('עריכת לקוח', id);
        this.setClientEditMode(true);
    },

    async viewClient(id) { 
        this.closeModal();
        const clients = await Store.getClients();
        const clientExists = clients.some(c => String(c.id) === String(id));
        
        if (!clientExists) {
            this.confirmAction('לקוח נמחק', 'הלקוח שניסית לפתוח כבר אינו קיים במערכת.', null, true);
            return;
        }

        this.openClientModal('פרטי לקוח', id);
    },

    async viewProject(id) {
        this.closeModal();
        // First check if project exists
        const projects = await Store.getProjects();
        const projectExists = projects.some(p => String(p.id) === String(id));
        
        if (!projectExists) {
            // Project doesn't exist - maybe it was deleted
            this.confirmAction('פרויקט נמחק', 'הפרויקט שניסית לפתוח כבר אינו קיים במערכת.', null, true);
            return;
        }
        
        this.openProjectModal('פרטי פרויקט', id);
    },

    async viewTask(id) {
        const task = await Store.getTaskById(id);
        if (task) {
            this.openTaskModal(task);
        } else {
            this.confirmAction(
                'משימה נמחקה',
                'המשימה שניסית לפתוח הוסרה מהמערכת.',
                null,
                true // isAlert
            );
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
            'האם בטוח/ה שברצונך למחוק את הלקוח?',
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
            'האם בטוח/ה שברצונך למחוק את הפרויקט?',
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
                    this.confirmAction('שימת לב', 'יש לשמור קודם את הלקוח לפני הוספת הערה.', null, true);
                    return;
                }
                await Store.addNote(content, this.editingClientId, null);
                UI.renderNotes(this.editingClientId, null);
            } else {
                if (!this.editingProjectId) {
                    this.confirmAction('שימת לב', 'יש לשמור קודם את הפרויקט לפני הוספת הערה.', null, true);
                    return;
                }
                await Store.addNote(content, null, this.editingProjectId);
                const projects = await Store.getProjects();
                const p = projects.find(proj => String(proj.id) === String(this.editingProjectId));
                let clientDisplayName = '';
                if (p?.clients?.name) {
                    clientDisplayName = ` (<span class="log-client-link" onclick="app.viewClient('${p.client_id}')">${p.clients.name}</span>)`;
                }
                const projLink = p ? `<span class="log-client-link" onclick="app.viewProject('${p.id}')">${p.name}</span>` : 'לא ידוע';
                await Store.logAction('הערה חדשה', `הערה חדשה נוספה לפרויקט "${projLink}${clientDisplayName}": ${content}`, 'note', this.editingProjectId || this.editingClientId);
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

        this.confirmAction('מחיקת הערה', 'האם בטוח/ה שברצונך למחוק את ההערה?', async () => {
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
                this.setProjectStylingCall(value, true);
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

    async updateStatus(id, status) {
        if (status === 'not_closed') {
            this.promptAction(
                'סיבת אי סגירה',
                'הפרויקט הועבר לסטטוס "לא נסגר".<br>למה זה קרה?',
                'למשל: מחיר יקר מדי, לא זמין בתאריך, הלקוח התחרט...',
                async (reason) => {
                    if (reason) {
                        try {
                            await Store.updateProjectNotClosedReason(id, reason);
                        } catch (e) {
                            console.error('Update reason error:', e);
                        }
                    }
                    this.actuallyUpdateStatus(id, status);
                }
            );
        } else {
            this.actuallyUpdateStatus(id, status);
        }
    },

    async actuallyUpdateStatus(id, status) {
        try {
            await Store.updateProjectStatus(id, status);
            const projects = await Store.getProjects();
            const p = projects.find(proj => proj.id === id);
            const statusLabel = Store.defaults.statuses.find(s => s.id === status)?.label || status;
            const clientName = p?.clients?.name ? ` (<span class="log-client-link" onclick="app.viewClient('${p.client_id}')">${p.clients.name}</span>)` : '';
            const projLink = p ? `<span class="log-client-link" onclick="app.viewProject('${p.id}')">${p.name}</span>` : '';
            await Store.logAction('עדכון סטטוס', `הסטטוס של הפרויקט ${projLink}${clientName} שונה ל: ${statusLabel}`, 'project', id);
            
            if (this.currentView === 'projects') await UI.renderProjects();
            else if (this.currentView === 'calendar') await UI.renderCalendar();
            else if (this.currentView === 'archive') await UI.renderArchive();
            else if (this.editingProjectId === id) await this.openProjectModal('פרטי פרויקט', id);
        } catch (error) {
            console.error('Update status error:', error);
        }
    },

    async updatePaymentStatus(id, newStatus) {
        try {
            await Store.updateProjectPaymentStatus(id, newStatus);

            // Log action
            const projects = await Store.getProjects();
            const p = projects.find(proj => String(proj.id) === String(id));
            let clientDisplayName = '';
            if (p?.clients?.name) {
                clientDisplayName = ` (<span class="log-client-link" onclick="app.viewClient('${p.client_id}')">${p.clients.name}</span>)`;
            } else if (p?.client_id) {
                const clients = await Store.getClients();
                const c = clients.find(cust => String(cust.id) === String(p.client_id));
                if (c) clientDisplayName = ` (<span class="log-client-link" onclick="app.viewClient('${c.id}')">${c.name}</span>)`;
            }
            const projLink = p ? `<span class="log-client-link" onclick="app.viewProject('${p.id}')">${p.name}</span>` : 'לא ידוע';
            const statusLabels = { 'not_paid': 'טרם שולם', 'deposit': 'מקדמה שולמה', 'paid_full': 'שולם במלואו' };
            await Store.logAction('עדכון גבייה', `סטטוס הגבייה לפרויקט "${projLink}${clientDisplayName}" עודכן ל-"${statusLabels[newStatus] || newStatus}"`, 'project', id);

            // Sync modal if open for this project
            if (this.editingProjectId === id) {
                this.setProjectPaymentStatus(newStatus, true);
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
        const modal = document.getElementById('package-modal');
        modal.classList.remove('hidden');
        document.querySelector('#package-modal .modal').scrollTop = 0;
        this.bringModalToFront(modal);
        const deleteBtn = document.getElementById('delete-package-btn');
        
        if (packageId) {
            deleteBtn.style.display = 'block';
            Store.getPackages().then(packages => {
                const pkg = packages.find(p => p.id === packageId);
                if (pkg) {
                    document.getElementById('package-name').value = pkg.name;
                    document.getElementById('package-price').value = pkg.price;
                    document.getElementById('package-duration').value = pkg.duration || '';
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
            price: parseFloat(document.getElementById('package-price').value),
            duration: document.getElementById('package-duration').value
        };
        const isNew = !this.editingPackageId;
        const savedPkg = await Store.savePackage(pkg);
        
        await Store.logAction(isNew ? 'חבילה חדשה' : 'עדכון חבילה', isNew ? `חבילה חדשה נוספה: ${savedPkg.name}` : `פרטי החבילה ${savedPkg.name} עודכנו`, 'package', savedPkg.id);

        this.closeModal();
        await this.navigate('settings');
    },

    async deletePackage(id) {
        this.confirmAction('מחיקת חבילה', 'האם בטוח/ה שברצונך למחוק את החבילה?', async () => {
            await Store.deletePackage(id);
            await this.navigate('settings');
        });
    },

    async deleteChecklistItem(id, projectId) {
        this.confirmAction('מחיקת משימה', 'האם בטוח/ה שברצונך למחוק את המשימה?', async () => {
            await Store.deleteChecklistItem(id);
            if (projectId && projectId !== 'undefined') await UI.renderChecklist(projectId);
            await this.navigate(this.currentView);
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
            if (projectId && projectId !== 'undefined') UI.renderChecklist(projectId);
            await this.navigate(this.currentView);
        } catch (error) {
            console.error('Toggle checklist item error:', error);
        }
    },


    async addGlobalTask() {
        const input = document.getElementById('new-global-task-input');
        const content = input.value?.trim();
        if (!content) return;

        try {
            const taskId = 'local_' + Date.now();
            await Store.saveChecklistItem({
                id: taskId,
                projectId: null,
                content,
                category: 'task',
                isCompleted: false
            });
            await Store.logAction('משימה חדשה', `משימה כללית חדשה נוספה: ${content}`, 'task', taskId);
            input.value = '';
            UI.renderTasks();
        } catch (error) {
            console.error('Add global task error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בהוספת המשימה.', null, true);
        }
    },

    async openTaskModal(task) {
        this.editingTaskId = task.id;
        document.getElementById('task-content').value = task.content;
        const taskDateEl = document.getElementById('task-due-date');
        const taskDateVal = task.due_date ? task.due_date.split('T')[0] : '';
        if (taskDateEl._flatpickr) {
            taskDateEl._flatpickr.setDate(taskDateVal);
        } else {
            taskDateEl.value = taskDateVal;
        }
        document.getElementById('task-completed-checkbox').checked = task.is_completed;
        document.getElementById('task-notes').value = task.notes || '';
        
        const projectInfo = document.getElementById('task-project-info');
        let projectName = '';
        let clientName = '';
        const pid = task.project_id || task.projectId;
        if (pid) {
            try {
                const projects = await Store.getProjects();
                const proj = projects.find(p => String(p.id) === String(pid));
                if (proj) {
                    projectName = proj.name;
                    clientName = proj.clients?.name || '';
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        if (!projectName && task.projects) {
            projectName = task.projects.name;
            clientName = task.projects.clients?.name || '';
        }

        if (projectName) {
            if (clientName) {
                projectInfo.innerText = `משויך לפרויקט: ${projectName} (${clientName})`;
            } else {
                projectInfo.innerText = `משויך לפרויקט: ${projectName}`;
            }
            projectInfo.style.display = 'block';
        } else {
            projectInfo.style.display = 'none';
        }

        const deleteBtn = document.getElementById('delete-task-btn');
        if (deleteBtn) deleteBtn.style.display = 'block';

        const modal = document.getElementById('task-modal');
        modal.classList.remove('hidden');
        document.querySelector('#task-modal .modal').scrollTop = 0;
        this.bringModalToFront(modal);
    },

    openNewTaskModal() {
        this.editingTaskId = null;
        document.getElementById('task-content').value = '';
        const taskDateEl = document.getElementById('task-due-date');
        if (taskDateEl._flatpickr) {
            taskDateEl._flatpickr.clear();
        } else {
            taskDateEl.value = '';
        }
        document.getElementById('task-completed-checkbox').checked = false;
        document.getElementById('task-notes').value = '';
        
        const projectInfo = document.getElementById('task-project-info');
        if (projectInfo) projectInfo.style.display = 'none';

        const deleteBtn = document.getElementById('delete-task-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';

        const modal = document.getElementById('task-modal');
        modal.classList.remove('hidden');
        document.querySelector('#task-modal .modal').scrollTop = 0;
        this.bringModalToFront(modal);
    },

    async handleTaskSubmit() {
        let task = this.editingTaskId ? await Store.getTaskById(this.editingTaskId) : null;
        
        const isNew = !task;
        const taskId = isNew ? 'local_' + Date.now() : task.id;
        const projectId = isNew ? null : task.project_id;
        const category = isNew ? 'task' : task.category;
        
        const updatedTask = {
            ...(task || {}),
            id: taskId,
            projectId,
            category,
            content: document.getElementById('task-content').value,
            dueDate: document.getElementById('task-due-date').value,
            isCompleted: document.getElementById('task-completed-checkbox').checked,
            notes: document.getElementById('task-notes').value
        };

        try {
            await Store.saveChecklistItem(updatedTask);
            if (isNew) {
                await Store.logAction('משימה חדשה', `משימה כללית חדשה נוספה: ${updatedTask.content}`, 'task', taskId);
            }
            this.closeModal();
            if (this.currentView === 'tasks') await UI.renderTasks();
            else if (this.currentView === 'dashboard') await UI.renderDashboard();
            if (updatedTask.projectId) UI.renderChecklist(updatedTask.projectId);
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

        const dayProjects = projects.filter(p => {
            if (!p.shoot_date) return false;
            const projectDate = String(p.shoot_date).split('T')[0];
            return projectDate === dateStr && p.status !== 'archived';
        });
        
        // De-duplicate tasks for this day
        const allDayTasks = tasks.filter(t => {
            const taskDate = String(t.due_date || t.dueDate || '').split('T')[0];
            return taskDate === dateStr;
        });
        const seenTaskKey = new Set();
        const dayTasks = allDayTasks.filter(t => {
            const content = String(t.content || '').trim();
            const pid = String(t.project_id || t.projectId || 'no-proj');
            const key = `${pid}-${content}`;
            
            if (seenTaskKey.has(key)) return false;
            seenTaskKey.add(key);
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
                    const clickAction = `app.viewTask('${t.id}')`;
                return `
                <div style="display: flex; align-items: stretch; gap: 8px; margin-bottom: 4px;">
                    <div onclick="document.getElementById('day-details-popup')?.remove(); ${clickAction}" style="background:${bg}; color:${color}; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:0.85rem; ${t.is_completed ? 'opacity:0.6; text-decoration:line-through;' : ''}; flex: 1;">${t.content}</div>
                    <button class="btn-icon" style="color:#EF4444; background:${bg}; border-radius:6px; padding: 0 8px;" onclick="event.stopPropagation(); app.deleteChecklistItem('${t.id}')">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                </div>`;
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
        
        if (dragType !== 'payment' || !projectId) return;

        try {
            await this.updatePaymentStatus(projectId, newPaymentStatus);
        } catch (error) {
            console.error('Payment drop error:', error);
        }
    },

    async changeMonth(delta) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
        await UI.renderCalendar();
    },

    async goToSelectedDate() {
        const month = parseInt(document.getElementById('calendar-month-select').value);
        const year = parseInt(document.getElementById('calendar-year-select').value);
        this.currentCalendarDate = new Date(year, month, 1);
        await UI.renderCalendar();
    },

    async loadProjectDefaults(projectId) {
        const profile = await Store.getUserProfile();
        if (profile?.plan === 'starter') {
            this.openUpgradeModal();
            return;
        }

        if (!projectId || projectId === 'null') {
            // This is a new project, use importDefaults for both categories
            await this.importDefaults(null, 'shoot');
            await this.importDefaults(null, 'equipment');
            return;
        }

        const projects = await Store.getProjects();
        const project = projects.find(p => p.id === projectId);
        await Store.addDefaultsToProject(projectId, project?.shoot_date, null, true);
        UI.renderChecklist(projectId);
    },

    async fetchWeatherForProject() {
        const container = document.getElementById('project-weather-container');
        if (!container) return;

        // Check plan
        const profile = await Store.getUserProfile();
        if (profile?.plan === 'starter') {
            container.classList.remove('hidden');
            container.innerHTML = `
                <div style="background:var(--bg-main); border:1px dashed var(--primary-light); padding:12px; border-radius:var(--radius-md); display:flex; flex-direction:column; gap:8px; align-items:center; width: 100%;">
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-main); text-align:center;">תחזית מזג האוויר זמינה בחבילת Pro בלבד.</div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="app.openUpgradeModal()" style="padding:4px 12px; font-size:0.8rem;">לשדרוג לחבילת Pro</button>
                </div>
            `;
            return;
        }

        const location = document.getElementById('project-location').value;
        const dateStr = document.getElementById('project-date').value;

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
    },

    // =====================
    // Document Management
    // =====================
    _pendingDocFile: null,

    async handleDocumentUpload(event, type) {
        // File upload is a Professional feature
        const profile = await Store.getUserProfile();
        if (profile?.plan === 'starter') {
            event.target.value = '';
            this.openUpgradeModal();
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        // Validate size (3MB max)
        if (file.size > 3 * 1024 * 1024) {
            this.confirmAction('קובץ גדול מדי', 'הגודל המקסימלי המותר הוא 3MB.', null, true);
            event.target.value = '';
            return;
        }

        this._pendingDocFile = file;
        const detailsEl = document.getElementById(`${type}-doc-upload-details`);
        const fileInfoEl = document.getElementById(`${type}-doc-file-info`);
        
        const sizeKB = (file.size / 1024).toFixed(1);
        const sizeDisplay = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        
        fileInfoEl.innerHTML = `
            <i data-lucide="file" style="width:14px; height:14px;"></i>
            <strong>${file.name}</strong> (${sizeDisplay})
        `;
        detailsEl.classList.remove('hidden');
        detailsEl.style.display = 'flex';

        // Populate project dropdown for client modal
        if (type === 'client' && this.editingClientId) {
            Store.getProjects(this.editingClientId).then(projects => {
                const select = document.getElementById('client-doc-project-select');
                if (select) {
                    select.innerHTML = '<option value="">שיוך לפרויקט (אופציונלי)</option>' +
                        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                }
            });
        }

        if (window.lucide) lucide.createIcons();
    },

    cancelDocumentUpload(type) {
        this._pendingDocFile = null;
        const fileInput = document.getElementById(`${type}-doc-upload`);
        if (fileInput) fileInput.value = '';
        const detailsEl = document.getElementById(`${type}-doc-upload-details`);
        if (detailsEl) {
            detailsEl.classList.add('hidden');
            detailsEl.style.display = 'none';
        }
        const descInput = document.getElementById(`${type}-doc-description`);
        if (descInput) descInput.value = '';
    },

    async submitDocumentUpload(type) {
        // File upload is a Professional feature
        const profile = await Store.getUserProfile();
        if (profile?.plan === 'starter') {
            this.openUpgradeModal();
            return;
        }

        if (!this._pendingDocFile) return;

        const submitBtn = document.getElementById(`${type}-doc-submit-btn`);
        const originalBtnHtml = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner" style="width:14px; height:14px;"></span> מעלה...';

            let clientId, projectId, description;

            if (type === 'client') {
                clientId = this.editingClientId;
                projectId = document.getElementById('client-doc-project-select')?.value || null;
                description = document.getElementById('client-doc-description')?.value || '';
            } else {
                // For project upload, get client_id from the project or from the dropdown
                projectId = this.editingProjectId || null;
                const clientDropdown = document.getElementById('project-client');
                clientId = clientDropdown?.value || null;
                
                // If not from dropdown, try from stored project
                if (!clientId && projectId) {
                    const projects = await Store.getProjects();
                    const project = projects.find(p => String(p.id) === String(projectId));
                    clientId = project?.client_id;
                }
                description = document.getElementById('project-doc-description')?.value || '';
            }

            if (!clientId) {
                this.confirmAction('שגיאה', 'חיבור ללקוח נדרש להעלאת מסמך.', null, true);
                return;
            }

            await Store.uploadDocument(this._pendingDocFile, clientId, projectId, description);
            
            // Reset UI
            this.cancelDocumentUpload(type);

            // Refresh document lists
            if (type === 'client') {
                UI.renderDocuments(clientId, null);
            } else {
                UI.renderDocuments(clientId, projectId);
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.confirmAction('שגיאה בהעלאה', error.message || 'חלה שגיאה בהעלאת המסמך.', null, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    },

    async downloadDocument(filePath) {
        try {
            const url = await Store.getDocumentDownloadUrl(filePath);
            if (url) {
                window.open(url, '_blank');
            } else {
                this.confirmAction('שגיאה', 'לא ניתן ליצור קישור הורדה.', null, true);
            }
        } catch (error) {
            console.error('Download error:', error);
            this.confirmAction('שגיאה', 'חלה שגיאה בהורדת המסמך.', null, true);
        }
    },

    async deleteDocument(docId, clientId, projectId) {
        this.confirmAction('מחיקת מסמך', 'האם בטוח/ה שברצונך למחוק את המסמך? פעולה זו בלתי הפיכה.', async () => {
            try {
                await Store.deleteDocument(docId);
                // Refresh document lists
                if (projectId) {
                    UI.renderDocuments(clientId || null, projectId);
                } else if (clientId) {
                    UI.renderDocuments(clientId, null);
                }
            } catch (error) {
                console.error('Delete document error:', error);
                this.confirmAction('שגיאה', error.message || 'חלה שגיאה במחיקת המסמך.', null, true);
            }
        });
    },

    async changeDocumentProject(docId, newProjectId, clientId) {
        try {
            if (newProjectId && String(newProjectId).startsWith('local_')) {
                // Revert UI dropdown visually to the actual db state
                UI.renderDocuments(clientId, null);
                this.confirmAction('שים לב', 'לא ניתן לשייך מסמך לפרויקט שלא סונכרן לענן. לחץ על כפתור העריכה של הפרויקט ושמור אותו שוב ונסה שנית.', null, true);
                return;
            }

            await Store.updateDocumentProject(docId, newProjectId);
            // Document successfully updated. Refresh UI.
            UI.renderDocuments(clientId, null);
            
            const docs = await Store.getDocuments(clientId, null);
            const updatedDoc = docs.find(d => d.id === docId);
            if (updatedDoc) {
                const actionText = newProjectId ? `שיוך המסמך "${updatedDoc.file_name}" שונה/התווסף לפרויקט` : `שיוך פרויקט הוסר מהמסמך "${updatedDoc.file_name}"`;
                await Store.logAction('עדכון מסמך', actionText, 'document', docId);
            }
        } catch (error) {
            console.error('Update document project error:', error);
            this.confirmAction('שגיאה', error.message || 'חלה שגיאה בעדכון שיוך המסמך.', null, true);
            // Revert UI automatically by rendering from DB state
            UI.renderDocuments(clientId, null);
        }
    },

    viewAdmin() {
        this.navigate('admin');
    },

    async checkTrialStatus() {
        const profile = await Store.getUserProfile();
        
        // Only check if they are currently Pro AND it's a trial
        if (!profile || profile.plan !== 'professional' || !profile.is_trial || !profile.plan_updated_at) {
            return;
        }

        const upgradeDate = new Date(profile.plan_updated_at);
        const today = new Date();
        const diffTime = Math.abs(today - upgradeDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 14) {
            console.log(`Trial expired. Day: ${diffDays}. Downgrading user ${profile.user_id}`);
            
            // Downgrade to starter, mark trial as used, and set as NOT currently in trial
            await Store.updateUserPlan(profile.user_id, 'starter', { 
                is_trial: false, 
                has_used_trial: true 
            });

            // Inform the user
            this.confirmAction(
                'תקופת הניסיון הסתיימה',
                '14 ימי הניסיון שלך בחבילת Pro הסתיימו. הפיצ׳רים המתקדמים ננעלים, אך כל המידע ששמרת עדיין מחכה לך.<br><br><b>רוצה להמשיך לנהל את העסק כמו מקצוענית?</b>',
                () => { this.openUpgradeModal(); },
                true
            );
            
            // Re-render current view if already on something that depends on plan
            UI.renderSidebar();
            if (this.currentView === 'calendar') UI.renderCalendar();
            if (this.currentView === 'dashboard') UI.renderDashboard();
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
    // Auth.init will call app.init() once session is confirmed
});
