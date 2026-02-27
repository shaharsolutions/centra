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

        // Shift app content down
        document.getElementById('app').style.marginTop = '48px';

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

        // Reset app content position
        document.getElementById('app').style.marginTop = '0';

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
                    
                    alert('נתוני השימוש אופסו בהצלחה.');
                    this.renderAdminPage(); // Refresh
                } catch (e) {
                    console.error('Error resetting usage data:', e);
                    alert('תקלה באיפוס נתוני השימוש: ' + e.message);
                }
            }
        );
    }
};

window.Admin = Admin;
