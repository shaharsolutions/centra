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

            <h2 class="section-title">פעולות מהירות</h2>
            <div class="quick-actions">
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
                            <div class="item-actions">
                                <a href="https://wa.me/972${c.phone.replace(/^0/, '')}" target="_blank" class="btn btn-secondary btn-sm whatsapp-btn">
                                    <i data-lucide="message-circle"></i>
                                </a>
                                <button class="btn btn-secondary btn-sm" onclick="app.viewClient('${c.id}')">
                                    <i data-lucide="eye"></i>
                                    <span>צפייה</span>
                                </button>
                                <button class="btn btn-secondary btn-sm delete-btn" onclick="app.directDeleteClient('${c.id}')">
                                    <i data-lucide="trash-2"></i>
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
        const statuses = Store.defaults.statuses;
        
        let boardHtml = `<div class="kanban-board">`;
        
        statuses.forEach(status => {
            const statusProjects = projects.filter(p => p.status === status.id);
            boardHtml += `
                <div class="kanban-column" data-status="${status.id}" ondragover="event.preventDefault()" ondrop="app.handleCardDrop(event, '${status.id}')">
                    <div class="kanban-column-header">
                        <div class="kanban-column-title">
                            <i data-lucide="${this.getStatusIcon(status.id)}" style="width:16px;"></i>
                            ${status.label}
                        </div>
                        <span class="kanban-column-count">${statusProjects.length}</span>
                    </div>
                    <div class="kanban-cards">
                        ${statusProjects.length === 0 ? 
                            '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:20px; border:1px dashed var(--border); border-radius:var(--radius-md);">אין פרויקטים</div>' : 
                            statusProjects.map(p => {
                                const clientName = p.clients?.name || 'לקוח לא ידוע';
                                const initial = clientName.charAt(0);
                                return `
                                    <div class="kanban-card" draggable="true" ondragstart="app.handleCardDragStart(event, '${p.id}')" onclick="app.viewProject('${p.id}')">
                                        <div class="kanban-card-title">${p.name}</div>
                                        <div class="kanban-card-client">${clientName}</div>
                                        <div class="kanban-card-footer">
                                            <div class="kanban-card-date">
                                                <i data-lucide="calendar" style="width:12px;"></i>
                                                ${p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'}) : '---'}
                                            </div>
                                            <div class="kanban-card-avatar">${initial}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                </div>
            `;
        });
        
        boardHtml += `</div>`;

        document.getElementById('view-container').innerHTML = boardHtml;
        document.getElementById('view-title').innerText = 'פרויקטים (לוח קנבן)';
        document.getElementById('view-subtitle').innerText = 'מעקב אחרי זרימת העבודה שלך.';
        if (window.lucide) lucide.createIcons();
    },

    async renderTasks() {
        const allItems = await Store.getAllTasks();
        
        // Filter out 'shoot' and 'equipment' categories - user requested
        const filteredTasks = allItems.filter(item => item.category !== 'shoot' && item.category !== 'equipment');
        
        // Sort: incomplete first, then by date 
        filteredTasks.sort((a, b) => (a.is_completed === b.is_completed) ? (new Date(b.created_at) - new Date(a.created_at)) : (a.is_completed ? 1 : -1));

        let html = `
            <div class="tasks-header" style="margin-bottom: 24px; background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border);">
                <div style="display:flex; gap:12px; align-items:center;">
                    <input type="text" id="new-global-task-input" placeholder="הוסיפי משימה כללית חדשה..." style="flex:1; padding:10px 16px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:0.95rem;">
                    <button class="btn btn-primary" onclick="app.addGlobalTask()">
                        <i data-lucide="plus"></i>
                        הוספה
                    </button>
                </div>
            </div>

            <div class="card-list">
                ${filteredTasks.length === 0 ? 
                    '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין משימות. הוסיפי משימה חדשה למעלה.</div>' : 
                    filteredTasks.map(t => {
                        const projectName = t.projects?.name || 'משימה כללית';
                        const isGlobal = !t.project_id;
                        const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : null;
                        
                        return `
                        <div class="list-item ${t.is_completed ? 'completed' : ''}" style="opacity: ${t.is_completed ? '0.6' : '1'}; cursor: pointer;" onclick="app.viewTask('${t.id}')">
                            <div style="display:flex; align-items:center; gap:16px; flex:1;">
                                <input type="checkbox" ${t.is_completed ? 'checked' : ''} onclick="event.stopPropagation(); app.toggleChecklistItem('${t.id}', this.checked); setTimeout(() => UI.renderTasks(), 500)" style="width:20px; height:20px;">
                                <div class="item-info">
                                    <span class="item-name" style="${t.is_completed ? 'text-decoration:line-through' : ''}; font-size:1rem;">${t.content}</span>
                                    <div style="display:flex; gap:8px; align-items:center;">
                                        <span class="item-sub" style="background: ${isGlobal ? '#F3E8FF' : '#E0F2FE'}; color: ${isGlobal ? '#7E22CE' : '#0369A1'}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                            ${isGlobal ? 'כללי' : `פרויקט: ${projectName}`}
                                        </span>
                                        ${dueDate ? `
                                            <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                                                <i data-lucide="calendar" style="width:12px;"></i>
                                                ${dueDate}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; gap:8px;">
                                ${!isGlobal ? `
                                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.viewProject('${t.project_id}')">
                                    <i data-lucide="eye" style="width:14px;"></i>
                                    צפייה
                                </button>
                                ` : ''}
                                <button class="btn btn-secondary btn-sm" style="color:#EF4444;" onclick="event.stopPropagation(); app.deleteChecklistItem('${t.id}'); setTimeout(() => UI.renderTasks(), 500)">
                                    <i data-lucide="trash-2" style="width:14px;"></i>
                                </button>
                            </div>
                        </div>
                    `}).join('')}
            </div>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'משימות ורשימות';
        document.getElementById('view-subtitle').innerText = 'משימות כלליות ומשימות מפרויקטים במקום אחד.';
        if (window.lucide) lucide.createIcons();
    },

    getStatusIcon(statusId) {
        const icons = {
            'new': 'star',
            'quote': 'file-text',
            'closed': 'calendar-check',
            'shooting': 'camera',
            'editing': 'pen-tool',
            'delivered': 'check-circle'
        };
        return icons[statusId] || 'circle';
    },

    async renderCalendar() {
        const projects = await Store.getProjects();
        const tasks = await Store.getAllTasks();
        const currentMonth = app.currentCalendarDate.getMonth();
        const currentYear = app.currentCalendarDate.getFullYear();

        const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

        let html = `
            <div class="calendar-wrapper" style="background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow); padding: 20px; border: 1px solid var(--border);">
                <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; direction: rtl;">
                    <button class="btn btn-secondary btn-sm" onclick="app.changeMonth(1)"><i data-lucide="chevron-right"></i></button>
                    <h2 style="font-size:1.25rem; font-weight:700;">${monthNames[currentMonth]} ${currentYear}</h2>
                    <button class="btn btn-secondary btn-sm" onclick="app.changeMonth(-1)"><i data-lucide="chevron-left"></i></button>
                </div>

                <div class="calendar-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
                    ${['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(day => `
                        <div style="background:var(--bg-main); padding:12px; text-align:center; font-weight:600; font-size:0.85rem; color:var(--text-muted);">${day}</div>
                    `).join('')}
                    
                    ${Array(firstDayOfMonth).fill(0).map(() => `<div style="background:white; height:120px;"></div>`).join('')}
                    
                    ${Array(daysInMonth).fill(0).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        const dayProjects = projects.filter(p => p.shoot_date === dateStr);
                        const dayTasks = tasks.filter(t => t.due_date === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                        return `
                        <div 
                            class="calendar-day" 
                            data-date="${dateStr}"
                            ondragover="event.preventDefault(); this.style.background='#EEF2FF';" 
                            ondragleave="this.style.background='${isToday ? '#F5F3FF' : 'white'}';"
                            ondrop="app.handleCalendarDrop(event, '${dateStr}')"
                            style="background: ${isToday ? '#F5F3FF' : 'white'}; min-height:120px; padding:8px; border: 0.5px solid var(--border); overflow-y: auto; transition: background 0.2s;"
                        >
                            <div style="font-size:0.85rem; font-weight:${isToday ? '700' : '500'}; color:${isToday ? 'var(--primary)' : 'var(--text-main)'}; margin-bottom:4px;">${day}</div>
                            <div class="calendar-events" style="display:flex; flex-direction:column; gap:4px;">
                                ${dayProjects.map(p => {
                                     const clientName = p.clients?.name || '';
                                     const displayName = clientName ? `${p.name} (${clientName})` : p.name;
                                     return `
                                     <div class="calendar-event project" 
                                         draggable="true" 
                                         ondragstart="event.dataTransfer.setData('projectId', '${p.id}')"
                                         onclick="app.viewProject('${p.id}')" 
                                         style="background:#E0F2FE; color:#0369A1; font-size:0.7rem; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" 
                                         title="פרויקט: ${displayName}"
                                     >
                                         <i data-lucide="camera" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-left:2px;"></i>
                                         ${displayName}
                                     </div>
                                 `}).join('')}
                                ${dayTasks.map(t => `
                                    <div class="calendar-event task" 
                                        draggable="true" 
                                        ondragstart="event.dataTransfer.setData('taskId', '${t.id}')"
                                        onclick="${t.project_id ? `app.viewProject('${t.project_id}')` : `app.viewTask('${t.id}')`}" 
                                        style="background:#F3E8FF; color:#7E22CE; font-size:0.7rem; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ${t.is_completed ? 'opacity:0.6; text-decoration:line-through' : ''}" 
                                        title="משימה: ${t.content}"
                                    >
                                        <i data-lucide="check-square" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-left:2px;"></i>
                                        ${t.content}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <style>
                .calendar-event:hover {
                    filter: brightness(0.95);
                    transform: translateY(-1px);
                }
                .calendar-event:active {
                    cursor: grabbing;
                }
                .calendar-day:hover {
                    border-color: var(--primary-light) !important;
                }
                @media (max-width: 768px) {
                    .calendar-grid div { height: 80px !important; min-height: 80px !important; }
                    .calendar-event { font-size: 0.6rem !important; }
                }
            </style>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'לוח שנה';
        document.getElementById('view-subtitle').innerText = 'כל הפרויקטים והמשימות שלך במקום אחד.';
        if (window.lucide) lucide.createIcons();
    },

    async renderShoots() {
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
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <span class="item-sub">${new Date(p.shoot_date).toLocaleDateString('he-IL')} | ${p.clients?.name}</span>
                                    ${p.drive_link ? `<a href="${p.drive_link}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:0.8rem; display:flex; align-items:center; gap:4px;"><i data-lucide="external-link" style="width:12px;"></i> גוגל דרייב</a>` : ''}
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-secondary" onclick="app.viewProject('${p.id}')">
                                    <i data-lucide="eye"></i>
                                    צפייה
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'לוח צילומים';
        document.getElementById('view-subtitle').innerText = 'רשימת כל ימי הצילום הקרובים.';
        if (window.lucide) lucide.createIcons();
    },

    async renderPayments() {
        const projects = await Store.getProjects();
        
        const paymentStatuses = [
            { id: 'not_paid', label: 'טרם שולם', color: '#FEE2E2', textColor: '#991B1B' },
            { id: 'deposit', label: 'מקדמה', color: '#FEF3C7', textColor: '#92400E' },
            { id: 'paid_full', label: 'תשלום מלא', color: '#D1FAE5', textColor: '#065F46' }
        ];

        const html = `
            <div class="kanban-board" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; padding: 20px 0;">
                ${paymentStatuses.map(status => {
                    const statusProjects = projects.filter(p => (p.payment_status || 'not_paid') === status.id);
                    return `
                        <div class="kanban-column" 
                            data-status="${status.id}"
                            ondragover="event.preventDefault(); this.style.background='#F9FAFB';"
                            ondragleave="this.style.background='white';"
                            ondrop="app.handlePaymentDrop(event, '${status.id}')"
                            style="background: white; border-radius: var(--radius-lg); border: 2px solid var(--border); padding: 16px; min-height: 400px; transition: background 0.2s;"
                        >
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">${status.label}</h3>
                                <span style="background: ${status.color}; color: ${status.textColor}; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                    ${statusProjects.length}
                                </span>
                            </div>
                            <div class="kanban-cards" style="display: flex; flex-direction: column; gap: 12px;">
                                ${statusProjects.map(p => `
                                    <div class="kanban-card"
                                        draggable="true"
                                        ondragstart="event.dataTransfer.setData('projectId', '${p.id}'); event.dataTransfer.setData('dragType', 'payment');"
                                        onclick="app.viewProject('${p.id}')"
                                        style="background: white; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; cursor: move; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                                        onmouseover="this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)';"
                                        onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)';"
                                    >
                                        <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-main);">${p.name}</div>
                                        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                                            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                                            ${p.clients?.name || 'ללא לקוח'}
                                        </div>
                                        ${p.shoot_date ? `
                                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                                                <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                                                ${new Date(p.shoot_date).toLocaleDateString('he-IL')}
                                            </div>
                                        ` : ''}
                                        ${p.payments && (p.payments.total || p.payments.total === 0) ? `
                                            <div style="margin-top: 8px;">
                                                ${p.payment_status === 'deposit' && p.payments.deposit ? `
                                                    <div style="font-size: 0.85rem; color: #059669; font-weight: 600;">
                                                        מקדמה: ₪${p.payments.deposit.toLocaleString()}
                                                    </div>
                                                    <div style="font-size: 0.85rem; color: #DC2626; margin-top: 4px; font-weight: 600;">
                                                        נותר: ₪${(p.payments.total - p.payments.deposit).toLocaleString()}
                                                    </div>
                                                ` : ''}
                                                ${p.payment_status === 'paid_full' ? `
                                                    <div style="font-size: 0.85rem; color: #059669; font-weight: 600;">
                                                        ₪${p.payments.total.toLocaleString()}
                                                    </div>
                                                ` : (p.payment_status !== 'deposit' ? `
                                                    <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">
                                                        ₪${p.payments.total.toLocaleString()}
                                                    </div>
                                                ` : '')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <style>
                .kanban-card:active {
                    cursor: grabbing;
                    opacity: 0.7;
                }
                @media (max-width: 768px) {
                    .kanban-board {
                        grid-template-columns: 1fr !important;
                    }
                }
            </style>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'גבייה';
        document.getElementById('view-subtitle').innerText = 'מעקב אחר סטטוס תשלומים של פרויקטים.';
        if (window.lucide) lucide.createIcons();
    },

    async renderSettings() {
        const packages = await Store.getPackages();
        const checklistDefaults = Store.getChecklistDefaults();
        const displayMode = Store.getChecklistDisplayMode();

        const html = `
            <div class="settings-container">
                <section class="settings-section">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">חבילות צילום</h2>
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
                                <div class="item-actions">
                                    <button class="btn btn-secondary btn-sm" onclick="app.openPackageModal('עריכת חבילה', '${p.id}')"><i data-lucide="edit-2"></i></button>
                                    <button class="btn btn-secondary btn-sm delete-btn" onclick="app.deletePackage('${p.id}')"><i data-lucide="trash-2"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section class="settings-section" style="margin-top: 40px;">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">תצוגת רשימות צ'ק-ליסט</h2>
                            <p class="section-desc">בחרי כיצד הרשימות יוצגו בפרויקטים.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 16px; display: flex; gap: 24px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="display-mode" value="checkbox" ${displayMode === 'checkbox' ? 'checked' : ''} onchange="app.updateChecklistDisplayMode(this.value)">
                            <span>תיבות סימון (Checkbox)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="radio" name="display-mode" value="bullet" ${displayMode === 'bullet' ? 'checked' : ''} onchange="app.updateChecklistDisplayMode(this.value)">
                            <span>רשימת בולטים (Bullets)</span>
                        </label>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: 40px;">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">ברירת מחדל: דברים שלא שוכחים</h2>
                            <p class="section-desc">משימות שיתווספו אוטומטית לכל פרויקט חדש.</p>
                        </div>
                    </div>
                    <div class="card-list">
                        ${checklistDefaults.shoot.map((item, idx) => `
                            <div class="list-item">
                                <span class="item-name">${item}</span>
                                <div class="item-actions">
                                    <button class="btn-icon" style="color:#EF4444;" onclick="app.deleteChecklistDefault('shoot', ${idx})"><i data-lucide="trash-2" style="width:16px;"></i></button>
                                </div>
                            </div>
                        `).join('')}
                        <div class="list-item" style="gap: 12px; padding: 12px 24px;">
                            <input type="text" id="new-default-shoot" placeholder="הוסיפי משימה חדשה..." style="flex:1;">
                            <button class="btn btn-primary btn-sm" onclick="app.addChecklistDefault('shoot')">הוספה</button>
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: 40px;">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">ברירת מחדל: ציוד ליום צילום</h2>
                            <p class="section-desc">ציוד שיתווסף אוטומטית לכל פרויקט חדש.</p>
                        </div>
                    </div>
                    <div class="card-list">
                        ${checklistDefaults.equipment.map((item, idx) => `
                            <div class="list-item">
                                <span class="item-name">${item}</span>
                                <div class="item-actions">
                                    <button class="btn-icon" style="color:#EF4444;" onclick="app.deleteChecklistDefault('equipment', ${idx})"><i data-lucide="trash-2" style="width:16px;"></i></button>
                                </div>
                            </div>
                        `).join('')}
                        <div class="list-item" style="gap: 12px; padding: 12px 24px;">
                            <input type="text" id="new-default-equipment" placeholder="הוסיפי ציוד חדש..." style="flex:1;">
                            <button class="btn btn-primary btn-sm" onclick="app.addChecklistDefault('equipment')">הוספה</button>
                        </div>
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
    },

    renderWeather(dailyData, cityName) {
        const container = document.getElementById('project-weather-container');
        if (!container || !dailyData) return;

        const code = dailyData.weathercode[0];
        const tempMax = Math.round(dailyData.temperature_2m_max[0]);
        const tempMin = Math.round(dailyData.temperature_2m_min[0]);
        
        const weatherMap = {
            0: { label: 'שמיים בהירים', icon: 'sun' },
            1: { label: 'בהיר לרוב', icon: 'cloud-sun' },
            2: { label: 'מעונן חלקית', icon: 'cloud' },
            3: { label: 'מעונן', icon: 'cloud' },
            45: { label: 'ערפל', icon: 'cloud-fog' },
            48: { label: 'ערפל כבד', icon: 'cloud-fog' },
            51: { label: 'טפטוף קל', icon: 'cloud-drizzle' },
            61: { label: 'גשם קל', icon: 'cloud-rain' },
            63: { label: 'גשם', icon: 'cloud-rain' },
            80: { label: 'ממטרים', icon: 'cloud-rain' },
            95: { label: 'סופות רעמים', icon: 'cloud-lightning' }
        };

        const weather = weatherMap[code] || { label: 'לא ידוע', icon: 'cloud' };

        container.innerHTML = `
            <div class="weather-main">
                <i data-lucide="${weather.icon}" class="weather-icon-img" style="color:var(--primary);"></i>
                <div class="weather-temp">${tempMax}°</div>
            </div>
            <div class="weather-details">
                <span class="weather-condition">${weather.label}</span>
                <span class="weather-meta">${cityName} | ${tempMin}° - ${tempMax}°</span>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    },

    async renderChecklist(projectId) {
        const items = await Store.getChecklistItems(projectId);
        const displayMode = Store.getChecklistDisplayMode();
        const shootItems = items.filter(i => i.category === 'shoot');
        const equipmentItems = items.filter(i => i.category === 'equipment');

        const renderItems = (itemList, category) => {
            if (itemList.length === 0) return '<div class="empty-list">אין פריטים ברשימה</div>';
            return itemList.map(item => `
                <div class="checklist-item ${item.is_completed ? 'completed' : ''} mode-${displayMode}" data-id="${item.id}">
                    ${displayMode === 'checkbox' ? 
                        `<input type="checkbox" ${item.is_completed ? 'checked' : ''} onclick="app.toggleChecklistItem('${item.id}', this.checked, '${projectId}')">` : 
                        `<i data-lucide="circle" style="width:8px; height:8px; fill:var(--primary); color:var(--primary);"></i>`
                    }
                    <span class="checklist-text" onclick="app.editChecklistItem('${item.id}', '${item.content}', '${category}', '${projectId}')">${item.content}</span>
                    <button type="button" class="btn-icon delete-btn" onclick="app.deleteChecklistItem('${item.id}', '${projectId}')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `).join('');
        };

        const shootContainer = document.getElementById('checklist-shoot');
        const equipmentContainer = document.getElementById('checklist-equipment');

        if (shootContainer) shootContainer.innerHTML = renderItems(shootItems, 'shoot');
        if (equipmentContainer) equipmentContainer.innerHTML = renderItems(equipmentItems, 'equipment');

        // Add a "Load Defaults" button if both lists are empty
        const checklistSection = document.querySelector('.project-checklist-section');
        if (checklistSection) {
            let loadBtn = document.getElementById('load-defaults-btn');
            if (items.length === 0) {
                if (!loadBtn) {
                    const btnHtml = `<button id="load-defaults-btn" class="btn btn-secondary btn-sm" style="width:100%; margin-top:10px;" onclick="app.loadProjectDefaults('${projectId}')">טעינת רשימות ברירת מחדל</button>`;
                    checklistSection.insertAdjacentHTML('beforeend', btnHtml);
                }
            } else if (loadBtn) {
                loadBtn.remove();
            }
        }

        if (window.lucide) lucide.createIcons();
    }
};

window.UI = UI;
