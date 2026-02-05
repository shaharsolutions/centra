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

    async renderClients(searchQuery = '', filterSource = 'all', sortBy = 'name-asc', filterCity = 'all') {
        const clients = await Store.getClients();
        
        // Get unique cities for filter
        const cities = [...new Set(clients.map(c => c.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));

        let filteredClients = clients.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (c.phone || '').includes(searchQuery);
            const matchesSource = filterSource === 'all' || c.source === filterSource;
            const matchesCity = filterCity === 'all' || c.city === filterCity;
            return matchesSearch && matchesSource && matchesCity;
        });

        // Sort
        filteredClients.sort((a, b) => {
            if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '', 'he');
            if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '', 'he');
            if (sortBy === 'city-asc') return (a.city || '').localeCompare(b.city || '', 'he');
            if (sortBy === 'city-desc') return (b.city || '').localeCompare(a.city || '', 'he');
            return 0;
        });

        let contentHtml = `
            <div class="filters-bar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; background: white; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); align-items: center;">
                <div style="flex: 1; min-width: 200px; position: relative;">
                    <i data-lucide="search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-muted); pointer-events: none;"></i>
                    <input type="text" id="client-search" placeholder="חיפוש לפי שם או טלפון..." 
                        value="${searchQuery}"
                        style="width: 100%; padding: 6px 32px 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem;"
                        oninput="UI.renderClients(this.value, document.getElementById('client-filter-source').value, document.getElementById('client-sort').value, document.getElementById('client-filter-city').value)"
                    >
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <select id="client-filter-source" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="UI.renderClients(document.getElementById('client-search').value, this.value, document.getElementById('client-sort').value, document.getElementById('client-filter-city').value)"
                    >
                        <option value="all">כל המקורות</option>
                        <option value="whatsapp" ${filterSource === 'whatsapp' ? 'selected' : ''}>וואטסאפ</option>
                        <option value="instagram" ${filterSource === 'instagram' ? 'selected' : ''}>אינסטגרם</option>
                        <option value="facebook" ${filterSource === 'facebook' ? 'selected' : ''}>פייסבוק</option>
                        <option value="recommendation" ${filterSource === 'recommendation' ? 'selected' : ''}>המלצה</option>
                        <option value="other" ${filterSource === 'other' ? 'selected' : ''}>אחר</option>
                    </select>

                    <select id="client-filter-city" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="UI.renderClients(document.getElementById('client-search').value, document.getElementById('client-filter-source').value, document.getElementById('client-sort').value, this.value)"
                    >
                        <option value="all">כל הערים</option>
                        ${cities.map(city => `<option value="${city}" ${filterCity === city ? 'selected' : ''}>${city}</option>`).join('')}
                    </select>

                    <select id="client-sort" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="UI.renderClients(document.getElementById('client-search').value, document.getElementById('client-filter-source').value, this.value, document.getElementById('client-filter-city').value)"
                    >
                        <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>שם (א-ת)</option>
                        <option value="name-desc" ${sortBy === 'name-desc' ? 'selected' : ''}>שם (ת-א)</option>
                        <option value="city-asc" ${sortBy === 'city-asc' ? 'selected' : ''}>עיר (א-ת)</option>
                        <option value="city-desc" ${sortBy === 'city-desc' ? 'selected' : ''}>עיר (ת-א)</option>
                    </select>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
                    ${filteredClients.length} לקוחות
                </div>
            </div>
        `;

        if (filteredClients.length === 0) {
            contentHtml += `<div style="padding: 40px; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border);">לא נמצאו לקוחות מתאימים.</div>`;
        } else {
            contentHtml += `
                <div class="card-list">
                    ${filteredClients.map(c => `
                        <div class="list-item">
                            <div class="item-info">
                                <span class="item-name">${c.name}</span>
                                <span class="item-sub">${c.phone} | ${this.getSourceLabel(c.source)}${c.city ? ' | ' + c.city : ''}</span>
                            </div>
                            <div class="item-actions">
                                <a href="https://wa.me/972${c.phone?.replace(/^0/, '')}" target="_blank" class="btn btn-secondary btn-sm whatsapp-btn" title="שליחת וואטסאפ" style="padding: 4px 8px;">
                                    <img src="assets/whatsapp.png" alt="WhatsApp" style="width: 16px; height: 16px;">
                                </a>
                                <button class="btn btn-secondary btn-sm" onclick="app.viewClient('${c.id}')" title="צפייה בלקוח" style="padding: 4px 8px;">
                                    <i data-lucide="eye"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm delete-btn" onclick="app.directDeleteClient('${c.id}')" title="מחיקת לקוח" style="padding: 4px 8px;">
                                    <i data-lucide="trash-2"></i>
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="app.openProjectModal('פרויקט חדש', null, '${c.id}')" title="פרויקט חדש" style="font-size: 0.8rem;">+ פרויקט</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = contentHtml;
        document.getElementById('view-title').innerText = 'ניהול לקוחות';
        document.getElementById('view-subtitle').innerText = 'כל הלקוחות במקום אחד.';
        
        // Focus search input and put cursor at end if it was focused
        const searchInput = document.getElementById('client-search');
        if (searchQuery) {
            searchInput.focus();
            searchInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }

        if (window.lucide) lucide.createIcons();
    },

    async renderProjects() {
        const projects = await Store.getProjects();
        const statuses = Store.defaults.statuses;
        
        let boardHtml = `<div class="kanban-board">`;
        
        statuses.forEach(status => {
            if (status.id === 'archived') return; // Don't show archive column in main board
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
                                            <div style="display:flex; align-items:center; gap:4px;">
                                                <select class="mini-status-select" onclick="event.stopPropagation()" onchange="app.updatePaymentStatus('${p.id}', this.value)" style="font-size: 0.7rem; padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text-main); cursor: pointer;">
                                                    <option value="not_paid" ${p.payment_status === 'not_paid' ? 'selected' : ''}>💸</option>
                                                    <option value="deposit" ${p.payment_status === 'deposit' ? 'selected' : ''}>💰</option>
                                                    <option value="paid_full" ${p.payment_status === 'paid_full' ? 'selected' : ''}>✅</option>
                                                </select>
                                                <div class="kanban-card-avatar">${initial}</div>
                                            </div>
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

    async renderArchive() {
        const projects = (await Store.getProjects()).filter(p => p.status === 'archived');
        
        let html = '';
        if (projects.length === 0) {
            html = '<div style="padding: 40px; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border);">אין פרויקטים בארכיון.</div>';
        } else {
            html = `
                <div class="card-list">
                    ${projects.map(p => {
                        const clientName = p.clients?.name || 'לקוח לא ידוע';
                        return `
                            <div class="list-item">
                                <div class="item-info">
                                    <span class="item-name">${p.name}</span>
                                    <span class="item-sub">${clientName} | ${p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : '---'}</span>
                                </div>
                                <div class="item-actions">
                                    <button class="btn btn-secondary btn-sm" onclick="app.viewProject('${p.id}')">
                                        <i data-lucide="eye"></i>
                                        צפייה
                                    </button>
                                    <button class="btn btn-secondary btn-sm" onclick="app.confirmAction('שחזור פרויקט', 'האם לשחזר את הפרויקט מהארכיון?', () => app.updateStatus('${p.id}', 'delivered'))">
                                        <i data-lucide="rotate-ccw"></i>
                                        שחזור
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'ארכיון פרויקטים';
        document.getElementById('view-subtitle').innerText = 'פרויקטים שהסתיימו ועברו לארכיון.';
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
                        const isStyling = t.category === 'styling' || t.content.includes('שיחת סטיילינג');
                        const dueDate = t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : null;
                        
                        let badgeBg = '#F3E8FF';
                        let badgeColor = '#7E22CE';
                        let badgeLabel = 'כללי';

                        if (!isGlobal) {
                            if (isStyling) {
                                badgeBg = '#D1FAE5';
                                badgeColor = '#059669';
                                badgeLabel = 'שיחת סטיילינג';
                            } else {
                                badgeBg = '#E0F2FE';
                                badgeColor = '#0369A1';
                                badgeLabel = `פרויקט: ${projectName}`;
                            }
                        }

                        return `
                        <div class="list-item ${t.is_completed ? 'completed' : ''}" style="opacity: ${t.is_completed ? '0.6' : '1'}; cursor: pointer;" onclick="app.viewTask('${t.id}')">
                            <div style="display:flex; align-items:center; gap:16px; flex:1;">
                                <input type="checkbox" ${t.is_completed ? 'checked' : ''} onclick="event.stopPropagation(); app.toggleChecklistItem('${t.id}', this.checked); setTimeout(() => UI.renderTasks(), 500)" style="width:20px; height:20px;">
                                <div class="item-info">
                                    <span class="item-name" style="${t.is_completed ? 'text-decoration:line-through' : ''}; font-size:1rem;">${t.content}</span>
                                    <div style="display:flex; gap:8px; align-items:center;">
                                        <span class="item-sub" style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                            ${badgeLabel}
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
            'delivered': 'check-circle',
            'published': 'share-2',
            'archived': 'archive'
        };
        return icons[statusId] || 'circle';
    },

    async renderCalendar() {
        const projects = await Store.getProjects();
        const tasks = await Store.getAllTasks();
        const currentMonth = app.currentCalendarDate.getMonth();
        const currentYear = app.currentCalendarDate.getFullYear();
        
        // Fetch Jewish Holidays
        const holidays = await Store.getJewishHolidays(currentYear, currentMonth + 1);

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
                        
                        const dayProjects = projects.filter(p => {
                            if (!p.shoot_date) return false;
                            const projectDate = String(p.shoot_date).split('T')[0];
                            return projectDate === dateStr && p.status !== 'archived';
                        });
                        
                        // De-duplicate tasks for this specific day
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
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const hasEvents = dayProjects.length > 0 || dayTasks.length > 0;
                        const hasShabbat = dayHolidays.some(h => h.category === 'candles' || h.category === 'havdalah');

                        return `
                        <div 
                            class="calendar-day ${hasEvents ? 'has-events' : ''}" 
                            data-date="${dateStr}"
                            onclick="app.showDayDetails('${dateStr}')"
                            ondragover="event.preventDefault(); this.style.background='#EEF2FF';" 
                            ondragleave="this.style.background='${isToday ? '#F5F3FF' : 'white'}';"
                            ondrop="app.handleCalendarDrop(event, '${dateStr}')"
                            style="background: ${isToday ? '#F5F3FF' : 'white'}; min-height:120px; padding:8px; border: 0.5px solid var(--border); overflow-y: auto; transition: background 0.2s; cursor: pointer;"
                        >
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <div style="font-size:0.85rem; font-weight:${isToday ? '700' : '500'}; color:${isToday ? 'var(--primary)' : 'var(--text-main)'};">${day}</div>
                                <div class="desktop-only" style="display:flex; gap:2px; flex-wrap:wrap; max-width:80%;">
                                    ${dayHolidays.filter(h => h.category === 'holiday').map(h => `
                                        <div style="font-size:0.65rem; color:#B45309; font-weight:600; background:#FEF3C7; padding:1px 4px; border-radius:30px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${h.hebrew}">${h.hebrew}</div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <!-- Mobile Indicators -->
                            <div class="mobile-only mobile-indicators" style="display:none; flex-wrap:wrap; gap:3px; justify-content:center; margin-top:4px;">
                                ${dayProjects.map(() => `<span class="dot dot-project"></span>`).join('')}
                                ${dayTasks.map(() => `<span class="dot dot-task"></span>`).join('')}
                                ${hasShabbat ? `<span class="dot dot-shabbat"></span>` : ''}
                            </div>
                            
                            <!-- Desktop Full Events -->
                            <div class="desktop-only">
                                <!-- Shabbat Times (Candles/Havdalah) -->
                                <div style="display:flex; flex-direction:column; gap:2px; margin-bottom:4px;">
                                    ${dayHolidays.filter(h => h.category === 'candles' || h.category === 'havdalah').map(h => {
                                        const time = new Date(h.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                                        const label = h.category === 'candles' ? 'כניסה:' : 'יציאה:';
                                        return '<div style="font-size:0.6rem; color:var(--text-muted); display:flex; align-items:center; gap:2px;"><i data-lucide="' + (h.category === 'candles' ? 'flame' : 'moon') + '" style="width:8px; height:8px;"></i><strong>' + label + ' ' + time + '</strong></div>';
                                    }).join('')}
                                </div>

                                <div class="calendar-events" style="display:flex; flex-direction:column; gap:4px;">
                                    ${dayProjects.map(p => {
                                         const clientName = p.clients?.name || '';
                                         const displayName = clientName ? p.name + ' (' + clientName + ')' : p.name;
                                         return '<div class="calendar-event project" draggable="true" ondragstart="event.dataTransfer.setData(\'projectId\', \'' + p.id + '\')" onclick="event.stopPropagation(); app.viewProject(\'' + p.id + '\')" style="background:#E0F2FE; color:#0369A1; font-size:0.7rem; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="פרויקט: ' + displayName + '"><i data-lucide="camera" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-left:2px;"></i>' + displayName + '</div>';
                                     }).join('')}
                                    ${dayTasks.map(t => {
                                        const isStyling = t.category === 'styling' || t.content.includes('שיחת סטיילינג');
                                        const bg = isStyling ? '#ECFDF5' : '#F3E8FF';
                                        const color = isStyling ? '#059669' : '#7E22CE';
                                        const clickAction = t.project_id ? "app.viewProject('" + t.project_id + "')" : "app.viewTask('" + t.id + "')";
                                        const completedStyle = t.is_completed ? 'opacity:0.6; text-decoration:line-through' : '';
                                        const iconName = isStyling ? 'phone' : 'check-square';
                                        const titleText = (isStyling ? 'שיחת סטיילינג' : 'משימה') + ': ' + t.content;
                                        
                                        return '<div class="calendar-event task" draggable="true" ondragstart="event.dataTransfer.setData(\'taskId\', \'' + t.id + '\')" onclick="event.stopPropagation(); ' + clickAction + '" style="background:' + bg + '; color:' + color + '; font-size:0.7rem; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; ' + completedStyle + '" title="' + titleText + '"><i data-lucide="' + iconName + '" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-left:2px;"></i>' + t.content + '</div>';
                                    }).join('')}
                                </div>
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
                .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    display: inline-block;
                }
                .dot-project { background: #0369A1; }
                .dot-task { background: #7E22CE; }
                .dot-shabbat { background: #F59E0B; }
                
                @media (max-width: 768px) {
                    .calendar-grid div.calendar-day { height: 60px !important; min-height: 60px !important; padding: 4px !important; }
                    .desktop-only { display: none !important; }
                    .mobile-only { display: flex !important; }
                    .calendar-day .mobile-indicators { display: flex !important; }
                }
                @media (min-width: 769px) {
                    .mobile-only { display: none !important; }
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
            .filter(p => p.shoot_date && p.status !== 'archived')
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
                                <select class="mini-status-select" onclick="event.stopPropagation()" onchange="app.updatePaymentStatus('${p.id}', this.value)" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text-main); cursor: pointer;">
                                    <option value="not_paid" ${p.payment_status === 'not_paid' ? 'selected' : ''}>💸 טרם שולם</option>
                                    <option value="deposit" ${p.payment_status === 'deposit' ? 'selected' : ''}>💰 מקדמה</option>
                                    <option value="paid_full" ${p.payment_status === 'paid_full' ? 'selected' : ''}>✅ שולם</option>
                                </select>
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
            <div class="kanban-board" style="display: flex; gap: 20px; padding: 20px 0; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
                ${paymentStatuses.map(status => {
                    const statusProjects = projects.filter(p => (p.payment_status || 'not_paid') === status.id);
                    return `
                        <div class="kanban-column" 
                            data-status="${status.id}"
                            ondragover="event.preventDefault(); this.style.background='#F9FAFB';"
                            ondragleave="this.style.background='white';"
                            ondrop="app.handlePaymentDrop(event, '${status.id}')"
                            style="background: white; border-radius: var(--radius-lg); border: 2px solid var(--border); padding: 16px; min-height: 400px; transition: background 0.2s; min-width: 300px; flex: 0 0 300px; scroll-snap-align: start;"
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
                                        <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-main); display: flex; justify-content: space-between; align-items: start;">
                                            ${p.name}
                                            <select class="mini-status-select" onclick="event.stopPropagation()" onchange="app.updatePaymentStatus('${p.id}', this.value)" style="font-size: 0.65rem; padding: 0 2px; border: none; background: transparent; cursor: pointer;">
                                                <option value="not_paid" ${p.payment_status === 'not_paid' ? 'selected' : ''}>💸</option>
                                                <option value="deposit" ${p.payment_status === 'deposit' ? 'selected' : ''}>💰</option>
                                                <option value="paid_full" ${p.payment_status === 'paid_full' ? 'selected' : ''}>✅</option>
                                            </select>
                                        </div>
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
        const currentCity = Store.getCalendarCity();

        const cities = [
            { id: 'IL-Jerusalem', name: 'ירושלים' },
            { id: 'IL-Tel+Aviv', name: 'תל אביב' },
            { id: 'IL-Haifa', name: 'חיפה' },
            { id: 'IL-Ashdod', name: 'אשדוד' },
            { id: 'IL-Beer+Sheva', name: 'באר שבע' },
            { id: 'IL-Netanya', name: 'נתניה' },
            { id: 'IL-Rishon+LeZion', name: 'ראשון לציון' },
            { id: 'IL-Petah+Tiqwa', name: 'פתח תקווה' },
            { id: 'IL-Rehovot', name: 'רחובות' },
            { id: 'IL-Ashqelon', name: 'אשקלון' },
            { id: 'IL-Bet+Shemesh', name: 'בית שמש' }
        ];

        const cityName = cities.find(c => c.id === currentCity)?.name || 'תל אביב';

        const html = `
            <div class="settings-container">
                <section class="settings-section">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">הגדרות אזוריות</h2>
                            <p class="section-desc">התאמת זמני השבת לפי המיקום שלך.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 200px;">
                                <i data-lucide="map-pin" style="color: var(--primary);"></i>
                                <div>
                                    <div style="font-weight: 600;">עיר לזמני שבת</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">השפעה על הדשבורד ולוח השנה.</div>
                                </div>
                            </div>
                            <select id="settings-city-select" onchange="app.updateCalendarCity(this.value)" style="flex: 1; max-width: 300px;">
                                ${cities.map(c => `<option value="${c.id}" ${c.id === currentCity ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </section>
                <section class="settings-section" style="margin-top: var(--category-spacing);">
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
                                <div class="item-info">
                                    <span class="item-name">${p.name}</span>
                                    <div class="item-meta" style="font-size: 0.8rem; color: var(--text-muted);">
                                        <span>${p.price} ₪</span>
                                        ${p.duration ? ` • <span>${p.duration}</span>` : ''}
                                    </div>
                                </div>
                                <div class="item-actions">
                                    <button class="btn btn-secondary btn-sm" onclick="app.openPackageModal('עריכת חבילה', '${p.id}')"><i data-lucide="edit-2"></i></button>
                                    <button class="btn btn-secondary btn-sm delete-btn" onclick="app.deletePackage('${p.id}')"><i data-lucide="trash-2"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section class="settings-section" style="margin-top: var(--category-spacing);">
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

                <section class="settings-section" style="margin-top: var(--category-spacing);">
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

                <section class="settings-section" style="margin-top: var(--category-spacing);">
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

    async renderLocations(filterRegion = 'all') {
        const locations = await Store.getLocations();
        const regions = {
            'center': 'מרכז',
            'north': 'צפון',
            'south': 'דרום',
            'jerusalem': 'ירושלים',
            'sharon': 'שרון'
        };

        const filteredLocations = filterRegion === 'all' 
            ? locations 
            : locations.filter(l => l.region === filterRegion);

        let html = `
            <div class="filters-bar" style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; flex: 1;">
                    <button class="btn ${filterRegion === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="app.filterLocations('all')">הכל</button>
                    ${Object.entries(regions).map(([id, label]) => `
                        <button class="btn ${filterRegion === id ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="app.filterLocations('${id}')">${label}</button>
                    `).join('')}
                </div>
                <button class="btn btn-primary btn-sm" onclick="app.openLocationModal()" style="flex-shrink: 0;">
                    <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
                    לוקיישן חדש
                </button>
            </div>

            <div class="locations-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                ${filteredLocations.map(loc => `
                    <div class="location-card" style="background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border); transition: transform 0.2s; display: flex; flex-direction: column;">
                        <div style="padding: 20px; flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <h3 style="font-size: 1.1rem; font-weight: 700;">${loc.title}</h3>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
                                    <span class="badge" style="background: var(--bg-main); color: var(--text-main); font-size: 0.65rem; border: 1px solid var(--border);">${regions[loc.region]}</span>
                                    <span class="badge" style="background: var(--primary-light); color: var(--primary); font-size: 0.65rem;">
                                        ${loc.type === 'urban' ? 'אורבני' : loc.type === 'nature' ? 'טבע' : loc.type === 'beach' ? 'ים' : loc.type === 'village' ? 'כפרי' : loc.type}
                                    </span>
                                </div>
                            </div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">${loc.description}</p>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
                                <button class="btn btn-secondary btn-sm" style="gap: 8px; justify-content: center;" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(loc.title + ' צילומים')}', '_blank')">
                                    <i data-lucide="search" style="width: 14px; height: 14px;"></i>
                                    חיפוש תמונות
                                </button>
                                <button class="btn btn-secondary btn-sm" style="gap: 8px; justify-content: center;" onclick="window.open('https://www.google.com/maps/search/${encodeURIComponent(loc.title)}', '_blank')">
                                    <i data-lucide="map" style="width: 14px; height: 14px;"></i>
                                    ניווט למקום
                                </button>
                                ${(!loc.id || !String(loc.id).startsWith('default-')) ? `
                                    <button class="btn btn-secondary btn-sm" style="gap: 8px; justify-content: center;" onclick="app.openLocationModal('${loc.id}')">
                                        <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                                        עריכה
                                    </button>
                                    <button class="btn btn-secondary btn-sm delete-btn" style="gap: 8px; justify-content: center; color: #EF4444;" onclick="app.deleteLocation('${loc.id}')">
                                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                                        מחיקה
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <style>
                .location-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                }
            </style>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'לוקיישנים לצילומים';
        document.getElementById('view-subtitle').innerText = 'גלי לוקיישנים מומלצים לצילומים לפי אזורים בארץ.';
        if (window.lucide) lucide.createIcons();
    },

    getSourceLabel(source) {
        const sources = {'whatsapp': 'וואטסאפ', 'instagram': 'אינסטגרם', 'facebook': 'פייסבוק', 'recommendation': 'המלצה', 'other': 'אחר'};
        return sources[source] || source;
    },

    async populateClientsDropdown(selectedClientId = null) {
        const clients = await Store.getClients();
        const select = document.getElementById('project-client');
        if (select) {
            select.innerHTML = '<option value="">בחרי לקוח...</option>' + 
                clients.map(c => `<option value="${c.id}" ${String(c.id) === String(selectedClientId) ? 'selected' : ''}>${c.name} (${c.phone})</option>`).join('');
        }
    },

    async populatePackagesDatalist() {
        const packages = await Store.getPackages();
        const datalist = document.getElementById('packages-list');
        if (datalist) {
            datalist.innerHTML = packages.map(p => `<option value="${p.name}">${p.name} - ${p.price} ₪</option>`).join('');
        }
    },

    async renderClientProjects(clientId) {
        const container = document.getElementById('client-projects-list');
        if (!container) return;
        
        const projects = await Store.getProjects(clientId);
        
        if (projects.length === 0) {
            container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px; border:1px dashed var(--border); border-radius:var(--radius-md);">עדיין אין פרויקטים ללקוח זה.</div>';
            return;
        }

        container.innerHTML = projects.map(p => {
            const statusObj = Store.defaults.statuses.find(s => s.id === p.status);
            return `
                <div class="list-item" style="padding: 10px 16px; cursor: pointer; border: 1px solid var(--border); border-radius: var(--radius-md); transition: all 0.2s;" onclick="app.viewProject('${p.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem;">${p.name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                                ${p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : 'ללא תאריך'}
                            </div>
                        </div>
                        <span class="badge ${statusObj?.class || ''}" style="font-size: 0.7rem;">${statusObj?.label || p.status}</span>
                    </div>
                </div>
            `;
        }).join('');
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

    async renderReports() {
        const projects = await Store.getProjects();
        const clients = await Store.getClients();
        
        // Metrics calculation
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status !== 'archived').length;
        
        // Revenue calculation
        let totalRevenue = 0;
        let collectedRevenue = 0;
        let pendingRevenue = 0;
        
        projects.forEach(p => {
            const total = parseFloat(p.payments?.total) || 0;
            const deposit = parseFloat(p.payments?.deposit) || 0;
            
            totalRevenue += total;
            collectedRevenue += deposit;
            
            if (p.payment_status === 'paid') {
                collectedRevenue += (total - deposit);
            } else {
                pendingRevenue += (total - deposit);
            }
        });

        // Projects by status distribution
        const statusCounts = {};
        projects.forEach(p => {
            statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        });

        // Monthly distribution (last 12 months)
        const monthlyData = {};
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { count: 0, revenue: 0 };
        }

        projects.forEach(p => {
            if (!p.shoot_date) return;
            const d = new Date(p.shoot_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].count++;
                monthlyData[key].revenue += (parseFloat(p.payments?.total) || 0);
            }
        });

        const sortedMonths = Object.keys(monthlyData).sort();

        const html = `
            <div class="reports-container" style="display: flex; flex-direction: column; gap: 24px;">
                <!-- Key Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                    <div class="report-card" style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--primary);">
                            <i data-lucide="briefcase"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">פרויקטים פעילים</h3>
                        </div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--text-main);">${activeProjects}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">מתוך ${totalProjects} פרויקטים סה"כ</div>
                    </div>

                    <div class="report-card" style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #10B981;">
                            <i data-lucide="trending-up"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">הכנסות שנגבו</h3>
                        </div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--text-main);">₪${collectedRevenue.toLocaleString()}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">מתוך צפי של ₪${totalRevenue.toLocaleString()}</div>
                    </div>

                    <div class="report-card" style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #F59E0B;">
                            <i data-lucide="clock"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">חובות פתוחים</h3>
                        </div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--text-main);">₪${pendingRevenue.toLocaleString()}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">תשלומים שטרם הוסדרו</div>
                    </div>
                </div>

                <!-- Detailed Charts Section -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
                    <!-- Status Distribution -->
                    <div style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">סטטוס פרויקטים</h3>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            ${Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).map(([status, count]) => {
                                const statusInfo = Store.getStatusInfo(status);
                                const percentage = totalProjects > 0 ? (count / totalProjects * 100).toFixed(0) : 0;
                                return `
                                    <div style="display: flex; flex-direction: column; gap: 6px;">
                                        <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                            <span style="font-weight: 500;">${statusInfo.label}</span>
                                            <span style="color: var(--text-muted);">${count} (${percentage}%)</span>
                                        </div>
                                        <div style="height: 8px; background: var(--bg-main); border-radius: 4px; overflow: hidden;">
                                            <div style="height: 100%; width: ${percentage}%; background: ${statusInfo.color};"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Monthly Activity -->
                    <div style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">פעילות חודשית (פרויקטים)</h3>
                        <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 160px; gap: 8px; margin-top: 20px;">
                            ${sortedMonths.map(month => {
                                const data = monthlyData[month];
                                const maxCount = Math.max(...Object.values(monthlyData).map(d => d.count), 1);
                                const heightPercentage = (data.count / maxCount * 100).toFixed(0);
                                const monthLabel = month.split('-')[1];
                                return `
                                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%;">
                                        <div style="flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center;">
                                            <div title="${month}: ${data.count} פרויקטים" style="width: 100%; height: ${heightPercentage}%; background: var(--primary-light); border-radius: 4px 4px 0 0; min-height: ${data.count > 0 ? '4px' : '0'};"></div>
                                        </div>
                                        <span style="font-size: 0.75rem; color: var(--text-muted);">${monthLabel}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Income by Month Table -->
                <div style="background: white; padding: 24px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                    <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">פירוט הכנסות חודשי</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: right;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border);">
                                    <th style="padding: 12px; font-weight: 600; color: var(--text-muted);">חודש</th>
                                    <th style="padding: 12px; font-weight: 600; color: var(--text-muted);">פרויקטים</th>
                                    <th style="padding: 12px; font-weight: 600; color: var(--text-muted);">הכנסה חזויה</th>
                                    <th style="padding: 12px; font-weight: 600; color: var(--text-muted);">ממוצע לפרויקט</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedMonths.reverse().map(month => {
                                    const data = monthlyData[month];
                                    if (data.count === 0 && data.revenue === 0) return '';
                                    const [y, m] = month.split('-');
                                    const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
                                    const avg = data.count > 0 ? (data.revenue / data.count).toFixed(0) : 0;
                                    return `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 12px; font-weight: 500;">${monthNames[parseInt(m)-1]} ${y}</td>
                                            <td style="padding: 12px;">${data.count}</td>
                                            <td style="padding: 12px; font-weight: 600; color: #10B981;">₪${data.revenue.toLocaleString()}</td>
                                            <td style="padding: 12px; color: var(--text-muted);">₪${parseInt(avg).toLocaleString()}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'דוחות ותובנות';
        document.getElementById('view-subtitle').innerText = 'מבט על הביצועים העסקיים שלך.';
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
        let items = [];
        if (projectId) {
            items = await Store.getChecklistItems(projectId);
        } else {
            const defaults = Store.getChecklistDefaults();
            items = [
                ...defaults.shoot.map(c => ({ id: null, content: c, category: 'shoot', is_completed: false })),
                ...defaults.equipment.map(c => ({ id: null, content: c, category: 'equipment', is_completed: false }))
            ];
        }
        
        const displayMode = Store.getChecklistDisplayMode();
        const shootItems = items.filter(i => i.category === 'shoot' || i.category === 'styling');
        const equipmentItems = items.filter(i => i.category === 'equipment');

        const renderItems = (itemList, category) => {
            if (itemList.length === 0) return '<div class="empty-list">אין פריטים ברשימה</div>';
            return itemList.map(item => `
                <div class="checklist-item ${item.is_completed ? 'completed' : ''} mode-${displayMode}" data-id="${item.id}">
                    ${displayMode === 'checkbox' ? 
                        `<input type="checkbox" ${item.is_completed ? 'checked' : ''} ${!item.id ? 'disabled' : ''} onclick="app.toggleChecklistItem('${item.id}', this.checked, '${projectId}')">` : 
                        `<i data-lucide="circle" style="width:8px; height:8px; fill:var(--primary); color:var(--primary);"></i>`
                    }
                    <span class="checklist-text" ${item.id ? `onclick="app.editChecklistItem('${item.id}', '${item.content}', '${category}', '${projectId}')"` : ''}>${item.content}</span>
                    ${item.id ? `
                        <button type="button" class="btn-icon delete-btn" onclick="app.deleteChecklistItem('${item.id}', '${projectId}')">
                            <i data-lucide="x"></i>
                        </button>
                    ` : ''}
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
