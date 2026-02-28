const Admin = {
    _impersonatingUserId: null,
    _impersonatingEmail: null,

    isAdmin() {
        return Auth.session?.user?.email === 'shaharsolutions@gmail.com';
    },

    async renderAdminPage() {
        const container = document.getElementById('view-container');
        document.getElementById('view-title').innerText = 'ממשק מנהל מערכת';
        document.getElementById('view-subtitle').innerText = 'נתוני שימוש וסטטיסטיקות של כל המשתמשים';
        
        container.innerHTML = `
            <div class="empty-state">
                <span class="spinner" style="border-top-color: var(--primary);"></span> טוען נתונים...
            </div>
        `;

        try {
            // Fetch ALL sessions
            let sessions = [];
            try {
                const { data, error } = await sb
                    .from('user_sessions')
                    .select('*')
                    .order('login_time', { ascending: false });
                if (!error) sessions = (data || []).filter(s => s.user_email !== 'shaharsolutions@gmail.com');
            } catch (e) {
                console.warn('user_sessions table may not exist yet');
            }

            // Fetch ALL clients (admin RLS allows seeing all)
            const { data: allClients } = await sb.from('clients').select('user_id, name, id');

            // Fetch ALL projects (admin RLS allows seeing all)
            const { data: allProjects } = await sb.from('projects').select('user_id, name, id, status, shoot_date, clients(name)').order('created_at', { ascending: false });

            // Fetch ALL action_logs
            const { data: allLogs } = await sb.from('action_logs').select('user_id, action, details, created_at').order('created_at', { ascending: false }).limit(50);

            // Fetch ALL user profiles for stable identity
            let profiles = [];
            try {
                const { data } = await sb.from('user_profiles').select('*');
                profiles = data || [];
            } catch (pE) {}

            // Build user map
            const userMap = {};
            
            // Prime map with profiles
            profiles.forEach(p => {
                userMap[p.user_id] = {
                    user_email: p.email,
                    user_id: p.user_id,
                    total_logins: 0,
                    total_time_minutes: 0,
                    last_login: null,
                    total_clients: 0,
                    total_projects: 0
                };
            });
            
            // Also gather unique users from clients/projects even if no sessions
            const addUser = (userId, email) => {
                if (!userId) return;
                if (!userMap[userId]) {
                    userMap[userId] = {
                        user_email: email || 'לא ידוע',
                        user_id: userId,
                        total_logins: 0,
                        total_time_minutes: 0,
                        last_login: null,
                        total_clients: 0,
                        total_projects: 0
                    };
                }
            };

            (sessions || []).forEach(s => {
                addUser(s.user_id, s.user_email);
                const u = userMap[s.user_id];
                u.total_logins++;
                u.total_time_minutes += (s.duration_minutes || 0);
                if (!u.last_login || new Date(s.login_time) > new Date(u.last_login)) {
                    u.last_login = s.login_time;
                }
            });

            (allClients || []).forEach(c => {
                addUser(c.user_id, null);
                if (userMap[c.user_id]) userMap[c.user_id].total_clients++;
            });

            (allProjects || []).forEach(p => {
                addUser(p.user_id, null);
                if (userMap[p.user_id]) userMap[p.user_id].total_projects++;
            });

            const users = Object.values(userMap);
            users.sort((a, b) => {
                if (!a.last_login) return 1;
                if (!b.last_login) return -1;
                return new Date(b.last_login) - new Date(a.last_login);
            });

            // Store data for filtering
            this._adminData = { users, allProjects: allProjects || [], allClients: allClients || [], sessions, allLogs: allLogs || [] };

            // Summary cards
            const totalUsers = users.length;
            const totalSessions = sessions.length;
            const totalMinutes = users.reduce((sum, u) => sum + u.total_time_minutes, 0);
            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;
            const totalProjectsCount = (allProjects || []).length;
            const totalClientsCount = (allClients || []).length;

            let html = `
                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 16px;">
                    <button onclick="Admin.seedDemoData()" class="btn btn-secondary btn-sm" id="btn-seed-demo" style="display: inline-flex; align-items: center; justify-content: flex-start; gap: 8px; min-width: 140px; padding: 6px 16px; text-align: right; color: var(--primary); border-color: var(--primary-light); flex-direction: row;">
                        <i data-lucide="database" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
                        <span style="flex-grow: 1;">הוסף נתוני דמו</span>
                    </button>
                    <button onclick="Admin.deleteDemoData()" class="btn btn-secondary btn-sm" id="btn-delete-demo" style="display: inline-flex; align-items: center; justify-content: flex-start; gap: 8px; min-width: 140px; padding: 6px 16px; text-align: right; color: #EF4444; border-color: #FECACA; flex-direction: row;">
                        <i data-lucide="trash" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
                        <span style="flex-grow: 1;">מחק נתוני דמו</span>
                    </button>
                    <button onclick="Admin.exportToExcel()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; justify-content: flex-start; gap: 8px; min-width: 140px; padding: 6px 16px; text-align: right; flex-direction: row;">
                        <i data-lucide="download" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
                        <span style="flex-grow: 1;">ייצוא לאקסל</span>
                    </button>
                    <button onclick="Admin.resetUsageData()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; justify-content: flex-start; gap: 8px; min-width: 140px; padding: 6px 16px; text-align: right; color: #EF4444; border-color: #FECACA; flex-direction: row;">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
                        <span style="flex-grow: 1;">איפוס נתוני שימוש</span>
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${totalUsers}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">משתמשים</div>
                    </div>
                    <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${totalClientsCount}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">לקוחות</div>
                    </div>
                    <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${totalProjectsCount}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">פרויקטים</div>
                    </div>
                    <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${totalSessions}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">כניסות</div>
                    </div>
                    <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); text-align: center;">
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${totalHours}:${String(remainingMinutes).padStart(2, '0')}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">שעות שימוש</div>
                    </div>
                </div>
            `;

            // --- Users Table ---
            html += `
                <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); overflow-x: auto; margin-bottom: 24px;">
                    <h3 style="margin-bottom: 16px; font-size: 1.1rem;">👥 סיכום משתמשים</h3>
                    <table style="width: 100%; border-collapse: collapse; text-align: right; min-width: 650px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                                <th style="padding: 10px 16px;">משתמש</th>
                                <th style="padding: 10px 16px; text-align: center;">לקוחות</th>
                                <th style="padding: 10px 16px; text-align: center;">פרויקטים</th>
                                <th style="padding: 10px 16px; text-align: center;">כניסות</th>
                                <th style="padding: 10px 16px; text-align: center;">זמן כולל</th>
                                <th style="padding: 10px 16px;">כניסה אחרונה</th>
                                <th style="padding: 10px 16px; text-align: center;">פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            users.forEach(stat => {
                const lastLogin = stat.last_login ? new Date(stat.last_login).toLocaleString('he-IL') : '-';
                const hours = Math.floor(stat.total_time_minutes / 60);
                const mins = stat.total_time_minutes % 60;
                const timeDisplay = hours > 0 ? `${hours} שע' ${mins} דק'` : `${mins} דק'`;
                
                const isAdminUser = stat.user_email === 'shaharsolutions@gmail.com';
                html += `
                    <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" 
                        onmouseover="this.style.background='var(--bg-main)'" 
                        onmouseout="this.style.background='white'">
                        <td style="padding: 14px 16px; font-weight: 500; cursor: pointer;" onclick="Admin.filterByUser('${stat.user_id}')">${stat.user_email}</td>
                        <td style="padding: 14px 16px; text-align: center;">${stat.total_clients}</td>
                        <td style="padding: 14px 16px; text-align: center;">${stat.total_projects}</td>
                        <td style="padding: 14px 16px; text-align: center;">${stat.total_logins}</td>
                        <td style="padding: 14px 16px; text-align: center;">${timeDisplay}</td>
                        <td style="padding: 14px 16px; color: var(--text-muted); font-size: 0.9rem;">${lastLogin}</td>
                        <td style="padding: 14px 16px; text-align: center;">
                            ${!isAdminUser ? `<button onclick="Admin.startImpersonating('${stat.user_id}', '${stat.user_email}')" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap;">👁️ צפייה כמשתמש</button>` : '<span style="color: var(--text-muted); font-size: 0.8rem;">מנהל</span>'}
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;

            // --- Projects Section with Filter ---
            html += `
                <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); overflow-x: auto; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <h3 style="font-size: 1.1rem; margin: 0;">📋 כל הפרויקטים</h3>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <label style="font-size: 0.85rem; color: var(--text-muted);">סינון לפי משתמש:</label>
                            <select id="admin-user-filter" onchange="Admin.filterByUser(this.value)" style="padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.9rem;">
                                <option value="all">כל המשתמשים</option>
            `;

            users.forEach(u => {
                html += `<option value="${u.user_id}">${u.user_email}</option>`;
            });

            html += `
                            </select>
                        </div>
                    </div>
                    <div id="admin-projects-table">
            `;

            html += this._renderProjectsTable(allProjects || [], userMap);

            html += `
                    </div>
                </div>
            `;

            // --- Recent Sessions ---
            html += `
                <div style="background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); overflow-x: auto;">
                    <h3 style="margin-bottom: 16px; font-size: 1.1rem;">🕐 כניסות אחרונות</h3>
                    <table style="width: 100%; border-collapse: collapse; text-align: right; min-width: 550px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                                <th style="padding: 10px 16px;">משתמש</th>
                                <th style="padding: 10px 16px;">זמן כניסה</th>
                                <th style="padding: 10px 16px; text-align: center;">משך (דקות)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const recentSessions = sessions.slice(0, 30);
            if (recentSessions.length > 0) {
                recentSessions.forEach(s => {
                    const loginTime = new Date(s.login_time).toLocaleString('he-IL');
                    const logoutTime = s.logout_time ? new Date(s.logout_time).toLocaleString('he-IL') : '<span style="color: #10B981; font-weight: 500;">🟢 מחובר</span>';
                    
                    html += `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 10px 16px; font-size: 0.9rem;">${s.user_email}</td>
                            <td style="padding: 10px 16px; font-size: 0.9rem; color: var(--text-muted);">${loginTime}</td>
                            <td style="padding: 10px 16px; text-align: center;">${s.duration_minutes || 0}</td>
                        </tr>
                    `;
                });
            } else {
                html += `<tr><td colspan="3" style="padding: 20px; text-align: center; color: var(--text-muted);">אין נתוני כניסות עדיין</td></tr>`;
            }

            html += `</tbody></table></div>`;
            
            container.innerHTML = html;
            if (window.lucide) lucide.createIcons();
        } catch (error) {
            console.error('Admin page error:', error);
            container.innerHTML = `
                <div class="empty-state" style="color: #EF4444;">
                    <i data-lucide="alert-circle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
                    <div style="font-weight: 600; font-size: 1.1rem;">שגיאה בטעינת נתוני מנהל</div>
                    <div style="font-size: 0.9rem; margin-top: 8px; max-width: 400px; color: var(--text-muted);">${error.message}</div>
                    <div style="font-size: 0.85rem; margin-top: 16px; color: var(--text-muted);">
                        יש להריץ את הקובץ <code>db/admin_setup.sql</code> ב-SQL Editor של Supabase.
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        }
    },

    _renderProjectsTable(projects, userMap) {
        const statusLabels = {
            'new': 'פנייה חדשה',
            'quote': 'הצעת מחיר',
            'closed': 'נסגר',
            'not_closed': 'לא נסגר',
            'shooting': 'בצילום',
            'editing': 'בעריכה',
            'delivered': 'נמסר',
            'published': 'פורסם',
            'archived': 'ארכיון'
        };

        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: right; min-width: 650px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                        <th style="padding: 10px 16px;">פרויקט</th>
                        <th style="padding: 10px 16px;">לקוח</th>
                        <th style="padding: 10px 16px;">סטטוס</th>
                        <th style="padding: 10px 16px;">תאריך צילום</th>
                        <th style="padding: 10px 16px;">משתמש (בעלים)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (projects.length > 0) {
            projects.forEach(p => {
                const clientName = p.clients?.name || (Array.isArray(p.clients) ? p.clients[0]?.name : '') || '-';
                const statusLabel = statusLabels[p.status] || p.status || '-';
                const shootDate = p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('he-IL') : '-';
                const ownerEmail = userMap[p.user_id]?.user_email || p.user_id?.substring(0, 8) + '...' || '-';

                html += `
                    <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;"
                        onmouseover="this.style.background='var(--bg-main)'" 
                        onmouseout="this.style.background='white'">
                        <td style="padding: 12px 16px; font-weight: 500;">${p.name}</td>
                        <td style="padding: 12px 16px;">${clientName}</td>
                        <td style="padding: 12px 16px;"><span class="badge badge-${p.status || 'new'}" style="font-size: 0.8rem;">${statusLabel}</span></td>
                        <td style="padding: 12px 16px; color: var(--text-muted);">${shootDate}</td>
                        <td style="padding: 12px 16px; font-size: 0.85rem; color: var(--primary);">${ownerEmail}</td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">אין פרויקטים</td></tr>`;
        }

        html += `</tbody></table>`;
        return html;
    },

    filterByUser(userId) {
        if (!this._adminData) return;

        const { allProjects, users } = this._adminData;
        const userMap = {};
        users.forEach(u => { userMap[u.user_id] = u; });

        // Update dropdown
        const dropdown = document.getElementById('admin-user-filter');
        if (dropdown) dropdown.value = userId;

        // Filter projects
        const filtered = userId === 'all' 
            ? allProjects 
            : allProjects.filter(p => p.user_id === userId);

        // Re-render only the projects table
        const tableContainer = document.getElementById('admin-projects-table');
        if (tableContainer) {
            tableContainer.innerHTML = this._renderProjectsTable(filtered, userMap);
        }
    },

    startImpersonating(userId, userEmail) {
        if (!this.isAdmin()) return;
        this._impersonatingUserId = userId;
        this._impersonatingEmail = userEmail;

        // Show banner
        const banner = document.getElementById('impersonation-banner');
        const emailSpan = document.getElementById('impersonation-email');
        if (banner) banner.classList.remove('hidden');
        if (emailSpan) emailSpan.textContent = userEmail;

        // Flag impersonation on body for CSS adjustments
        document.body.classList.add('impersonation-active');

        // Navigate to dashboard as the impersonated user
        app.initialized = false;
        app.init();
    },

    stopImpersonating() {
        this._impersonatingUserId = null;
        this._impersonatingEmail = null;

        // Hide banner
        const banner = document.getElementById('impersonation-banner');
        if (banner) banner.classList.add('hidden');

        // Reset body class
        document.body.classList.remove('impersonation-active');

        // Reinitialize as admin
        app.initialized = false;
        app.init();
    },

    exportToExcel() {
        if (!this._adminData) return;
        const { users } = this._adminData;
        
        // Prepare CSV data
        const headers = ["אימייל", "לקוחות", "פרויקטים", "כניסות", "זמן סה\"כ (דקות)", "כניסה אחרונה"];
        const rows = users.map(u => [
            u.user_email,
            u.total_clients,
            u.total_projects,
            u.total_logins,
            u.total_time_minutes,
            u.last_login || "N/A"
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `centra_usage_stats_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async resetUsageData() {
        app.confirmAction(
            'איפוס נתוני שימוש',
            'האם בטוח/ה שברצונך לאפס את כל נתוני השימוש?<br><br>פעולה זו תמחק את כל היסטוריית הכניסות (user_sessions) של כל המשתמשים.<br><b>פעולה זו אינה הפיכה!</b>',
            async () => {
                try {
                    const { error } = await sb.from('user_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
                    if (error) throw error;
                    
                    app.confirmAction(
                        'סיום פעולה',
                        '<b>נתוני השימוש אופסו בהצלחה.</b>',
                        null,
                        true,
                        'סגור',
                        'var(--primary)'
                    );
                    this.renderAdminPage(); // Refresh
                } catch (e) {
                    console.error('Error resetting usage data:', e);
                    app.confirmAction(
                        'שגיאה',
                        `<b>תקלה באיפוס נתוני השימוש:</b><br>${e.message}`,
                        null,
                        true,
                        'סגור',
                        '#EF4444'
                    );
                }
            },
            false,
            'כן, לאפס',
            '#EF4444'
        );
    },

    async seedDemoData() {
        app.confirmAction(
            'הוספת נתוני דמו',
            'האם אתה בטוח שברצונך להוסיף <b>נתוני דמו</b>?<br><br>פעולה זו תיצור 3 משתמשים חדשים עם לקוחות, פרויקטים ומשימות לדוגמה לצורך הדגמה.',
            async () => {
                const btn = document.getElementById('btn-seed-demo');
                const originalHtml = btn ? btn.innerHTML : '';
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = 'מייצר נתונים...';
                }

                try {
                    const photographers = [
                        { id: '11111111-1111-1111-1111-111111111111', email: 'demo.maya@centra.pro', name: 'מאיה צילום אמנותי' },
                        { id: '22222222-2222-2222-2222-222222222222', email: 'demo.itai@centra.pro', name: 'איתי סטודיו' },
                        { id: '33333333-3333-3333-3333-333333333333', email: 'demo.noa@centra.pro', name: 'נועה צילומי חוץ' }
                    ];

                    for (const ph of photographers) {
                        console.log(`Seeding data for: ${ph.name}`);
                        // 1. Create Profile
                        const { error: profErr } = await sb.from('user_profiles').upsert({
                            user_id: ph.id,
                            email: ph.email,
                            full_name: ph.name,
                            last_seen: new Date().toISOString()
                        }, { onConflict: 'user_id' });

                        if (profErr) {
                            console.error(`Profile error for ${ph.name}:`, profErr);
                        }

                        // 2. Create Clients and Projects with matching logic
                        const demoClients = [
                            { name: 'משפחת לוי', org: '', type: 'private', email: 'family@demo.com' },
                            { name: 'חברת אינובייט', org: 'אינובייט בע"מ', type: 'business', email: 'hr@innovate.demo' },
                            { name: 'שירה כהן', org: '', type: 'private', email: 'shira@demo.com' }
                        ];

                        const projectPool = {
                            private: ['חתונה', 'בוק בת מצווה', 'צילומי משפחה', 'צילומי הריון'],
                            business: ['צילומי תדמית', 'צילומי מוצר', 'יום גיבוש', 'צילומי אדריכלות']
                        };

                        for (const clientData of demoClients) {
                            const { data: client } = await sb.from('clients').insert({
                                user_id: ph.id,
                                name: clientData.name,
                                organization: clientData.org,
                                email: clientData.email,
                                phone: `050-123${Math.floor(1000 + Math.random() * 9000)}`
                            }).select().single();

                            if (!client) continue;

                            // 3. Create Projects (1-2 per client)
                            const numProjects = Math.floor(Math.random() * 2) + 1;
                            const availableTypes = projectPool[clientData.type];
                            
                            for (let j = 0; j < numProjects; j++) {
                                const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                                const statuses = ['not_paid', 'deposit', 'paid_full'];
                                
                                const { data: project, error: pErr } = await sb.from('projects').insert({
                                    user_id: ph.id,
                                    client_id: client.id,
                                    name: type,
                                    status: ['new', 'quote', 'shooting', 'editing', 'delivered'][Math.floor(Math.random() * 5)],
                                    shoot_date: new Date(Date.now() + (Math.random() * 60 - 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    payments: { total: 2500, deposit: 500 },
                                    payment_status: statuses[Math.floor(Math.random() * statuses.length)]
                                }).select().single();

                                if (pErr) console.error('Project creation failed:', pErr);
                                if (!project) continue;

                                // 4. Create Tasks
                                const tasks = [
                                    { project_id: project.id, content: 'פגישת היכרות', is_completed: true, user_id: ph.id, category: 'shoot' },
                                    { project_id: project.id, content: 'הכנת ציוד וגיבוי סוללות', is_completed: true, user_id: ph.id, category: 'equipment' },
                                    { project_id: project.id, content: 'יום הצילום', is_completed: project.status !== 'new' && project.status !== 'quote', user_id: ph.id, category: 'shoot' },
                                    { project_id: project.id, content: 'עריכה וסינון תמונות', is_completed: project.status === 'delivered', user_id: ph.id, category: 'shoot' }
                                ];
                                await sb.from('project_checklists').insert(tasks);
                            }
                        }

                        // 5. Add a simulated session
                        const { error: sErr } = await sb.from('user_sessions').insert({
                            id: crypto.randomUUID(), // Explicit UUID to avoid DB default issues or collisions
                            user_id: ph.id,
                            user_email: ph.email,
                            login_time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
                            duration_minutes: Math.floor(Math.random() * 120) + 10
                        });
                        if (sErr) console.error(`Session error for ${ph.name}:`, sErr);
                    }

                    app.confirmAction(
                        'סיום פעולה',
                        '<b>נתוני הדמו נוצרו בהצלחה!</b><br><br>כעת נוספו למערכת 3 צלמים פיקטיביים עם לקוחות ופרויקטים תואמים.',
                        null,
                        true,
                        'מעולה',
                        'var(--primary)'
                    );
                    this.renderAdminPage();
                } catch (error) {
                    console.error('Error seeding demo data:', error);
                    app.confirmAction(
                        'שגיאה',
                        `<b>תקלה ביצירת נתונים:</b><br>${error.message}`,
                        null,
                        true,
                        'סגור',
                        '#EF4444'
                    );
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                    if (window.lucide) lucide.createIcons();
                }
            },
            false,
            'כן, הוסף',
            'var(--primary)'
        );
    },

    async deleteDemoData() {
        app.confirmAction(
            'מחיקת נתוני דמו',
            'האם אתה בטוח שברצונך <b>למחוק</b> את כל נתוני הדמו?<br><br>פעולה זו תמחק את 3 המשתמשים הפיקטיביים ואת כל הנתונים הקשורים אליהם מהדאטאבייס.',
            async () => {
                const btn = document.getElementById('btn-delete-demo');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = 'מוחק נתונים...';
                }

                try {
                    const demoUserIds = [
                        '11111111-1111-1111-1111-111111111111',
                        '22222222-2222-2222-2222-222222222222',
                        '33333333-3333-3333-3333-333333333333'
                    ];

                    // Delete from all tables for these users
                    for (const userId of demoUserIds) {
                        await sb.from('project_checklists').delete().eq('user_id', userId);
                        await sb.from('projects').delete().eq('user_id', userId);
                        await sb.from('clients').delete().eq('user_id', userId);
                        await sb.from('user_sessions').delete().eq('user_id', userId);
                        await sb.from('user_profiles').delete().eq('user_id', userId);
                        await sb.from('action_logs').delete().eq('user_id', userId);
                    }

                    app.confirmAction(
                        'סיום פעולה',
                        '<b>נתוני הדמו נמחקו בהצלחה.</b><br>כל המשתמשים הפיקטיביים והנתונים הקשורים אליהם הוסרו.',
                        null,
                        true,
                        'סגור',
                        'var(--primary)'
                    );
                    this.renderAdminPage();
                } catch (error) {
                    console.error('Error deleting demo data:', error);
                    app.confirmAction(
                        'שגיאה',
                        `<b>תקלה במחיקת נתונים:</b><br>${error.message}`,
                        null,
                        true,
                        'סגור',
                        '#EF4444'
                    );
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = 'מחיקת נתוני דמו';
                    }
                    this.renderAdminPage();
                    if (window.lucide) lucide.createIcons();
                }
            },
            false,
            'כן, למחוק',
            '#EF4444'
        );
    }
};

window.Admin = Admin;
