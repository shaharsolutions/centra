const UI = {
    async renderDashboard() {
        const projects = await Store.getProjects();
        const openJobs = projects.filter(p => ['closed', 'shooting', 'editing'].includes(p.status)).length;
        const waitingPayment = projects.filter(p => (p.payments?.total || 0) > (p.payments?.deposit || 0) && p.status !== 'delivered').length;
        const inEditing = projects.filter(p => p.status === 'editing').length;

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon-label"><i data-lucide="briefcase"></i> פרויקטים פתוחים</div>
                    <div class="value">${openJobs}</div>
                </div>
                <div class="stat-card">
                    <div class="icon-label"><i data-lucide="credit-card"></i> מחכים לתשלום</div>
                    <div class="value">${waitingPayment}</div>
                </div>
                <div class="stat-card">
                    <div class="icon-label"><i data-lucide="pen-tool"></i> בעריכה</div>
                    <div class="value">${inEditing}</div>
                </div>
            </div>

            <h2 class="section-title" style="margin-bottom: 20px;">פעולות מהירות</h2>
            <div class="quick-actions" style="display: flex; gap: 16px;">
                <button class="btn btn-secondary" onclick="app.openClientModal('לקוח חדש')">
                    <i data-lucide="user-plus"></i> הוספת לקוח
                </button>
                <button class="btn btn-primary" onclick="app.openProjectModal('פרויקט חדש')">
                    <i data-lucide="plus"></i> פרויקט חדש
                </button>
            </div>
        `;
        
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'הדשבורד שלך';
        document.getElementById('view-subtitle').innerText = 'מבט מהיר על Centra.';
        if (window.lucide) lucide.createIcons();
    },

    async renderClients() {
        const clients = await Store.getClients();
        let listHtml = '';

        if (clients.length === 0) {
            listHtml = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין לקוחות.</div>';
        } else {
            listHtml = `
                <div class="card-list">
                    ${clients.map(c => `
                        <div class="list-item">
                            <div class="item-info">
                                <span class="item-name">${c.name}</span>
                                <span class="item-sub">${c.phone} | ${this.getSourceLabel(c.source)}</span>
                            </div>
                            <div class="item-actions" style="display: flex; align-items: center; gap: 12px;">
                                <a href="https://wa.me/972${c.phone.replace(/^0/, '')}" target="_blank" class="btn btn-secondary btn-sm" style="color:#25D366;">
                                    <i data-lucide="message-circle" style="width:14px;"></i>
                                </a>
                                <button class="btn btn-secondary btn-sm" onclick="app.viewClient('${c.id}')">
                                    <i data-lucide="eye" style="width:14px;"></i>
                                    <span style="margin-right:4px;">צפייה</span>
                                </button>
                                <button class="btn btn-secondary btn-sm" style="color:#EF4444;" onclick="app.directDeleteClient('${c.id}')">
                                    <i data-lucide="trash-2" style="width:14px;"></i>
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="app.openProjectModal('פרויקט חדש', null, '${c.id}')">פרויקט חדש</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = listHtml;
        document.getElementById('view-title').innerText = 'ניהול לקוחות';
        document.getElementById('view-subtitle').innerText = 'כל הלקוחות במקום אחד.';
        if (window.lucide) lucide.createIcons();
    },

    async renderProjects() {
        const projects = await Store.getProjects();
        let listHtml = '';

        if (projects.length === 0) {
            listHtml = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין פרויקטים.</div>';
        } else {
            listHtml = `
                <div class="card-list">
                    ${projects.map(p => {
                        const status = Store.getStatusInfo(p.status);
                        const clientName = p.clients?.name || 'לקוח לא ידוע';
                        return `
                            <div class="list-item">
                                <div class="item-info">
                                    <span class="item-name">${p.name} <span style="font-weight:400; color:var(--text-muted); font-size:0.9rem;">(${clientName})</span></span>
                                    <div style="display:flex; gap:8px; align-items:center;">
                                        <span class="item-sub">${p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : 'ללא תאריך'}</span>
                                        ${p.drive_link ? `<a href="${p.drive_link}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:0.8rem; display:flex; align-items:center; gap:4px;"><i data-lucide="external-link" style="width:12px;"></i> גוגל דרייב</a>` : ''}
                                    </div>
                                </div>
                                <div class="item-actions" style="display: flex; align-items: center; gap: 12px;">
                                    <span class="badge ${status.class}">${status.label}</span>
                                    <button class="btn btn-secondary btn-sm" onclick="app.viewProject('${p.id}')">
                                        <i data-lucide="eye" style="width:14px;"></i>
                                        <span style="margin-right:4px;">צפייה</span>
                                    </button>
                                    <button class="btn btn-secondary btn-sm" style="color:#EF4444;" onclick="app.directDeleteProject('${p.id}')">
                                        <i data-lucide="trash-2" style="width:14px;"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = listHtml;
        document.getElementById('view-title').innerText = 'פרויקטים';
        document.getElementById('view-subtitle').innerText = 'ניהול עבודות פתוחות וסגורות.';
        if (window.lucide) lucide.createIcons();
    },

    async renderCalendar() {
        const projects = (await Store.getProjects())
            .filter(p => p.shoot_date)
            .sort((a, b) => new Date(a.shoot_date) - new Date(b.shoot_date));

        let html = '';
        if (projects.length === 0) {
            html = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">אין צילומים מתוכננים.</div>';
        } else {
            html = `
                <div class="card-list">
                    ${projects.map(p => `
                        <div class="list-item">
                            <div class="item-info">
                                <span class="item-name">${p.name}</span>
                                <span class="item-sub">${new Date(p.shoot_date).toLocaleDateString('he-IL')} | ${p.clients?.name}</span>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-secondary" onclick="app.editProject('${p.id}')">פרטים</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'לוח צילומים';
        document.getElementById('view-subtitle').innerText = 'כל התאריכים שלך.';
        if (window.lucide) lucide.createIcons();
    },

    async renderSettings() {
        const packages = await Store.getPackages();
        const html = `
            <div class="settings-container">
                <section class="settings-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h2 class="section-title" style="margin-bottom: 8px;">חבילות צילום</h2>
                            <p class="section-desc">הגדירי את החבילות שלך לשימוש מהיר.</p>
                        </div>
                        <button class="btn btn-primary" onclick="app.openPackageModal('חבילה חדשה')">
                            <i data-lucide="plus"></i> הוספת חבילה
                        </button>
                    </div>

                    <div class="card-list">
                        ${packages.length === 0 ? '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין חבילות.</div>' : packages.map(p => `
                            <div class="list-item">
                                <div class="item-info"><span class="item-name">${p.name}</span><span class="item-sub">${p.price} ₪</span></div>
                                <div class="item-actions" style="display:flex; gap:8px;">
                                    <button class="btn btn-secondary btn-sm" onclick="app.openPackageModal('עריכת חבילה', '${p.id}')"><i data-lucide="edit-2" style="width:14px;"></i></button>
                                    <button class="btn btn-secondary btn-sm" onclick="app.deletePackage('${p.id}')"><i data-lucide="trash-2" style="width:14px; color:#EF4444;"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            </div>
        `;
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'הגדרות';
        document.getElementById('view-subtitle').innerText = 'התאמת המערכת.';
        if (window.lucide) lucide.createIcons();
    },

    getSourceLabel(source) {
        const sources = {'whatsapp': 'וואטסאפ', 'instagram': 'אינסטגרם', 'recommendation': 'המלצה', 'other': 'אחר'};
        return sources[source] || source;
    },

    async populateClientsDropdown(selectedClientId = null) {
        const clients = await Store.getClients();
        const select = document.getElementById('project-client');
        if (select) {
            select.innerHTML = '<option value="">בחרי לקוח...</option>' + 
                clients.map(c => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${c.name} (${c.phone})</option>`).join('');
        }
    },

    async populatePackagesDatalist() {
        const packages = await Store.getPackages();
        const datalist = document.getElementById('packages-list');
        if (datalist) {
            datalist.innerHTML = packages.map(p => `<option value="${p.name}">${p.name} - ${p.price} ₪</option>`).join('');
        }
    },

    async renderNotes(clientId = null, projectId = null) {
        const notes = await Store.getNotes(clientId, projectId);
        const containerId = clientId ? 'client-notes-list' : 'project-notes-list';
        const container = document.getElementById(containerId);
        
        if (!container) return;

        if (notes.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">עדיין אין הערות.</div>';
            return;
        }

        container.innerHTML = notes.map(n => `
            <div class="note-item" id="note-${n.id}">
                <div class="note-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <span class="note-time">${new Date(n.created_at).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    <div class="note-actions" style="display:flex; gap:8px;">
                        <button class="btn-icon" onclick="app.editNote(event, '${n.id}', '${clientId ? 'client' : 'project'}')"><i data-lucide="edit-2" style="width:12px;"></i></button>
                        <button class="btn-icon" style="color:#EF4444;" onclick="app.deleteNote(event, '${n.id}', '${clientId ? 'client' : 'project'}')"><i data-lucide="trash-2" style="width:12px;"></i></button>
                    </div>
                </div>
                <div class="note-content" id="note-content-${n.id}">${n.content}</div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }
};

window.UI = UI;
