const UI = {
async renderDashboard() {
    const [projects, tasks] = await Promise.all([
        Store.getProjects(),
        Store.getAllTasks()
    ]);
    
    const openProjectsList = projects.filter(p => ['closed', 'shooting', 'editing'].includes(p.status));
    const waitingPaymentList = projects.filter(p => (p.payments?.total || 0) > (p.payments?.deposit || 0) && p.status !== 'delivered');
    const inEditingList = projects.filter(p => p.status === 'editing');
    
    // Calculate total waiting amount (balance)
    const totalWaitingAmount = waitingPaymentList.reduce((sum, p) => sum + ((p.payments?.total || 0) - (p.payments?.deposit || 0)), 0);

    // Calculate Week View
    const today = new Date();
    today.setHours(0,0,0,0);
    const startOfWeek = new Date(today);
    // Start of week (Sunday in Israel)
    startOfWeek.setDate(today.getDate() - today.getDay() + (app.dashboardWeekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDays.push(d);
    }

    const startOfWeekStr = weekDays[0].toLocaleDateString('he-IL', {day:'numeric', month:'numeric'});
    const endOfWeekStr = weekDays[6].toLocaleDateString('he-IL', {day:'numeric', month:'numeric'});

    // Filter tasks for the week
    const displayMode = Store.getChecklistDisplayMode();
    const weekTasks = tasks.filter(t => {
        const hasDueDate = !!(t.due_date || t.dueDate);
        // If bullet mode, only show if it has a due date or it's a global task
        if (displayMode === 'bullet' && (t.project_id || t.projectId) && !hasDueDate) return false;
        
        const d = new Date(t.due_date || t.dueDate);
        return d >= weekDays[0] && d <= new Date(weekDays[6].getTime() + 86400000);
    }).sort((a,b) => (a.is_completed === b.is_completed) ? 0 : (a.is_completed ? 1 : -1));

    // Filter overdue tasks
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0,0,0,0);
    
    const overdueTasks = tasks.filter(t => {
        if (t.is_completed) return false;
        const dueDate = t.due_date || t.dueDate;
        if (!dueDate) return false;
        const d = new Date(dueDate);
        d.setHours(0,0,0,0);
        return d < todayAtMidnight;
    }).sort((a, b) => new Date(a.due_date || a.dueDate) - new Date(b.due_date || b.dueDate));

    const renderStatProjects = (list, isPaymentList = false) => {
        if (list.length === 0) return '<div style="padding:10px; font-size:0.85rem; color:var(--text-muted); text-align:center;">אין פרויקטים</div>';
        return list.map(p => {
            const balance = (p.payments?.total || 0) - (p.payments?.deposit || 0);
            return `
            <div onclick="event.stopPropagation(); app.viewProject('${p.id}')" style="padding:10px; border-bottom:1px solid var(--border); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" class="stat-project-row">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:600;">${p.name}${p.clients?.name ? ` (${p.clients.name})` : ''}</span>
                    ${isPaymentList && balance > 0 ? `<span style="font-size:0.75rem; color:var(--text-muted);">יתרה לתשלום: ₪${balance.toLocaleString()}</span>` : ''}
                </div>
                <span class="badge ${Store.defaults.statuses.find(s => s.id === p.status)?.class || ''}" style="font-size:0.7rem;">${Store.defaults.statuses.find(s => s.id === p.status)?.label || p.status}</span>
            </div>
            `;
        }).join('');
    };

    // Build weekly clients contact section
    const formatPhoneForLinks = (phone) => {
        if (!phone) return '';
        let clean = phone.replace(/[^0-9+]/g, '');
        if (clean.startsWith('0')) clean = '972' + clean.slice(1);
        if (!clean.startsWith('+')) clean = '+' + clean;
        return clean;
    };

    // Build date strings for the week (same approach as the calendar grid)
    const weekDateStrings = weekDays.map(day => {
        const y = day.getFullYear();
        const m = String(day.getMonth() + 1).padStart(2, '0');
        const d = String(day.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });

    // Find projects with shoot dates in this week
    const weekProjectsForContacts = projects.filter(p => {
        if (!p.shoot_date || p.status === 'archived') return false;
        const shootDateStr = p.shoot_date.split('T')[0];
        return weekDateStrings.includes(shootDateStr);
    });

    // Also find projects that have TASKS due this week
    const weekTaskProjectIds = new Set();
    const weekFilteredTasks = tasks.filter(t => {
        // If bullet mode, don't count project tasks for "Weekly Clients" logic
        if (displayMode === 'bullet' && (t.project_id || t.projectId)) return false;
        
        const tDate = String(t.due_date || t.dueDate || '').split('T')[0];
        return weekDateStrings.includes(tDate);
    });
    weekFilteredTasks.forEach(t => {
        const pid = t.project_id || t.projectId;
        if (pid) weekTaskProjectIds.add(String(pid));
    });

    // Merge: projects with shoot dates this week + projects with tasks this week
    const allWeekProjectIds = new Set();
    weekProjectsForContacts.forEach(p => allWeekProjectIds.add(String(p.id)));
    weekTaskProjectIds.forEach(pid => allWeekProjectIds.add(pid));

    let weeklyClientsHtml = '';
    if (allWeekProjectIds.size > 0) {
        const allClients = await Store.getClients();
        const clientMap = {};
        allClients.forEach(c => { clientMap[String(c.id)] = c; });

        // Build a map of all projects for quick lookup
        const projectMap = {};
        projects.forEach(p => { projectMap[String(p.id)] = p; });

        const weekClientMap = {};
        allWeekProjectIds.forEach(pid => {
            const project = projectMap[pid];
            if (!project || !project.client_id) return;
            const client = clientMap[String(project.client_id)];
            if (!client) return;
            const cid = String(project.client_id);
            if (!weekClientMap[cid]) {
                weekClientMap[cid] = {
                    name: client.name,
                    phone: client.phone || '',
                    projects: []
                };
            }
            if (!weekClientMap[cid].projects.includes(project.name)) {
                weekClientMap[cid].projects.push(project.name);
            }
        });

        const weekClients = Object.values(weekClientMap);
        if (weekClients.length > 0) {
            weeklyClientsHtml = `
                <div>
                    <h3 class="section-title" style="font-size:1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="contact" style="width:18px;"></i> לקוחות השבוע
                    </h3>
                    <div style="background:white; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow-sm); overflow:hidden;">
                        ${weekClients.map(c => {
                            const intlPhone = formatPhoneForLinks(c.phone);
                            const waLink = intlPhone ? 'https://wa.me/' + intlPhone.replace('+', '') : '';
                            const telLink = c.phone ? 'tel:' + c.phone : '';
                            return `
                                <div style="padding:12px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-weight:600; font-size:0.95rem; color:var(--text-main);">${c.name}</div>
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.projects.join(', ')}</div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                                        ${telLink ? `
                                            <a href="${telLink}" onclick="event.stopPropagation()" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:#DBEAFE; color:#2563EB; text-decoration:none; transition: transform 0.15s ease;" title="התקשר ל${c.name}">
                                                <i data-lucide="phone" style="width:16px; height:16px;"></i>
                                            </a>
                                        ` : ''}
                                        ${waLink ? `
                                            <a href="${waLink}" target="_blank" onclick="event.stopPropagation()" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:#D1FAE5; text-decoration:none; transition: transform 0.15s ease;" title="שלח הודעת WhatsApp ל${c.name}">
                                                <img src="assets/whatsapp.png" alt="WhatsApp" style="width:20px; height:20px;">
                                            </a>
                                        ` : ''}
                                        ${!c.phone ? '<span style="font-size:0.75rem; color:var(--text-muted);">אין טלפון</span>' : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }

    let overdueTasksHtml = '';
    if (overdueTasks.length > 0) {
        overdueTasksHtml = `
            <div style="margin-bottom: 32px;">
                <h3 class="section-title" style="font-size:1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px; color: #EF4444;">
                    <i data-lucide="alert-circle" style="width:18px;"></i> משימות באיחור
                </h3>
                <div style="background:white; border-radius:var(--radius-lg); border:1px solid #FEE2E2; box-shadow:var(--shadow-sm); overflow:hidden;">
                    ${overdueTasks.map(t => `
                        <div class="dashboard-task-item" style="padding:12px 16px; border-bottom:1px solid #FEE2E2; display:flex; align-items:center; gap:12px;">
                            <input type="checkbox" onclick="app.toggleChecklistItem('${t.id}', this.checked, null, true)" style="width:16px; height:16px; flex-shrink:0;">
                            <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:0.9rem; font-weight:600; cursor:pointer;" onclick="app.viewTask('${t.id}')">${t.content}</span>
                                ${t.projects?.name ? `<span style="font-size:0.75rem; color:var(--text-muted);">פרויקט: ${t.projects.name}</span>` : ''}
                            </div>
                            <span style="font-size:0.75rem; color:#EF4444; font-weight:700; flex-shrink:0;">
                                ${new Date(t.due_date || t.dueDate).toLocaleDateString('he-IL', {day:'numeric', month:'numeric'})}
                            </span>
                            <button class="btn-icon" style="color:#EF4444; flex-shrink:0;" onclick="event.stopPropagation(); app.deleteChecklistItem('${t.id}')">
                                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let html = `
        <!-- Stats Summary -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 class="section-title" style="margin:0;">סיכום נתונים</h2>
            <button class="btn btn-secondary btn-sm" onclick="app.toggleStatExpansion()" style="display:flex; align-items:center; gap:6px; border-radius:30px; padding: 6px 14px;">
                <i data-lucide="${app.isStatsExpanded ? 'chevron-up' : 'chevron-down'}" style="width:14px; height:14px;"></i>
                <span style="font-weight:600; font-size:0.8rem;">${app.isStatsExpanded ? 'הסתר פירוט' : 'הצג פירוט'}</span>
            </button>
        </div>
        <div class="stats-grid">
            <div class="stat-card ${app.isStatsExpanded ? 'expanded' : ''}" onclick="app.toggleStatExpansion()" style="cursor:pointer;">
                <div class="stat-card-header">
                    <div class="icon-label"><i data-lucide="briefcase"></i> פרויקטים פתוחים</div>
                    <div class="value">${openProjectsList.length}</div>
                </div>
                ${app.isStatsExpanded ? `
                    <div class="stat-expansion" style="margin-top:16px; border-top:1px solid var(--border); background:rgba(0,0,0,0.02); border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                        ${renderStatProjects(openProjectsList)}
                    </div>
                ` : ''}
            </div>

            <div class="stat-card ${app.isStatsExpanded ? 'expanded' : ''}" onclick="app.toggleStatExpansion()" style="cursor:pointer;">
                <div class="stat-card-header">
                    <div class="icon-label">
                        <i data-lucide="credit-card"></i> 
                        <span>מחכים לתשלום</span>
                        ${totalWaitingAmount > 0 ? `
                            <span style="background: #FFF1F2; color: #E11D48; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; border: 1px solid #FFE4E6; margin-right: 4px; display: inline-flex; align-items: center; vertical-align: middle;">
                                ₪${totalWaitingAmount.toLocaleString()}
                            </span>
                        ` : ''}
                    </div>
                    <div class="value">${waitingPaymentList.length}</div>
                </div>
                ${app.isStatsExpanded ? `
                    <div class="stat-expansion" style="margin-top:16px; border-top:1px solid var(--border); background:rgba(0,0,0,0.02); border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                        ${renderStatProjects(waitingPaymentList, true)}
                    </div>
                ` : ''}
            </div>

            <div class="stat-card ${app.isStatsExpanded ? 'expanded' : ''}" onclick="app.toggleStatExpansion()" style="cursor:pointer;">
                <div class="stat-card-header">
                    <div class="icon-label"><i data-lucide="pen-tool"></i> בעריכה</div>
                    <div class="value">${inEditingList.length}</div>
                </div>
                ${app.isStatsExpanded ? `
                    <div class="stat-expansion" style="margin-top:16px; border-top:1px solid var(--border); background:rgba(0,0,0,0.02); border-radius: 0 0 var(--radius-lg) var(--radius-lg);">
                        ${renderStatProjects(inEditingList)}
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Weekly Calendar -->
        <div class="dashboard-section" style="margin-top: 32px;">
            <div class="section-header" style="margin-bottom:16px;">
                <h2 class="section-title">לו"ז שבועי: ${startOfWeekStr} - ${endOfWeekStr}</h2>
                <div class="dashboard-nav-btns">
                    <button class="btn btn-secondary btn-sm" onclick="app.changeDashboardWeek(-1)" title="השבוע הקודם" style="display:flex; align-items:center; gap:4px;">
                        <i data-lucide="chevron-right"></i>
                        <span class="desktop-hide">השבוע הקודם</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.goToTodayDashboard()" style="font-weight:600; font-size:0.85rem; padding: 0 12px; height: 34px; display:flex; align-items:center;">היום</button>
                    <button class="btn btn-secondary btn-sm" onclick="app.changeDashboardWeek(1)" title="השבוע הבא" style="display:flex; align-items:center; gap:4px;">
                        <span class="desktop-hide">השבוע הבא</span>
                        <i data-lucide="chevron-left"></i>
                    </button>
                </div>
            </div>
            
            <div style="position: relative;">
                <div class="mobile-scroll-hint">
                    <i data-lucide="chevrons-left" style="width:16px; height:16px;"></i>
                    <span>${Store.getUserGender() === 'female' ? 'גללי' : 'גלול'} לימים הבאים</span>
                </div>
                <div class="weekly-calendar-grid" 
                    onscroll="const hint = this.parentElement.querySelector('.mobile-scroll-hint'); if(hint) hint.classList.add('hidden');"
                    style="display:grid; grid-template-columns: repeat(7, 1fr); gap:12px; margin-bottom:24px;">
                    ${weekDays.map(day => {
                    const y = day.getFullYear();
                    const m = String(day.getMonth() + 1).padStart(2, '0');
                    const d = String(day.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;

                    const isToday = day.getTime() === today.getTime();
                    const dayName = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][day.getDay()];
                    
                    const dayProjects = projects.filter(p => p.shoot_date && p.shoot_date.split('T')[0] === dateStr && p.status !== 'archived');
                    const dayTasks = tasks.filter(t => {
                        // If bullet mode, don't show project tasks in the calendar grid
                        if (displayMode === 'bullet' && (t.project_id || t.projectId)) return false;
                        
                        const tDate = String(t.due_date || t.dueDate || '').split('T')[0];
                        return tDate === dateStr;
                    });

                    const dragOverStyle = "this.style.borderColor='var(--primary)'; this.style.background='#F5F3FF';";
                    const dragLeaveStyle = "this.style.borderColor='" + (isToday ? 'var(--primary)' : 'var(--border)') + "'; this.style.background='" + (isToday ? '#F5F3FF' : 'white') + "';";
                    
                    return `
                        <div class="weekly-day ${isToday ? 'today' : ''}" 
                            ondragover="event.preventDefault(); ${dragOverStyle}"
                            ondragleave="${dragLeaveStyle}"
                            ondrop="app.handleDrop(event, '${dateStr}')"
                            style="background: ${isToday ? '#F5F3FF' : 'white'}; border-radius:12px; padding:10px; border:1px solid ${isToday ? 'var(--primary)' : 'var(--border)'}; text-align:right; min-height:110px; display:flex; flex-direction:column; gap:6px; box-shadow: var(--shadow-sm); transition: all 0.2s;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted)">${dayName}</div>
                                <div style="font-size:1rem; font-weight:800; color:var(--text-main)">${day.getDate()}</div>
                            </div>
                            
                            <div style="flex:1; display:flex; flex-direction:column; gap:4px; max-height:100px; overflow-y:auto; scrollbar-width: none;">
                                ${dayProjects.map(p => {
                                    const shootTime = p.shoot_time ? `<div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:2px; display:flex; align-items:center; gap:2px; justify-content:flex-end;"><i data-lucide="clock" style="width:8px; height:8px;"></i> כניסה: ${p.shoot_time}</div>` : '';
                                    const clientName = p.clients?.name ? ` (${p.clients.name})` : '';
                                    return `
                                    <div style="margin-top:2px;">
                                        ${shootTime}
                                        <div onclick="app.viewProject('${p.id}')" 
                                            draggable="true"
                                            ondragstart="app.handleDragStart(event, 'project', '${p.id}')"
                                            ondragend="this.style.opacity='1'"
                                            style="background:#E0F2FE; color:#0369A1; font-size:0.7rem; padding:4px 6px; border-radius:6px; font-weight:600; cursor:grab; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display: flex; align-items:center; gap:4px; border: 1px solid #BAE6FD;">
                                            <i data-lucide="camera" style="width:10px; height:10px; flex-shrink:0;"></i>
                                            <span style="overflow:hidden; text-overflow:ellipsis;">${p.name}${clientName}</span>
                                        </div>
                                    </div>`;
                                }).join('')}

                                ${dayTasks.map(t => {
                                    return `
                                    <div style="display: flex; align-items: stretch; gap: 4px; margin-top: 2px;">
                                        <div onclick="app.viewTask('${t.id}')" 
                                            draggable="true"
                                            ondragstart="app.handleDragStart(event, 'task', '${t.id}')"
                                            ondragend="this.style.opacity='1'"
                                            style="background:#F3E8FF; color:#7E22CE; font-size:0.7rem; padding:4px 6px; border-radius:6px; font-weight:600; cursor:grab; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; display: flex; align-items:center; gap:4px; border: 1px solid #E9D5FF; opacity: ${t.is_completed ? '0.6' : '1'}; flex: 1; min-width: 0;">
                                            <i data-lucide="check-circle-2" style="width:10px; height:10px; flex-shrink:0;"></i>
                                            <span style="overflow:hidden; text-overflow:ellipsis; ${t.is_completed ? 'text-decoration:line-through' : ''}">${t.content}</span>
                                        </div>
                                        <button class="btn-icon" style="color:#EF4444; background:#F3E8FF; border:1px solid #E9D5FF; border-radius:6px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0;" onclick="event.stopPropagation(); app.deleteChecklistItem('${t.id}')" title="מחיקה">
                                            <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
                                        </button>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div style="margin-top: 32px;">
            ${overdueTasksHtml}
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                <!-- Weekly Tasks -->
                <div>
                    <h3 class="section-title" style="font-size:1rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="list-todo" style="width:18px;"></i> משימות לשבוע זה
                    </h3>
                    <div style="background:white; border-radius:var(--radius-lg); border:1px solid var(--border); box-shadow:var(--shadow-sm); overflow:hidden;">
                        ${weekTasks.length === 0 ? 
                            '<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.9rem;">אין משימות לשבוע זה</div>' :
                            weekTasks.map(t => `
                                <div class="dashboard-task-item" style="padding:12px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; opacity: ${t.is_completed ? '0.6' : '1'};">
                                    <input type="checkbox" ${t.is_completed ? 'checked' : ''} onclick="app.toggleChecklistItem('${t.id}', this.checked, null, true)" style="width:16px; height:16px; flex-shrink:0;">
                                    <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                                        <span style="font-size:0.9rem; ${t.is_completed ? 'text-decoration:line-through' : ''}; cursor:pointer;" onclick="app.viewTask('${t.id}')">${t.content}</span>
                                        ${t.projects?.name ? `<span style="font-size:0.75rem; color:var(--text-muted);">פרויקט: ${t.projects.name}</span>` : ''}
                                    </div>
                                    <span style="font-size:0.75rem; color:var(--text-muted); flex-shrink:0;">${new Date(t.due_date || t.dueDate).toLocaleDateString('he-IL', {day:'numeric', month:'numeric'})}</span>
                                    <button class="btn-icon" style="color:#EF4444; flex-shrink:0;" onclick="event.stopPropagation(); app.deleteChecklistItem('${t.id}')">
                                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                                    </button>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- Weekly Clients -->
                ${weeklyClientsHtml ? `<div>${weeklyClientsHtml}</div>` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('view-container').innerHTML = html;
    const gender = Store.getUserGender();
    document.getElementById('view-title').innerText = gender === 'male' ? 'שלום צלם! 👋' : 'שלום צלמת! 👋';
    document.getElementById('view-subtitle').innerText = 'הנה מה שקורה בעסק שלך היום.';
    if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    async renderClients(searchQuery = '', filterSource = 'all', sortBy = 'name-asc', filterCity = 'all') {
        const [clients, projects] = await Promise.all([
            Store.getClients(),
            Store.getProjects()
        ]);
        
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
            if (sortBy === 'projects-desc') {
                const aCount = projects.filter(p => String(p.client_id) === String(a.id)).length;
                const bCount = projects.filter(p => String(p.client_id) === String(b.id)).length;
                return bCount - aCount;
            }
            if (sortBy === 'revenue-desc') {
                const aRev = projects.filter(p => String(p.client_id) === String(a.id)).reduce((s, p) => s + (p.payments?.total || 0), 0);
                const bRev = projects.filter(p => String(p.client_id) === String(b.id)).reduce((s, p) => s + (p.payments?.total || 0), 0);
                return bRev - aRev;
            }
            return 0;
        });

        // ===== STATISTICS =====
        const totalClients = clients.length;
        
        // Source breakdown
        const sourceCounts = {};
        clients.forEach(c => {
            const src = c.source || 'other';
            sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        });
        const sourceLabels = { whatsapp: 'וואטסאפ', instagram: 'אינסטגרם', facebook: 'פייסבוק', recommendation: 'המלצה', other: 'אחר' };
        const sourceIcons = { whatsapp: 'message-circle', instagram: 'instagram', facebook: 'facebook', recommendation: 'heart', other: 'help-circle' };
        const sourceColors = { whatsapp: '#25D366', instagram: '#E1306C', facebook: '#1877F2', recommendation: '#F59E0B', other: '#6B7280' };
        
        // Top source
        const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
        
        // City breakdown
        const cityCounts = {};
        clients.forEach(c => { if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1; });
        const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        // Projects per client
        const clientProjectCounts = {};
        projects.forEach(p => {
            if (p.client_id) clientProjectCounts[p.client_id] = (clientProjectCounts[p.client_id] || 0) + 1;
        });
        const avgProjects = totalClients > 0 ? (projects.length / totalClients).toFixed(1) : '0';
        const returningClients = Object.values(clientProjectCounts).filter(c => c > 1).length;
        
        // Revenue per client
        const clientRevenue = {};
        projects.forEach(p => {
            if (p.client_id && p.payments?.total) {
                clientRevenue[p.client_id] = (clientRevenue[p.client_id] || 0) + (p.payments.total || 0);
            }
        });
        const totalRevenue = Object.values(clientRevenue).reduce((s, v) => s + v, 0);
        const avgRevenue = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

        // Top clients by revenue
        const topClientsByRevenue = Object.entries(clientRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, rev]) => {
                const client = clients.find(c => String(c.id) === String(id));
                return { name: client?.name || 'לא ידוע', revenue: rev };
            });

        // Recent clients (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentClients = clients.filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo);

        // Conversion rate (clients with at least one closed/delivered project)
        const convertedStatuses = ['closed', 'shooting', 'editing', 'delivered', 'published', 'archived'];
        const clientsWithConversion = new Set();
        projects.forEach(p => {
            if (p.client_id && convertedStatuses.includes(p.status)) {
                clientsWithConversion.add(String(p.client_id));
            }
        });
        const conversionRate = totalClients > 0 ? Math.round((clientsWithConversion.size / totalClients) * 100) : 0;

        // ===== Build HTML =====
        let contentHtml = '';

        // Stats Cards Row
        contentHtml += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <!-- Total Clients -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.05)); border-radius: 50%;"></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: linear-gradient(135deg, #7C3AED, #6D28D9); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">סה״כ לקוחות</div>
                            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">${totalClients}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        ${recentClients.length > 0 ? `<span style="color: #10B981; font-weight: 600;">+${recentClients.length}</span> ב-30 יום אחרונים` : 'אין לקוחות חדשים החודש'}
                    </div>
                </div>

                <!-- Conversion Rate -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05)); border-radius: 50%;"></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: linear-gradient(135deg, #10B981, #059669); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i data-lucide="trending-up" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">אחוז סגירה</div>
                            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">${conversionRate}%</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${clientsWithConversion.size} מתוך ${totalClients} לקוחות סגרו עסקה</div>
                </div>

                <!-- Returning Clients -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05)); border-radius: 50%;"></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i data-lucide="repeat" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">לקוחות חוזרים</div>
                            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">${returningClients}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">ממוצע ${avgProjects} פרויקטים ללקוח</div>
                </div>

                <!-- Average Revenue -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05)); border-radius: 50%;"></div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="background: linear-gradient(135deg, #3B82F6, #2563EB); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i data-lucide="wallet" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">הכנסה ממוצעת ללקוח</div>
                            <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); line-height: 1;">₪${avgRevenue.toLocaleString()}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">סה״כ ₪${totalRevenue.toLocaleString()} מכל הלקוחות</div>
                </div>
            </div>
        `;

        // Insights Row
        contentHtml += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                
                <!-- Source Breakdown -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-weight: 700; color: var(--text-main);">
                        <i data-lucide="pie-chart" style="width: 16px; color: var(--primary);"></i>
                        התפלגות מקורות הפנייה
                    </div>
                    ${Object.entries(sourceCounts).sort((a,b) => b[1] - a[1]).map(([src, count]) => {
                        const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
                        return `
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <div style="width: 28px; height: 28px; border-radius: 8px; background: ${sourceColors[src] || '#6B7280'}15; display: flex; align-items: center; justify-content: center;">
                                    <i data-lucide="${sourceIcons[src] || 'help-circle'}" style="width: 14px; color: ${sourceColors[src] || '#6B7280'};"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="font-size: 0.8rem; font-weight: 600;">${sourceLabels[src] || src}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${count} (${pct}%)</span>
                                    </div>
                                    <div style="height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${pct}%; background: ${sourceColors[src] || '#6B7280'}; border-radius: 3px; transition: width 0.5s ease;"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Top Cities -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-weight: 700; color: var(--text-main);">
                        <i data-lucide="map-pin" style="width: 16px; color: var(--primary);"></i>
                        ערים מובילות
                    </div>
                    ${topCities.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 20px;">לא הוזנו ערים עדיין</div>' :
                    topCities.map(([city, count], i) => {
                        const pct = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                        return `
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <span style="font-size: 1rem; width: 24px; text-align: center;">${medal || (i + 1)}</span>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="font-size: 0.8rem; font-weight: 600;">${city}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${count} לקוחות</span>
                                    </div>
                                    <div style="height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #7C3AED, #A78BFA); border-radius: 3px; transition: width 0.5s ease;"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Top Clients by Revenue -->
                <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-weight: 700; color: var(--text-main);">
                        <i data-lucide="crown" style="width: 16px; color: #F59E0B;"></i>
                        לקוחות מובילים (הכנסה)
                    </div>
                    ${topClientsByRevenue.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 20px;">אין נתוני הכנסה עדיין</div>' :
                    topClientsByRevenue.map((tc, i) => {
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                        return `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; margin-bottom: 8px; background: ${i === 0 ? 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' : '#F9FAFB'}; border-radius: 10px; border: 1px solid ${i === 0 ? '#FDE68A' : '#F3F4F6'};">
                                <span style="font-size: 1.2rem;">${medal}</span>
                                <div style="flex: 1;">
                                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">${tc.name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">${projects.filter(p => {
                                        const cl = clients.find(c => c.name === tc.name);
                                        return cl && String(p.client_id) === String(cl.id);
                                    }).length} פרויקטים</div>
                                </div>
                                <div style="font-weight: 800; font-size: 0.95rem; color: #059669;">₪${tc.revenue.toLocaleString()}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // Filters Bar
        contentHtml += `
            <div class="filters-bar" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; background: white; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); align-items: center;">
                <div style="flex: 1; min-width: 200px; position: relative;">
                    <i data-lucide="search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-muted); pointer-events: none;"></i>
                    <input type="text" id="client-search" placeholder="חיפוש לפי שם או טלפון..." 
                        value="${searchQuery}"
                        style="width: 100%; padding: 6px 32px 6px 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem;"
                        oninput="app.debouncedRenderClients(this.value, document.getElementById('client-filter-source').value, document.getElementById('client-sort').value, document.getElementById('client-filter-city').value)"
                    >
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <select id="client-filter-source" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="app.debouncedRenderClients(document.getElementById('client-search').value, this.value, document.getElementById('client-sort').value, document.getElementById('client-filter-city').value)"
                    >
                        <option value="all">כל המקורות</option>
                        <option value="whatsapp" ${filterSource === 'whatsapp' ? 'selected' : ''}>וואטסאפ</option>
                        <option value="instagram" ${filterSource === 'instagram' ? 'selected' : ''}>אינסטגרם</option>
                        <option value="facebook" ${filterSource === 'facebook' ? 'selected' : ''}>פייסבוק</option>
                        <option value="recommendation" ${filterSource === 'recommendation' ? 'selected' : ''}>המלצה</option>
                        <option value="other" ${filterSource === 'other' ? 'selected' : ''}>אחר</option>
                    </select>

                    <select id="client-filter-city" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="app.debouncedRenderClients(document.getElementById('client-search').value, document.getElementById('client-filter-source').value, document.getElementById('client-sort').value, this.value)"
                    >
                        <option value="all">כל הערים</option>
                        ${cities.map(city => `<option value="${city}" ${filterCity === city ? 'selected' : ''}>${city}</option>`).join('')}
                    </select>

                    <select id="client-sort" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 120px; font-size: 0.85rem; cursor: pointer;"
                        onchange="app.debouncedRenderClients(document.getElementById('client-search').value, document.getElementById('client-filter-source').value, this.value, document.getElementById('client-filter-city').value)"
                    >
                        <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>שם (א-ת)</option>
                        <option value="name-desc" ${sortBy === 'name-desc' ? 'selected' : ''}>שם (ת-א)</option>
                        <option value="city-asc" ${sortBy === 'city-asc' ? 'selected' : ''}>עיר (א-ת)</option>
                        <option value="city-desc" ${sortBy === 'city-desc' ? 'selected' : ''}>עיר (ת-א)</option>
                        <option value="projects-desc" ${sortBy === 'projects-desc' ? 'selected' : ''}>מס׳ פרויקטים</option>
                        <option value="revenue-desc" ${sortBy === 'revenue-desc' ? 'selected' : ''}>הכנסה</option>
                    </select>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
                    ${filteredClients.length} לקוחות
                </div>
            </div>
        `;

        // Client List - enhanced with project count and revenue
        if (filteredClients.length === 0) {
            contentHtml += `<div style="padding: 40px; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border);">לא נמצאו לקוחות מתאימים.</div>`;
        } else {
            contentHtml += `
                <div class="card-list">
                    ${filteredClients.map(c => {
                        const clientProjects = projects.filter(p => String(p.client_id) === String(c.id));
                        const clientRev = clientProjects.reduce((s, p) => s + (p.payments?.total || 0), 0);
                        const lastProject = clientProjects.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
                        return `
                        <div class="list-item" style="align-items: center;">
                            <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                                <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #7C3AED, #A78BFA); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; flex-shrink: 0;">
                                    ${(c.name || '?').charAt(0)}
                                </div>
                                <div class="item-info" style="min-width: 0;">
                                    <span class="item-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</span>
                                    ${c.organization ? `<span class="item-sub" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-top: -2px; margin-bottom: 2px;">${c.organization}</span>` : ''}
                                    <span class="item-sub" style="font-size: 0.78rem;">${c.phone || ''} ${c.phone && c.source ? '|' : ''} ${this.getSourceLabel(c.source)}${c.city ? ' | ' + c.city : ''}</span>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;">
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    ${clientProjects.length > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #EDE9FE; color: #6D28D9; white-space: nowrap;">${clientProjects.length} פרויקטים</span>` : '<span style="font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: #F3F4F6; color: #9CA3AF; white-space: nowrap;">ללא פרויקטים</span>'}
                                    ${clientRev > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #DCFCE7; color: #166534; white-space: nowrap;">₪${clientRev.toLocaleString()}</span>` : ''}
                                </div>
                                <div class="item-actions" style="gap: 4px;">
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
                        </div>
                    `}).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = contentHtml;
        document.getElementById('view-title').innerText = 'ניהול לקוחות';
        document.getElementById('view-subtitle').innerText = 'סיכום לקוחות, סטטיסטיקות ותובנות.';
        
        // Focus search input and put cursor at end if it was focused
        const searchInput = document.getElementById('client-search');
        if (searchQuery) {
            searchInput.focus();
            searchInput.setSelectionRange(searchQuery.length, searchQuery.length);
        }

        if (window.lucide) {
            lucide.createIcons({
                root: document.getElementById('view-container')
            });
        }
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
                                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px;">
                                            <div class="kanban-card-title" style="margin:0;">${p.name}</div>
                                            ${(p.payments?.total || 0) > 0 ? `<div style="font-size:0.75rem; font-weight:700; color:var(--text-main); background:var(--bg-main); padding:2px 6px; border-radius:4px; border:1px solid var(--border);">₪${p.payments.total.toLocaleString()}</div>` : ''}
                                        </div>
                                        <div class="kanban-card-client">${clientName}</div>
                                        ${p.clients?.organization ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: -4px; margin-bottom: 8px;">${p.clients.organization}</div>` : ''}
                                        ${(p.payments?.deposit || 0) > 0 ? `
                                            <div style="display: flex; gap: 6px; font-size: 0.65rem; margin-top: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                                <div style="background: #DCFCE7; color: #166534; padding: 1px 6px; border-radius: 4px; border: 1px solid #BBF7D0; font-weight: 700;">מקדמה: ₪${p.payments.deposit.toLocaleString()}</div>
                                                ${(p.payments.total - p.payments.deposit) > 0 ? `<div style="background: #FEE2E2; color: #991B1B; padding: 1px 6px; border-radius: 4px; border: 1px solid #FECACA; font-weight: 700;">יתרה: ₪${(p.payments.total - p.payments.deposit).toLocaleString()}</div>` : ''}
                                            </div>
                                        ` : ''}
                                        <div class="kanban-card-footer">
                                            <div class="kanban-card-date">
                                                <i data-lucide="calendar" style="width:12px;"></i>
                                                ${p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'}) : '---'}
                                            </div>
                                            <div style="display:flex; align-items:center; gap:4px;">
                                                <select class="mini-status-select" onclick="event.stopPropagation()" onchange="app.updatePaymentStatus('${p.id}', this.value)" style="font-size: 0.7rem; padding: 1px 4px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text-main); cursor: pointer;">
                                                    <option value="not_paid" ${p.payment_status === 'not_paid' ? 'selected' : ''}>💸 טרם שולם</option>
                                                    <option value="deposit" ${p.payment_status === 'deposit' ? 'selected' : ''}>💰 מקדמה</option>
                                                    <option value="paid_full" ${p.payment_status === 'paid_full' ? 'selected' : ''}>✅ שולם</option>
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
        document.getElementById('view-title').innerText = 'פרויקטים';
        document.getElementById('view-subtitle').innerText = 'מעקב אחרי זרימת העבודה שלך.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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
                                    ${p.clients?.organization ? `<span class="item-sub" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500; margin-top: -2px; margin-bottom: 2px;">${p.clients.organization}</span>` : ''}
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
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    async renderTasks(searchQuery = '', filterStatus = 'all', filterProject = 'all', sortBy = '') {
        const [allItems, projects] = await Promise.all([
            Store.getAllTasks(),
            Store.getProjects()
        ]);
        const displayMode = Store.getChecklistDisplayMode();
        
        // Filter tasks: include if it has a due date, or if it's not a filtered category
        let filteredTasks = allItems.filter(item => {
            const hasDueDate = !!(item.due_date || item.dueDate);
            if (hasDueDate) return true;
            return (item.category !== 'shoot' && item.category !== 'equipment') || (item.content || '').includes('תזכורת');
        });
        
        // If bullet mode, hide project tasks UNLESS they have a due date
        if (displayMode === 'bullet') {
            filteredTasks = filteredTasks.filter(item => {
                const hasDueDate = !!(item.due_date || item.dueDate);
                return hasDueDate || !(item.project_id || item.projectId);
            });
        }
        
        // Apply search and filters
        filteredTasks = filteredTasks.filter(t => {
            const matchesSearch = (t.content || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || 
                                 (filterStatus === 'completed' && t.is_completed) || 
                                 (filterStatus === 'pending' && !t.is_completed);
            const matchesProject = filterProject === 'all' || String(t.project_id) === String(filterProject);
            
            return matchesSearch && matchesStatus && matchesProject;
        });

        // Sort
        filteredTasks.sort((a, b) => {
            if (sortBy === 'due-date-asc' || !sortBy) {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            }
            if (sortBy === 'due-date-desc') {
                return new Date(b.due_date || 0) - new Date(a.due_date || 0);
            }
            if (sortBy === 'created-desc') return new Date(b.created_at) - new Date(a.created_at);
            if (sortBy === 'created-asc') return new Date(a.created_at) - new Date(b.created_at);
            if (sortBy === 'status') return (a.is_completed === b.is_completed) ? 0 : (a.is_completed ? 1 : -1);
            if (sortBy === 'project') return (a.projects?.name || 'ת').localeCompare(b.projects?.name || 'ת', 'he');
            return 0;
        });

        let html = `
            <div class="tasks-header" style="margin-bottom: 24px; background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border);">
                <div style="display:flex; gap:12px; align-items:center; margin-bottom: 16px;">
                    <input type="text" id="new-global-task-input" placeholder="הוספת משימה כללית חדשה..." style="flex:1; padding:10px 16px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:0.95rem;">
                    <button class="btn btn-primary" onclick="app.addGlobalTask()">
                        הוספה
                    </button>
                </div>

                <div class="filters-bar" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border-top: 1px solid var(--border); padding-top: 16px;">
                    <div style="flex: 1; min-width: 200px; position: relative;">
                        <i data-lucide="search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 14px; color: var(--text-muted); pointer-events: none;"></i>
                        <input type="text" id="task-search" placeholder="חיפוש משימה..." 
                            value="${searchQuery}"
                            style="width: 100%; padding: 8px 36px 8px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem;"
                            oninput="UI.renderTasks(this.value, document.getElementById('task-filter-status').value, document.getElementById('task-filter-project').value, document.getElementById('task-sort').value)"
                        >
                    </div>
                    
                    <select id="task-filter-status" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; cursor: pointer; min-width: 110px;"
                        onchange="UI.renderTasks(document.getElementById('task-search').value, this.value, document.getElementById('task-filter-project').value, document.getElementById('task-sort').value)"
                    >
                        <option value="all">סינון לפי סטטוס...</option>
                        <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>בביצוע</option>
                        <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>הושלמו</option>
                    </select>

                    <select id="task-filter-project" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; cursor: pointer; min-width: 130px; max-width: 180px;"
                        onchange="UI.renderTasks(document.getElementById('task-search').value, document.getElementById('task-filter-status').value, this.value, document.getElementById('task-sort').value)"
                    >
                        <option value="all">סינון לפי פרויקט...</option>
                        ${projects.map(p => `<option value="${p.id}" ${filterProject === String(p.id) ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>

                    <select id="task-sort" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem; cursor: pointer; min-width: 130px;"
                        onchange="UI.renderTasks(document.getElementById('task-search').value, document.getElementById('task-filter-status').value, document.getElementById('task-filter-project').value, this.value)"
                    >
                        <option value="" disabled ${!sortBy ? 'selected' : ''}>מיון לפי...</option>
                        <option value="due-date-asc" ${sortBy === 'due-date-asc' ? 'selected' : ''}>תאריך יעד (קרוב לרחוק)</option>
                        <option value="due-date-desc" ${sortBy === 'due-date-desc' ? 'selected' : ''}>תאריך יעד (רחוק לקרוב)</option>
                        <option value="created-desc" ${sortBy === 'created-desc' ? 'selected' : ''}>תאריך יצירה (חדש לישן)</option>
                        <option value="created-asc" ${sortBy === 'created-asc' ? 'selected' : ''}>תאריך יצירה (ישן לחדש)</option>
                        <option value="status" ${sortBy === 'status' ? 'selected' : ''}>לפי סטטוס</option>
                        <option value="project" ${sortBy === 'project' ? 'selected' : ''}>לפי פרויקט</option>
                    </select>

                    <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; margin-right: auto;">
                        ${filteredTasks.length} משימות
                    </div>
                </div>
            `;

            const projectsCache = await Store.getProjects();
            const projectMap = {};
            projectsCache.forEach(p => { 
                projectMap[String(p.id)] = p; 
            });

            const tasksToRender = filteredTasks.map(t => {
                const pid = t.project_id || t.projectId;
                const resolvedProj = pid ? projectMap[String(pid)] : null;
                const projectName = t.projects?.name || resolvedProj?.name || (pid ? 'פרויקט לא ידוע' : 'משימה כללית');
                const clientName = t.projects?.clients?.name || resolvedProj?.clients?.name || '';
                const isGlobal = !pid;
                const isStyling = t.category === 'styling' || (t.content || '').includes('שיחת סטיילינג');
                const remindersCount = (t.reminders || []).length;
                
                let badgeBg = '#F3E8FF';
                let badgeColor = '#7E22CE';
                let badgeLabel = 'כללי';

                if (!isGlobal) {
                    if (isStyling) {
                        badgeBg = '#D1FAE5';
                        badgeColor = '#059669';
                        badgeLabel = 'סטיילינג';
                    } else {
                        badgeBg = '#E0F2FE';
                        badgeColor = '#0369A1';
                        badgeLabel = clientName ? `${projectName} (${clientName})` : projectName;
                    }
                }

                return {
                    ...t,
                    projectName,
                    badgeBg,
                    badgeColor,
                    badgeLabel,
                    remindersCount,
                    dueDateStr: t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : null,
                    createdDateStr: new Date(t.created_at).toLocaleDateString('he-IL')
                };
            });

            html += `
            <div class="card-list">
                ${tasksToRender.length === 0 ? 
                    '<div style="padding: 60px 40px; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-lg); border: 1px dashed var(--border);">לא נמצאו משימות מתאימות.</div>' : 
                    tasksToRender.map(t => `
                        <div class="list-item" style="opacity: ${t.is_completed ? '0.6' : '1'}; transition: all 0.2s;">
                            <div style="display:flex; align-items:flex-start; gap:12px; flex:1;">
                                <input type="checkbox" ${t.is_completed ? 'checked' : ''} onclick="app.toggleChecklistItem('${t.id}', this.checked, '${t.project_id || ''}')" style="width:20px; height:20px; margin-top:2px;">
                                <div style="flex:1;">
                                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap: wrap;">
                                        <span style="font-weight:600; font-size:1rem; cursor:pointer; ${t.is_completed ? 'text-decoration:line-through; color:var(--text-muted)' : 'color:var(--text-main)'}" onclick="app.viewTask('${t.id}')">${t.content}</span>
                                        <span style="font-size: 0.7rem; background:${t.badgeBg}; color:${t.badgeColor}; padding:2px 8px; border-radius:999px; font-weight:700;">${t.badgeLabel}</span>
                                        ${t.remindersCount > 0 ? `
                                            <div class="reminders-tooltip-container" style="display: inline-flex;">
                                                <span style="font-size: 0.7rem; background:#FFFBEB; color:#92400E; padding:2px 10px; border-radius:999px; font-weight:700; display:flex; align-items:center; gap:4px; cursor: help;">
                                                    <i data-lucide="bell" style="width:10px;"></i> ${t.remindersCount} תזכורות
                                                </span>
                                                <div class="reminders-tooltip">
                                                    ${(t.reminders || []).map(r => `
                                                        <div class="reminder-tooltip-item">
                                                            <i data-lucide="calendar" style="width: 12px; margin-left: 6px; opacity: 0.7;"></i>
                                                            <span class="reminder-tooltip-date">${r.date ? r.date.split('-').reverse().join('/') : ''}</span>
                                                            <span style="margin: 0 4px; opacity: 0.5;">|</span>
                                                            <i data-lucide="clock" style="width: 12px; margin-left: 6px; opacity: 0.7;"></i>
                                                            <span class="reminder-tooltip-hour">${r.hour || '08:00'}</span>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div style="display:flex; gap:12px; align-items:center; font-size:0.8rem; color:var(--text-muted);">
                                        ${t.dueDateStr ? `<span style="display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:14px;"></i> תאריך יעד: ${t.dueDateStr}</span>` : ''}
                                        <span style="display:flex; align-items:center; gap:4px;">נוסף ב: ${t.createdDateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-secondary btn-sm" onclick="app.viewTask('${t.id}')">
                                    <i data-lucide="edit-2"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm delete-btn" onclick="app.deleteChecklistItem('${t.id}', '${t.project_id || ''}')">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'משימות ורשימות';
        document.getElementById('view-subtitle').innerText = 'משימות כלליות ומשימות מפרויקטים במקום אחד.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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
        const [projects, tasks, profile] = await Promise.all([
            Store.getProjects(),
            Store.getAllTasks(),
            Store.getUserProfile()
        ]);
        const isProfessional = profile?.plan === 'professional';
        
        const currentMonth = app.currentCalendarDate.getMonth();
        const currentYear = app.currentCalendarDate.getFullYear();
        
        // Fetch Jewish Holidays (will return {} if not Pro)
        const holidays = await Store.getJewishHolidays(currentYear, currentMonth + 1);

        const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

        let html = `
            ${!isProfessional ? `
                <div style="background:white; border:1px dashed var(--primary-light); padding:12px 20px; border-radius:var(--radius-lg); margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="background:var(--primary-light); color:var(--primary); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                            <i data-lucide="zap" style="width:16px; height:16px; fill:currentColor;"></i>
                        </div>
                        <span style="font-size:0.9rem; font-weight:600; color:var(--text-main);">שדרגו ל-Pro לקבלת חגים, זמני שבת וניהול צ'קליסט ומשימות לפרויקט ביומן!</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="app.openUpgradeModal()">לשדרוג עכשיו</button>
                </div>
            ` : ''}
            <div class="calendar-wrapper" style="background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow); padding: 20px; border: 1px solid var(--border);">
                <div class="calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; direction: rtl; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="app.changeMonth(-1)" style="display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="chevron-right"></i>
                            <span class="desktop-only">הקודם</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.currentCalendarDate = new Date(); app.navigate('calendar')" style="display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="calendar"></i>
                            <span>היום</span>
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.changeMonth(1)" style="display: flex; align-items: center; gap: 4px;">
                            <span class="desktop-only">הבא</span>
                            <i data-lucide="chevron-left"></i>
                        </button>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-main); padding: 4px 16px; border-radius: 30px; border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
                        <select id="calendar-month-select" onchange="app.goToSelectedDate()" style="background: transparent; border: none; font-size: 1.1rem; font-weight: 700; color: var(--text-main); cursor: pointer; padding: 4px 8px; font-family: inherit; width: auto; min-width: 90px; text-align: center;">
                            ${monthNames.map((name, index) => `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${name}</option>`).join('')}
                        </select>
                        <select id="calendar-year-select" onchange="app.goToSelectedDate()" style="background: transparent; border: none; font-size: 1.1rem; font-weight: 700; color: var(--text-main); cursor: pointer; padding: 4px 8px; font-family: inherit; width: auto; text-align: center;">
                            ${(() => {
                                const years = [];
                                for (let y = currentYear - 5; y <= currentYear + 10; y++) {
                                    years.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
                                }
                                return years.join('');
                            })()}
                        </select>
                    </div>
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
                        
                        // Tasks for this date: include checklist items with due dates
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
                                         return '<div class="calendar-event project" draggable="true" ondragstart="event.dataTransfer.setData(\'projectId\', \'' + p.id + '\')" onclick="event.stopPropagation(); app.viewProject(\'' + p.id + '\')" style="background:#E0F2FE; color:#0369A1; font-size:0.7rem; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="פרויקט: ' + displayName + '"><i data-lucide="camera" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-left:4px;"></i>' + displayName + '</div>';
                                     }).join('')}
                                    ${dayTasks.map(t => {
                                        const isStyling = t.category === 'styling' || t.content.includes('שיחת סטיילינג');
                                        const bg = isStyling ? '#ECFDF5' : '#F3E8FF';
                                        const color = isStyling ? '#059669' : '#7E22CE';
                                        const clickAction = "app.viewTask('" + t.id + "')";
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
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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
                                    <span class="item-sub">${new Date(p.shoot_date).toLocaleDateString('he-IL')} | ${p.clients?.name || 'לקוח לא ידוע'}</span>
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
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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
                            style="background: white; border-radius: var(--radius-lg); border: 2px solid var(--border); padding: 16px; transition: background 0.2s; min-width: 300px; flex: 0 0 300px; scroll-snap-align: start;"
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
                                                <option value="not_paid" ${p.payment_status === 'not_paid' ? 'selected' : ''}>💸 טרם שולם</option>
                                                <option value="deposit" ${p.payment_status === 'deposit' ? 'selected' : ''}>💰 מקדמה</option>
                                                <option value="paid_full" ${p.payment_status === 'paid_full' ? 'selected' : ''}>✅ שולם</option>
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
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    async renderSettings() {
        const profile = await Store.getUserProfile();
        const packages = await Store.getPackages();
        const checklistDefaults = Store.getChecklistDefaults();
        const displayMode = Store.getChecklistDisplayMode();
        const currentCity = Store.getCalendarCity();
        const currentGender = Store.getUserGender();

        const cities = Store.defaults.shabbatCities;
        const cityName = cities.find(c => c.id === currentCity)?.name || 'תל אביב';

        const planName = profile?.plan === 'professional' ? 'Pro' : 'Starter';
        const isProfessional = profile?.plan === 'professional';

        const html = `
            <div class="settings-container">
                <section class="settings-section">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">החבילה שלי</h2>
                            <p class="section-desc">ניהול המנוי והחבילה הנוכחית שלך ב-Centra.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: ${isProfessional ? 'var(--primary-light)' : '#F3F4F6'}; display: flex; align-items: center; justify-content: center; color: ${isProfessional ? 'var(--primary)' : '#6B7280'};">
                                    <i data-lucide="${isProfessional ? 'award' : 'package'}" style="width: 24px; height: 24px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">חבילת ${planName}</div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">${isProfessional ? 'יש לך גישה לכל הכלים המתקדמים' : 'ניהול פרויקטים מוגבל - שדרגו לניהול מלא'}</div>
                                </div>
                            </div>
                            ${!isProfessional ? `
                                <button onclick="app.openUpgradeModal()" class="btn btn-primary" style="padding: 8px 20px; border-radius: 100px; font-weight: 600; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                                    לשדרוג החבילה
                                </button>
                            ` : `
                                <span class="badge" style="background: #ECFDF5; color: #059669; padding: 6px 16px; border-radius: 100px; font-weight: 600; border: 1px solid #A7F3D0;">פעיל</span>
                            `}
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: var(--category-spacing);">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">פרופיל והעדפות</h2>
                            <p class="section-desc">הגדרות אישיות ופנייה במערכת.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 200px;">
                                <i data-lucide="user" style="color: var(--primary);"></i>
                                <div>
                                    <div style="font-weight: 600;">מגדר פנייה</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">התאמת הפניות במערכת (צלם/צלמת).</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 16px;">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="radio" name="user-gender" value="female" ${currentGender === 'female' ? 'checked' : ''} onchange="app.updateGender(this.value)">
                                    <span>צלמת</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="radio" name="user-gender" value="male" ${currentGender === 'male' ? 'checked' : ''} onchange="app.updateGender(this.value)">
                                    <span>צלם</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: var(--category-spacing);">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">אבטחה וחיבור</h2>
                            <p class="section-desc">שינוי סיסמת התחברות למערכת.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
                            <div class="form-group">
                                <label for="settings-new-password">סיסמה חדשה</label>
                                <div style="position: relative;">
                                    <input type="password" id="settings-new-password" placeholder="לפחות 6 תווים" style="width: 100%; padding-left: 40px;">
                                    <button type="button" tabindex="-1" onclick="const input = document.getElementById('settings-new-password'); const icon = this.querySelector('[data-lucide]'); if (input.type === 'password') { input.type = 'text'; icon.setAttribute('data-lucide', 'eye-off'); } else { input.type = 'password'; icon.setAttribute('data-lucide', 'eye'); } if (window.lucide) { lucide.createIcons(); }" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; padding: 4px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center;">
                                        <i data-lucide="eye" style="width: 18px; height: 18px;"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="settings-confirm-password">אימות סיסמה</label>
                                <div style="position: relative;">
                                    <input type="password" id="settings-confirm-password" placeholder="הקלד שוב את הסיסמה" style="width: 100%; padding-left: 40px;">
                                    <button type="button" tabindex="-1" onclick="const input = document.getElementById('settings-confirm-password'); const icon = this.querySelector('[data-lucide]'); if (input.type === 'password') { input.type = 'text'; icon.setAttribute('data-lucide', 'eye-off'); } else { input.type = 'password'; icon.setAttribute('data-lucide', 'eye'); } if (window.lucide) { lucide.createIcons(); }" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; padding: 4px; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center;">
                                        <i data-lucide="eye" style="width: 18px; height: 18px;"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div id="password-change-error" class="hidden" style="color: #EF4444; background: #FEF2F2; padding: 10px; border-radius: 8px; font-size: 0.85rem;"></div>
                            <div id="password-change-success" class="hidden" style="color: #059669; background: #ECFDF5; padding: 10px; border-radius: 8px; font-size: 0.85rem;"></div>

                            <button id="change-password-btn" class="btn btn-primary" onclick="app.changePassword()" style="align-self: flex-start; margin-top: 8px;">
                                עדכון סיסמה
                            </button>
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: var(--category-spacing);">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">ייצוא נתונים</h2>
                            <p class="section-desc">ייצוא כל הנתונים השמורים במערכת לקובץ אקסל (Excel).</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 20px;">
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            <div class="export-grid">
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="clients" checked>
                                    <span>לקוחות</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="projects" checked>
                                    <span>פרויקטים</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="tasks" checked>
                                    <span>משימות</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="logs" checked>
                                    <span>יומן פעולות</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="packages" checked>
                                    <span>חבילות</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="locations" checked>
                                    <span>לוקיישנים</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--bg-main); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                                    <input type="checkbox" class="export-checkbox" value="notes" checked>
                                    <span>הערות (יומן)</span>
                                </label>
                            </div>
                            
                            <div id="export-status" class="hidden" style="color: var(--primary); background: var(--primary-light); padding: 10px; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                                <span class="spinner"></span>
                                מכין את הקובץ להורדה...
                            </div>

                            <button id="export-data-btn" class="btn btn-secondary" onclick="app.exportData()" style="align-self: flex-start; display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="download" style="width: 18px; height: 18px;"></i>
                                ייצוא לאקסל
                            </button>
                        </div>
                    </div>
                </section>

                ${isProfessional ? `
                <section class="settings-section" style="margin-top: var(--category-spacing);">
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
                ` : ''}

                <section class="settings-section" style="margin-top: var(--category-spacing);">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">תזרים עבודה ותזכורות אוטומטיות (Workflow)</h2>
                            <p class="section-desc">ניהול אבני דרך קריטיות לכל פרויקט - המערכת תזכיר לך מה לעשות ומתי.</p>
                        </div>
                        ${!isProfessional ? '<span class="badge badge-quote" style="background: #FEF3C7; color: #D97706; border: none; font-weight: 800; padding: 6px 12px; border-radius: 20px;">PRO</span>' : ''}
                    </div>

                    <div style="position: relative; border-radius: 12px; overflow: hidden; ${!isProfessional ? 'min-height: 420px;' : ''}">
                        ${!isProfessional ? `
                        <div style="position: absolute; inset: 0; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(4px); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                            <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid var(--border); max-width: 400px;">
                                <div style="width: 60px; height: 60px; border-radius: 50%; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                    <i data-lucide="lock" style="width: 30px; height: 30px;"></i>
                                </div>
                                <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 10px; color: var(--text-main);">פיצ'ר Pro בלבד</h3>
                                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 25px; line-height: 1.6;">מערכת זרימת העבודה והתזכורות האוטומטיות זמינה למנויי Pro בלבד. זה יחסוך לך זמן רב של עבודה ידנית בכל שבוע.</p>
                                <button onclick="app.openUpgradeModal()" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px;">שדרוג ל-Pro עכשיו</button>
                            </div>
                        </div>
                        ` : ''}

                        <div class="card-list" style="padding: 20px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; background: var(--bg-main); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 45px; height: 45px; border-radius: 12px; background: ${profile?.reminders_enabled ? 'var(--primary-light)' : '#F3F4F6'}; display: flex; align-items: center; justify-content: center; color: ${profile?.reminders_enabled ? 'var(--primary)' : '#6B7280'}; transition: all 0.3s;">
                                        <i data-lucide="shield-check" style="width: 24px; height: 24px;"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: 700; color: var(--text-main);">סטטוס מערכת Workflow ${!isProfessional ? ' (נעול)' : ''}</div>
                                        <div style="font-size: 0.85rem; color: var(--text-muted);">כשהמערכת פעילה, יישלחו תזכורות למייל הרישום שלך.</div>
                                    </div>
                                </div>
                                <label class="switch-container" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="settings-reminders-enabled" ${profile?.reminders_enabled ? 'checked' : ''} ${!isProfessional ? 'disabled' : `onchange="app.toggleReminders(this.checked)"`} style="width: 20px; height: 20px;">
                                    <span style="font-weight: 600;">${profile?.reminders_enabled ? 'פעיל' : 'כבוי'}</span>
                                </label>
                            </div>

                            <div id="reminders-details" class="${profile?.reminders_enabled ? '' : 'hidden'}" style="display: flex; flex-direction: column; gap: 20px;">
                                <h3 style="font-size: 1rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--text-main);">
                                    <i data-lucide="list-checks" style="width: 18px; height: 18px; color: var(--primary);"></i>
                                    בחירת אבני דרך למעקב:
                                </h3>
                                
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
                                    <div class="workflow-card" style="border: 1px solid var(--border); padding: 15px; border-radius: 12px; background: white; transition: all 0.3s; height: 100%; display: flex; flex-direction: column;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                            <span style="background: #E0F2FE; color: #0369A1; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">לפני הצילום</span>
                                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #0369A1; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>
                                        </div>
                                        <div style="font-weight: 700; margin-bottom: 6px; color: var(--text-main);">הכנת ציוד ואישור לקוח</div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px; line-height: 1.4;">טעינת סוללות, ריקון כרטיסים ושליחת הודעת אישור ללקוח.</div>
                                        <div style="margin-top: auto;">
                                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">תזמון שליחה:</div>
                                            <select id="settings-reminders-before" ${!isProfessional ? 'disabled' : 'onchange="app.updateRemindersConfig()"'} style="width: 100%; font-size: 0.85rem; padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                                                <option value="1" ${profile?.reminders_config?.before_shoot_days === 1 ? 'selected' : ''}>יום אחד לפני</option>
                                                <option value="2" ${profile?.reminders_config?.before_shoot_days === 2 ? 'selected' : ''}>יומיים לפני</option>
                                                <option value="3" ${profile?.reminders_config?.before_shoot_days === 3 ? 'selected' : ''}>3 ימים לפני</option>
                                                <option value="0" ${profile?.reminders_config?.before_shoot_days === 0 ? 'selected' : ''}>כבוי</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="workflow-card" style="border: 1px solid var(--border); padding: 15px; border-radius: 12px; background: white; transition: all 0.3s; height: 100%; display: flex; flex-direction: column;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                            <span style="background: #F0FDF4; color: #15803D; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">אחרי הצילום</span>
                                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #15803D; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>
                                        </div>
                                        <div style="font-weight: 700; margin-bottom: 6px; color: var(--text-main);">גיבוי, סינון וייצוא</div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 15px; line-height: 1.4;">מניעת אובדן מידע קריטי ותחילת תהליך פוסט-פרודקשן.</div>
                                        <div style="margin-top: auto;">
                                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">תזמון שליחה:</div>
                                            <select id="settings-reminders-after" ${!isProfessional ? 'disabled' : 'onchange="app.updateRemindersConfig()"'} style="width: 100%; font-size: 0.85rem; padding: 8px; border-radius: 8px; border: 1px solid var(--border);">
                                                <option value="1" ${profile?.reminders_config?.after_shoot_days === 1 ? 'selected' : ''}>יום אחד אחרי</option>
                                                <option value="2" ${profile?.reminders_config?.after_shoot_days === 2 ? 'selected' : ''}>יומיים אחרי</option>
                                                <option value="3" ${profile?.reminders_config?.after_shoot_days === 3 ? 'selected' : ''}>3 ימים אחרי</option>
                                                <option value="0" ${profile?.reminders_config?.after_shoot_days === 0 ? 'selected' : ''}>כבוי</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="workflow-card" style="border: 1px solid #FCD34D; padding: 15px; border-radius: 12px; background: #FFFBEB; transition: all 0.3s; height: 100%; display: flex; flex-direction: column;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                            <span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">פיננסי</span>
                                            <div style="width: 20px; height: 20px; border-radius: 50%; background: #D97706; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;"><i data-lucide="check" style="width: 12px; height: 12px;"></i></div>
                                        </div>
                                        <div style="font-weight: 700; margin-bottom: 6px; color: #92400E;">וידוא תשלום סופי</div>
                                        <div style="font-size: 0.8rem; color: #B45309; line-height: 1.4; margin-bottom: 15px;">תזכורת לבדוק אם יתרת התשלום הועברה בהתאם לחוזה.</div>
                                        <div style="margin-top: auto;">
                                            <div style="font-size: 0.75rem; color: #92400E; margin-bottom: 5px;">תזמון שליחה:</div>
                                            <select id="settings-reminders-payment" ${!isProfessional ? 'disabled' : 'onchange="app.updateRemindersConfig()"'} style="width: 100%; font-size: 0.85rem; padding: 8px; border-radius: 8px; border: 1px solid #FDE68A; background: white; color: #92400E;">
                                                <option value="7" ${profile?.reminders_config?.payment_verification_days === 7 ? 'selected' : ''}>שבוע (7 ימים) אחרי</option>
                                                <option value="14" ${profile?.reminders_config?.payment_verification_days === 14 ? 'selected' : ''}>שבועיים (14 ימים) אחרי</option>
                                                <option value="30" ${profile?.reminders_config?.payment_verification_days === 30 ? 'selected' : ''}>חודש (30 ימים) אחרי</option>
                                                <option value="0" ${profile?.reminders_config?.payment_verification_days === 0 ? 'selected' : ''}>כבוי</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style="background: var(--bg-main); padding: 15px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--border); margin-top: 5px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <i data-lucide="clock" style="width: 18px; height: 18px; color: var(--text-muted);"></i>
                                        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">שעת ברירת מחדל לשליחת התזכורות:</div>
                                    </div>
                                    <input type="time" id="settings-reminders-hour" ${!isProfessional ? 'disabled' : 'onchange="app.updateRemindersConfig()"'} value="${profile?.reminders_config?.reminder_hour || '08:00'}" style="width: 120px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border); background: white;">
                                </div>

                                <div style="background: #F0F9FF; padding: 16px; border-radius: 12px; border: 1px solid #BAE6FD; margin-top: 20px;">
                                    <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 8px; color: #0369A1; display: flex; align-items: center; gap: 8px;">
                                        <i data-lucide="zap" style="width: 16px; height: 16px;"></i>
                                        מערכת שליחה אוטומטית פעילה
                                    </div>
                                    <p style="font-size: 0.8rem; color: #0C4A6E; line-height: 1.4;">
                                        המערכת תשלח עבורך תזכורות באופן אוטומטי בהתאם לתדירות שהגדרת למעלה.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top: var(--category-spacing);">
                <section class="settings-section" style="margin-top: var(--category-spacing);">
                    <div class="section-header">
                        <div class="header-text">
                            <h2 class="section-title">חבילות צילום</h2>
                            <p class="section-desc">הגדרת החבילות לשימוש מהיר.</p>
                        </div>
                        <button class="btn btn-primary" onclick="app.openPackageModal('חבילה חדשה')">
                            הוספת חבילה
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
                            <p class="section-desc">בחירת אופן תצוגת הרשימות בפרויקטים.</p>
                        </div>
                    </div>
                    <div class="card-list" style="padding: 16px; display: flex; gap: 16px; flex-wrap: wrap;">
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
                            <input type="text" id="new-default-shoot" placeholder="הוספת משימה חדשה..." style="flex:1;">
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
                            <input type="text" id="new-default-equipment" placeholder="הוספת ציוד חדש..." style="flex:1;">
                            <button class="btn btn-primary btn-sm" onclick="app.addChecklistDefault('equipment')">הוספה</button>
                        </div>
                    </div>
                </section>
            </div>
        `;
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'הגדרות';
        document.getElementById('view-subtitle').innerText = 'התאמת המערכת.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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
        const gender = Store.getUserGender();
        document.getElementById('view-title').innerText = 'לוקיישנים לצילומים';
        document.getElementById('view-subtitle').innerText = gender === 'male' ? 'גלה לוקיישנים מומלצים לצילומים לפי אזורים בארץ.' : 'גלי לוקיישנים מומלצים לצילומים לפי אזורים בארץ.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    getSourceLabel(source) {
        const sources = {'whatsapp': 'וואטסאפ', 'instagram': 'אינסטגרם', 'facebook': 'פייסבוק', 'recommendation': 'המלצה', 'other': 'אחר'};
        return sources[source] || source;
    },

    async populateClientsDropdown(selectedClientId = null) {
        const clients = await Store.getClients();
        const select = document.getElementById('project-client');
        if (select) {
            select.innerHTML = '<option value="">בחירת לקוח...</option>' + 
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
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    async renderReports() {
        const [profile, projects, clients] = await Promise.all([
            Store.getUserProfile(),
            Store.getProjects(),
            Store.getClients()
        ]);
        const isProfessional = profile?.plan === 'professional';
        
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
            <div class="reports-container" style="display: flex; flex-direction: column; gap: 24px; padding-bottom: 20px; position: relative;">
                
                ${!isProfessional ? `
                    <!-- Upgrade Overlay for Starter Users -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); background: rgba(255, 255, 255, 0.4); border-radius: var(--radius-lg); padding: 40px; text-align: center;">
                        <div style="background: white; padding: 40px; border-radius: 24px; box-shadow: var(--shadow-lg); max-width: 450px; border: 1px solid var(--border); animation: slideIn 0.5s ease-out;">
                            <div style="width: 80px; height: 80px; background: var(--primary-light); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: var(--primary);">
                                <i data-lucide="bar-chart-3" style="width: 40px; height: 40px;"></i>
                            </div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">שדרגו לניהול דוחות מלא</h2>
                            <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 32px;">
                                בחבילת <b>Pro</b> תוכלו לראות ניתוח מעמיק של העסק, דוחות רווחיות, מעקב הכנסות חודשי וכלים מתקדמים שיעזרו לכם לצמוח.
                            </p>
                            <button onclick="app.openUpgradeModal()" class="btn btn-primary" style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                                שדרוג חבילה עכשיו
                            </button>
                        </div>
                    </div>
                    
                    <style>
                        @keyframes slideIn {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    </style>
                ` : ''}

                <!-- Key Metrics Grid -->
                <div class="reports-grid">
                    <div class="report-card" style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: var(--primary);">
                            <i data-lucide="briefcase" style="width:20px; height:20px;"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">פרויקטים פעילים</h3>
                        </div>
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--text-main);">${activeProjects}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">מתוך ${totalProjects} פרויקטים סה"כ</div>
                    </div>

                    <div class="report-card" style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: #10B981;">
                            <i data-lucide="trending-up" style="width:20px; height:20px;"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">הכנסות שנגבו</h3>
                        </div>
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--text-main);">₪${collectedRevenue.toLocaleString()}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">מתוך צפי של ₪${totalRevenue.toLocaleString()}</div>
                    </div>

                    <div class="report-card" style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: #F59E0B;">
                            <i data-lucide="clock" style="width:20px; height:20px;"></i>
                            <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted); margin: 0;">חובות פתוחים</h3>
                        </div>
                        <div style="font-size: 1.75rem; font-weight: 700; color: var(--text-main);">₪${pendingRevenue.toLocaleString()}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">תשלומים שטרם הוסדרו</div>
                    </div>
                </div>

                <!-- Detailed Charts Section -->
                <!-- Detailed Charts Section -->
                <div class="chart-grid">
                    <!-- Status Distribution -->
                    <div style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">סטטוס פרויקטים</h3>
                        <div style="display: flex; flex-direction: column; gap: 16px;">
                            ${Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).map(([status, count]) => {
                                const statusInfo = Store.getStatusInfo(status);
                                const percentage = totalProjects > 0 ? (count / totalProjects * 100).toFixed(0) : 0;
                                return `
                                    <div style="display: flex; flex-direction: column; gap: 6px;">
                                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                                            <span style="font-weight: 500;">${statusInfo.label}</span>
                                            <span style="color: var(--text-muted);">${count} (${percentage}%)</span>
                                        </div>
                                        <div style="height: 8px; background: var(--bg-main); border-radius: 4px; overflow: hidden;">
                                            <div style="height: 100%; width: ${percentage}%; background: ${statusInfo.color}; transition: width 0.3s ease;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Monthly Activity -->
                    <div style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border);">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">פעילות חודשית (פרויקטים)</h3>
                        <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 160px; gap: 6px; margin-top: 20px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
                            ${sortedMonths.map(month => {
                                const data = monthlyData[month];
                                const maxCount = Math.max(...Object.values(monthlyData).map(d => d.count), 1);
                                const heightPercentage = (data.count / maxCount * 100).toFixed(0);
                                const monthLabel = month.split('-')[1];
                                return `
                                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; min-width: 0;">
                                        <div style="flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center;">
                                            <div title="${month}: ${data.count} פרויקטים" style="width: 80%; height: ${heightPercentage}%; background: var(--primary-light); border-radius: 4px 4px 0 0; min-height: ${data.count > 0 ? '4px' : '0'}; transition: height 0.3s ease;"></div>
                                        </div>
                                        <span style="font-size: 0.65rem; color: var(--text-muted);">${monthLabel}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Income by Month Table -->
                    <div style="background: white; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border); grid-column: 1 / -1;">
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">פירוט הכנסות חודשי</h3>
                        <div style="overflow-x: auto; margin: 0 -4px;">
                            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9rem;">
                                <thead>
                                    <tr style="border-bottom: 2px solid var(--border);">
                                        <th style="padding: 12px 8px; font-weight: 600; color: var(--text-muted);">חודש</th>
                                        <th style="padding: 12px 8px; font-weight: 600; color: var(--text-muted);">פרויקטים</th>
                                        <th style="padding: 12px 8px; font-weight: 600; color: var(--text-muted);">הכנסה</th>
                                        <th style="padding: 12px 8px; font-weight: 600; color: var(--text-muted);">ממוצע</th>
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
                                                <td style="padding: 12px 8px; font-weight: 500;">${monthNames[parseInt(m)-1]} ${y.slice(-2)}'</td>
                                                <td style="padding: 12px 8px;">${data.count}</td>
                                                <td style="padding: 12px 8px; font-weight: 600; color: #10B981;">₪${data.revenue.toLocaleString()}</td>
                                                <td style="padding: 12px 8px; color: var(--text-muted);">₪${parseInt(avg).toLocaleString()}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'דוחות ותובנות';
        document.getElementById('view-subtitle').innerText = 'מבט על הביצועים העסקיים שלך.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
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

        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    async renderChecklist(projectId) {
        let items = [];
        const hasRealId = projectId && projectId !== 'null' && projectId !== 'undefined';
        
        if (hasRealId) {
            items = await Store.getChecklistItems(projectId);
        } else {
            items = app._pendingChecklistItems || [];
        }
        
        const displayMode = Store.getChecklistDisplayMode();
        const shootItems = items.filter(i => i.category === 'shoot');
        const equipmentItems = items.filter(i => i.category === 'equipment');
        const workflowItems = items.filter(i => i.category === 'workflow' || i.category === 'task');

        const renderItems = (itemList, category) => {
            if (itemList.length === 0) return '<div class="empty-list" style="padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center; border: 1px dashed var(--border); border-radius: 8px;">אין פריטים ברשימה</div>';
            return itemList.map(item => {
                const isPending = !item.id;
                const itemId = item.id || item.tempId;
                const deleteAction = isPending ? 
                    `app.removePendingItem(${item.tempId})` : 
                    `app.deleteChecklistItem('${item.id}', '${projectId}')`;
                
                const hasReminders = (item.reminders && item.reminders.length > 0);

                return `
                    <div class="checklist-item ${item.is_completed ? 'completed' : ''} mode-${displayMode}" data-id="${itemId}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            ${displayMode === 'checkbox' ? 
                                `<input type="checkbox" ${item.is_completed ? 'checked' : ''} ${isPending ? 'disabled' : ''} onclick="app.toggleChecklistItem('${item.id}', this.checked, '${projectId}')" style="width: 16px; height: 16px;">` : 
                                `<i data-lucide="circle" style="width:8px; height:8px; fill:var(--primary); color:var(--primary);"></i>`
                            }
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="checklist-text" style="font-size: 0.9rem; font-weight: 500; cursor: pointer;" ${!isPending ? `onclick="app.viewTask('${item.id}')"` : ''}>${item.content}</span>
                                    ${item.due_date ? `
                                        <span style="font-size: 0.7rem; color: var(--text-muted); background: var(--bg-main); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border); font-weight: 600;">
                                            ${item.due_date.split('-').reverse().join('/')}
                                        </span>
                                    ` : ''}
                                </div>
                                ${hasReminders ? `
                                <div class="reminders-tooltip-container" style="display: inline-flex;">
                                    <span style="font-size: 0.65rem; color: #D97706; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                        <i data-lucide="bell" style="width: 10px;"></i> ${item.reminders.length} תזכורות
                                    </span>
                                    <div class="reminders-tooltip">
                                        ${item.reminders.map(r => `
                                            <div class="reminder-tooltip-item">
                                                <i data-lucide="calendar" style="width: 12px; margin-left: 6px; opacity: 0.7;"></i>
                                                <span class="reminder-tooltip-date">${r.date ? r.date.split('-').reverse().join('/') : ''}</span>
                                                <span style="margin: 0 4px; opacity: 0.5;">|</span>
                                                <i data-lucide="clock" style="width: 12px; margin-left: 6px; opacity: 0.7;"></i>
                                                <span class="reminder-tooltip-hour">${r.hour || '08:00'}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 4px;">
                             ${!isPending ? `<button type="button" class="btn-icon" style="color:var(--text-muted);" onclick="app.viewTask('${item.id}')"><i data-lucide="edit-2" style="width:14px;"></i></button>` : ''}
                             <button type="button" class="btn-icon delete-btn" style="color:#EF4444;" onclick="event.stopPropagation(); ${deleteAction}">
                                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                             </button>
                        </div>
                    </div>
                `;
            }).join('');
        };

        const shootContainer = document.getElementById('checklist-shoot');
        const equipmentContainer = document.getElementById('checklist-equipment');
        const workflowContainer = document.getElementById('checklist-workflow');

        if (shootContainer) shootContainer.innerHTML = renderItems(shootItems, 'shoot');
        if (equipmentContainer) equipmentContainer.innerHTML = renderItems(equipmentItems, 'equipment');
        if (workflowContainer) workflowContainer.innerHTML = renderItems(workflowItems, 'workflow');

        // Add a "Load Defaults" button if both lists are empty (Pro only)
        const checklistSection = document.getElementById('project-checklists-container') || document.querySelector('.project-checklists');
        if (checklistSection) {
            let loadBtn = document.getElementById('load-defaults-btn');
            if (items.length === 0) {
                const profile = await Store.getUserProfile();
                if (!loadBtn && profile?.plan !== 'starter') {
                    const cleanProjectId = (projectId && projectId !== 'null') ? `'${projectId}'` : 'null';
                    const btnHtml = `<button id="load-defaults-btn" type="button" class="btn btn-secondary btn-sm" style="width:100%; margin-bottom: 12px;" onclick="app.loadProjectDefaults(${cleanProjectId})">טעינת רשימות ברירת מחדל</button>`;
                    checklistSection.insertAdjacentHTML('beforeend', btnHtml);
                }
            } else if (loadBtn) {
                loadBtn.remove();
            }
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    },

    async renderLogs() {
        const logs = await Store.getActionLogs(100);
        
        let html = `
            <div class="logs-container" style="background: white; border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden;">
                <div style="padding: 16px 24px; border-bottom: 2px solid var(--bg-main); display: flex; justify-content: space-between; align-items: center; background: #F9FAFB;">
                    <div style="font-weight: 700; color: var(--text-main);">100 הפעולות האחרונות במערכת</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${logs.length} פעולות תועדו</div>
                </div>
                <div class="logs-list">
                    ${logs.length === 0 ? 
                        '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין פעולות מתועדות.</div>' : 
                        logs.map(log => {
                            const date = new Date(log.created_at);
                            const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
                            
                            let icon = 'activity';
                            let color = '#64748b'; // default slate-500
                            
                            const action = (log.action || '').toLowerCase();
                            const details = (log.details || '').toLowerCase();

                            if (action.includes('צירף/פה') || action.includes('יצר/ה') || action.includes('create') || action.includes('add')) {
                                icon = 'plus-circle';
                                color = '#10b981'; // emerald-500
                            } else if (action.includes('מחק') || action.includes('delete') || action.includes('remove')) {
                                icon = 'trash-2';
                                color = '#ef4444'; // red-500
                            } else if (action.includes('עדכן') || action.includes('שינה') || action.includes('update') || action.includes('change')) {
                                icon = 'edit-3';
                                color = '#3b82f6'; // blue-500
                            } else if (action.includes('השלמ') || action.includes('בוצע') || action.includes('complete') || action.includes('finish')) {
                                icon = 'check-circle';
                                color = '#8b5cf6'; // violet-500
                            }
                            
                            return `
                                <div class="log-item" style="display: flex; align-items: flex-start; gap: 16px; padding: 16px 24px; border-bottom: 1px solid var(--bg-main); transition: background 0.2s;">
                                    <div style="background: ${color}15; color: ${color}; padding: 8px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <i data-lucide="${icon}" style="width: 18px; height: 18px;"></i>
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px; line-height: 1.4;">${log.details || log.action}</div>
                                        <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap;">
                                            <span style="display: flex; align-items: center; gap: 4px;">
                                                <i data-lucide="calendar" style="width: 12px;"></i>
                                                ${dateStr}
                                            </span>
                                            <span style="display: flex; align-items: center; gap: 4px;">
                                                <i data-lucide="clock" style="width: 12px;"></i>
                                                ${timeStr}
                                            </span>
                                            ${log.entity_type ? `<span style="background: var(--bg-main); padding: 0 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">${this.getEntityLabel(log.entity_type)}</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
            <style>
                .log-item:hover {
                    background: #F9FAFB;
                }
                .log-item:last-child {
                    border-bottom: none;
                }
                .log-client-link {
                    color: var(--primary);
                    text-decoration: underline;
                    cursor: pointer;
                    font-weight: 600;
                }
                .log-client-link:hover {
                    color: var(--primary-dark);
                }
            </style>
        `;
        
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'יומן פעולות';
        document.getElementById('view-subtitle').innerText = 'מעקב אחרי 100 הפעולות האחרונות שבוצעו במערכת.';
        if (window.lucide) {
        lucide.createIcons({
            root: document.getElementById('view-container')
        });
    }
    },

    getEntityLabel(type) {
        const labels = {
            'client': 'לקוח',
            'project': 'פרויקט',
            'task': 'משימה',
            'package': 'חבילה',
            'location': 'לוקיישן',
            'note': 'הערה',
            'settings': 'הגדרות',
            'document': 'מסמך'
        };
        return labels[type] || type;
    },

    async renderDocuments(clientId = null, projectId = null) {
        const containerId = projectId ? 'project-documents-list' : 'client-documents-list';
        const container = document.getElementById(containerId);
        if (!container) return;

        const docs = await Store.getDocuments(clientId, projectId);

        if (docs.length === 0) {
            const profile = await Store.getUserProfile();
            if (profile?.plan === 'starter') {
                container.innerHTML = '';
            } else {
                container.innerHTML = '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:16px; border:1px dashed var(--border); border-radius:var(--radius-md);">עדיין לא הועלו מסמכים.</div>';
            }
            return;
        }

        // If rendering for client (not project-specific), get project names for display
        let projectNames = {};
        let clientProjects = [];
        if (clientId && !projectId) {
            clientProjects = await Store.getProjects(clientId);
            clientProjects.forEach(p => { projectNames[p.id] = p.name; });
        }

        container.innerHTML = docs.map(doc => {
            const sizeKB = (doc.file_size / 1024).toFixed(1);
            const sizeDisplay = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
            const dateStr = new Date(doc.created_at).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit' });
            const fileIcon = this._getFileIcon(doc.file_type);

            let projectDisplay = '';
            if (clientId && !projectId) {
                // Interactive dropdown to re-assign projects from the client view
                const options = clientProjects.map(p => 
                    `<option value="${p.id}" ${String(doc.project_id) === String(p.id) ? 'selected' : ''}>${p.name}</option>`
                ).join('');
                projectDisplay = `
                    <select onchange="app.changeDocumentProject('${doc.id}', this.value, '${clientId}')" style="font-size:0.75rem; padding:2px; border-radius:4px; border:1px solid var(--border); max-width:140px; background:var(--bg-main); text-overflow:ellipsis; cursor:pointer;" title="שנה פרויקט">
                        <option value="">ללא שיוך פרויקט</option>
                        ${options}
                    </select>
                `;
            } else if (doc.project_id && projectNames[doc.project_id]) {
                projectDisplay = `<span style="background:var(--primary-light); color:var(--primary); padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:600;">${projectNames[doc.project_id]}</span>`;
            }

            return `
                <div class="document-card" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--border); border-radius:var(--radius-md); transition:all 0.2s; background:white;">
                    <div style="background:${fileIcon.bg}; color:${fileIcon.color}; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i data-lucide="${fileIcon.icon}" style="width:20px; height:20px;"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${doc.file_name}">${doc.file_name}</div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:4px;">
                            <span style="font-size:0.75rem; color:var(--text-muted);">${sizeDisplay}</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">•</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</span>
                            ${projectDisplay}
                        </div>
                        ${doc.description ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${doc.description}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" class="btn-icon" onclick="app.downloadDocument('${doc.file_path}')" title="הורדה" style="color:var(--primary);">
                            <i data-lucide="download" style="width:16px; height:16px;"></i>
                        </button>
                        <button type="button" class="btn-icon" onclick="app.deleteDocument('${doc.id}', '${clientId || ''}', '${projectId || ''}')" title="מחיקה" style="color:#EF4444;">
                            <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) {
            lucide.createIcons({ root: document.getElementById('view-container') });
        }
    },

    _getFileIcon(mimeType) {
        if (!mimeType) return { icon: 'file', bg: '#F3F4F6', color: '#6B7280' };
        
        if (mimeType.startsWith('image/')) return { icon: 'image', bg: '#DBEAFE', color: '#3B82F6' };
        if (mimeType === 'application/pdf') return { icon: 'file-text', bg: '#FEE2E2', color: '#EF4444' };
        if (mimeType.includes('word') || mimeType.includes('document')) return { icon: 'file-text', bg: '#DBEAFE', color: '#2563EB' };
        if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return { icon: 'table', bg: '#D1FAE5', color: '#059669' };
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { icon: 'presentation', bg: '#FEF3C7', color: '#D97706' };
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return { icon: 'archive', bg: '#E5E7EB', color: '#4B5563' };
        if (mimeType.startsWith('video/')) return { icon: 'video', bg: '#EDE9FE', color: '#7C3AED' };
        if (mimeType.startsWith('audio/')) return { icon: 'music', bg: '#FCE7F3', color: '#DB2777' };
        
        return { icon: 'file', bg: '#F3F4F6', color: '#6B7280' };
    }
};

window.UI = UI;
