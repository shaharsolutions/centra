const supabaseUrl = CONFIG.supabaseUrl;
const supabaseKey = CONFIG.supabaseKey;
const sb = supabase.createClient(supabaseUrl, supabaseKey);

const Store = {
    defaults: {
        statuses: [
            { id: 'new', label: 'פנייה חדשה', class: 'badge-new' },
            { id: 'quote', label: 'הצעת מחיר', class: 'badge-quote' },
            { id: 'closed', label: 'נסגר', class: 'badge-closed' },
            { id: 'not_closed', label: 'לא נסגר', class: 'badge-not-closed' },
            { id: 'shooting', label: 'בצילום', class: 'badge-shooting' },
            { id: 'editing', label: 'בעריכה', class: 'badge-editing' },
            { id: 'delivered', label: 'נמסר', class: 'badge-delivered' },
            { id: 'published', label: 'פורסם', class: 'badge-published' },
            { id: 'archived', label: 'ארכיון', class: 'badge-archived' }
        ],
        locations: [
            { id: 1, title: 'יפו העתיקה', region: 'center', type: 'urban', description: 'סמטאות אבן ציוריות, נמל עתיק ומבני אבן היסטוריים. מושלם לצילומי זוגות ואופנה.' },
            { id: 2, title: 'נחל השופט', region: 'north', type: 'nature', description: 'מסלול הליכה נגיש עם זרימת מים כל השנה, צמחייה עשירה וגשרים מעץ. מומלץ לצילומי משפחה.' },
            { id: 3, title: 'משכנות שאננים', region: 'jerusalem', type: 'urban', description: 'טחנת הרוח המפורסמת, בתי המושבה הראשונה ונוף לחומות העיר העתיקה. אווירה קסומה ומיוחדת.' },
            { id: 4, title: 'חוף פלמחים', region: 'center', type: 'beach', description: 'צוקי כורכר מרשימים, חול זהוב ושקיעות מרהיבות. המקום האידיאלי לצילומי הריון וזוגות.' },
            { id: 5, title: 'מכתש רמון', region: 'south', type: 'nature', description: 'נוף מדברי עוצר נשימה, תצורות סלע ייחודיות ומרחבים אינסופיים. לצילומים עם אווירה פראית.' },
            { id: 6, title: 'נווה צדק', region: 'center', type: 'urban', description: 'השכונה היהודית הראשונה מחוץ ליפו. בתי מידות משופצים, חנויות בוטיק וקירות צבעוניים.' },
            { id: 7, title: 'עין כרם', region: 'jerusalem', type: 'village', description: 'כפר ציורי בלב ירושלים. כנסיות, מנזרים ונופים ירוקים. אווירה אירופאית בלב הרי ירושלים.' },
            { id: 8, title: 'שדות הקיבוצים (שרון)', region: 'sharon', type: 'nature', description: 'שדות חיטה נובטים, פריחות עונתיות וטרקטורים ישנים. קלאסי לצילומי ילדים בטבע.' },
            { id: 9, title: 'מתחם התחנה (תל אביב)', region: 'center', type: 'urban', description: 'תחנת הרכבת הישנה של יפו. קרונות עץ, מבנים טמפלרים משוחזרים ואווירה של פעם.' },
            { id: 10, title: 'סטלה מאריס (חיפה)', region: 'north', type: 'nature', description: 'תצפית פנורמית מרהיבת על מפרץ חיפה והים, מנזר עתיק ומערת אליהו. מזכיר את איי יוון.' },
            { id: 11, title: 'מערות בית גוברין', region: 'south', type: 'nature', description: 'מערות פעמון ענקיות עם משחקי אור וצל טבעיים ומרשימים. חוויה צילומית ייחודית מתחת לאדמה.' },
            { id: 12, title: 'שפך נחל שורק', region: 'center', type: 'nature', description: 'דיונות חול, צמחיית נחל עשירה וגשר עץ מעל המים. מקום שקט עם תאורה טבעית מדהימה בשקיעה.' },
            { id: 13, title: 'גבעת התורמוסים', region: 'jerusalem', type: 'nature', description: 'פריחת תורמוסים כחולה וסגולה בתוך עמק האלה. מרהיב במיוחד בחודשים פברואר-מרץ.' },
            { id: 14, title: 'חוף האקוודוקט (קיסריה)', region: 'sharon', type: 'beach', description: 'קשתות אבן רומיות עתיקות על קו המים. שילוב מושלם של היסטוריה, ים וארכיטקטורה.' },
            { id: 15, title: 'ים המלח (הפטריות)', region: 'south', type: 'nature', description: 'התגבשויות מלח בצורת פטריות בתוך המים הכחולים. אחד הלוקיישנים הסוריאליסטיים והיפים בעולם.' }
        ],
        shabbatCities: [
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
        ]
    },

    async init() {
        // Clear cached data if a different user logged in
        const currentUserId = Auth.getUserId();
        const lastUserId = localStorage.getItem('last_user_id');
        if (currentUserId && lastUserId && currentUserId !== lastUserId) {
            // Different user - clear all cached data
            localStorage.removeItem('local_clients');
            localStorage.removeItem('local_projects');
            localStorage.removeItem('local_checklists');
            localStorage.removeItem('local_action_logs');
            localStorage.removeItem('local_client_extras');
            localStorage.removeItem('local_project_locations');
            localStorage.removeItem('local_project_payment_statuses');
            localStorage.removeItem('local_project_reasons');
            localStorage.removeItem('local_project_subjects');
            localStorage.removeItem('local_project_times');
            localStorage.removeItem('local_project_styling');
            localStorage.removeItem('local_project_pub_approval');
            
            // CRITICAL: Clear memory cache too!
            this.invalidateCache();
        }
        if (currentUserId) {
            localStorage.setItem('last_user_id', currentUserId);
        }

        // Always retry Supabase connectivity on fresh session
        // Clear cached failure flags so we re-check each time
        localStorage.removeItem('sb_checklists_missing');
        localStorage.removeItem('sb_checklists_rls_blocked');
        localStorage.removeItem('sb_checklists_notes_missing');

        this._checklistTableExists = true;
        this._notesColumnExists = true;
        this._rlsChecklistEnabled = true;

        try {
            const { error } = await sb.from('project_checklists').select('id', { count: 'exact', head: true }).limit(1);
            if (error && (error.code === '42P01' || error.status === 404)) {
                this._checklistTableExists = false;
                localStorage.setItem('sb_checklists_missing', 'true');
            } else if (error && (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('policy'))) {
                this._rlsChecklistEnabled = false;
                localStorage.setItem('sb_checklists_rls_blocked', 'true');
            }
        } catch (e) {}

        this._actionLogsTableExists = localStorage.getItem('sb_action_logs_missing') !== 'true';
        if (this._actionLogsTableExists !== false) {
            try {
                const { error } = await sb.from('action_logs').select('id', { count: 'exact', head: true }).limit(1);
                if (error && (error.code === '42P01' || error.status === 404)) {
                    this._actionLogsTableExists = false;
                    localStorage.setItem('sb_action_logs_missing', 'true');
                }
            } catch (e) {}
        }

        // Clean up any existing duplicates in local storage occasionally
        if (Math.random() < 0.1) this.cleanupDuplicates();

        // Sync local-only tasks to Supabase
        await this.syncLocalTasksToSupabase().catch(e => console.warn('Sync local tasks failed:', e));

        const { data: packages, error } = await sb.from('packages').select('*');
        if (error) {
            console.error('Error connecting to Supabase:', error);
        } else if (packages) {
            // Hydrate local storage with synced packages
            const localPackages = JSON.parse(localStorage.getItem('local_packages') || '[]');
            const newLocal = [...localPackages.filter(p => String(p.id).startsWith('local_'))];
            packages.forEach(dp => {
                if (!newLocal.some(lp => String(lp.id) === String(dp.id))) {
                    newLocal.push(dp);
                }
            });
            if (newLocal.length > localPackages.length) {
                localStorage.setItem('local_packages', JSON.stringify(newLocal));
            }
        }
        if (packages && packages.length === 0) {
            const initialPackages = [
                { name: 'סטילס בלבד - שעה', price: 800 },
                { name: 'סטילס בלבד - שעתיים', price: 1400 },
                { name: 'חבילת משפחה מורחבת', price: 2200 },
                { name: 'בוק בת מצווה פרימיום', price: 3500 }
            ];
            await sb.from('packages').insert(initialPackages);
        }

        // Clean up any existing duplicates in local storage occasionally
        if (Math.random() < 0.1) this.cleanupDuplicates();

        // Prefetch data to warm up the cache
        this.prefetchData();
    },

    async prefetchData() {
        if (!Auth.getUserId()) return;
        // Run in background
        Promise.all([
            this.getClients(),
            this.getProjects(),
            this.getAllTasks()
        ]).then(() => console.log('Cache warmed up')).catch(e => console.warn('Prefetch failed:', e));
    },

    _checklistTableExists: null,
    _actionLogsTableExists: null,
    _notesColumnExists: null,
    _rlsChecklistEnabled: null,

    _cache: {
        projects: null,
        clients: null,
        tasks: null,
        packages: null
    },

    invalidateCache(type) {
        if (type) {
            this._cache[type] = null;
        } else {
            this._cache.projects = null;
            this._cache.clients = null;
            this._cache.tasks = null;
            this._cache.packages = null;
        }
    },

    // Clients
    async getClients(forceRefresh = false) {
        if (!Auth.getUserId()) return [];
        if (!forceRefresh && this._cache.clients) return this._cache.clients;

        let dbClients = [];
        let localClients = JSON.parse(localStorage.getItem('local_clients') || '[]');

        try {
            const { data, error } = await sb
                .from('clients')
                .select('*')
                .eq('user_id', Auth.getUserId())
                .order('name');
            if (error) throw error;
            dbClients = data || [];
            
            // Hydrate local storage with synced clients
            if (dbClients.length > 0) {
                const syncedLocal = localClients.filter(c => !String(c.id).startsWith('local_'));
                const newLocal = [...localClients.filter(c => String(c.id).startsWith('local_'))];
                dbClients.forEach(dc => {
                    if (!newLocal.some(lc => String(lc.id) === String(dc.id))) {
                        newLocal.push(dc);
                    }
                });
                if (newLocal.length > localClients.length) {
                    localStorage.setItem('local_clients', JSON.stringify(newLocal));
                }
            }
        } catch (error) {
            console.warn('Error fetching clients from Supabase:', error.message);
        }
        
        // Merge DB and Local clients (only own user's data)
        const currentUserId = Auth.getUserId();
        const allClients = [...dbClients];
        localClients.forEach(lc => {
            if (!allClients.some(dc => String(dc.id) === String(lc.id))) {
                // Only include local clients that belong to current user or have no user_id (legacy)
                if (!lc.user_id || lc.user_id === currentUserId) {
                    allClients.push(lc);
                }
            }
        });

        const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
        
        const results = allClients.map(c => ({
            ...c,
            city: localExtras[c.id]?.city || c.city,
            email: localExtras[c.id]?.email || c.email,
            instagram: localExtras[c.id]?.instagram || c.instagram,
            facebook: localExtras[c.id]?.facebook || c.facebook,
            website: localExtras[c.id]?.website || c.website
        }));

        this._cache.clients = results;
        return results;
    },

    async saveClient(client) {
        const dbClient = {
            name: client.name,
            organization: client.organization || null,
            phone: client.phone,
            source: client.source,
            user_id: Auth.getUserId()
        };

        let savedClientData = null;
        try {
            if (client.id && !String(client.id).startsWith('local_')) {
                const { data, error } = await sb.from('clients').update(dbClient).eq('id', client.id).select();
                if (error) throw error;
                savedClientData = data[0];
            } else {
                const { data, error } = await sb.from('clients').insert([dbClient]).select();
                if (error) throw error;
                savedClientData = data[0];
            }
        } catch (e) {
            console.warn('Supabase client save failed, attempting fallback:', e.message);
            if (e.message?.includes('column') || e.status === 400) {
                try {
                    const fallbackClient = { ...dbClient };
                    delete fallbackClient.organization;
                    
                    if (client.id && !String(client.id).startsWith('local_')) {
                        const { data, error } = await sb.from('clients').update(fallbackClient).eq('id', client.id).select();
                        if (error) throw error;
                        savedClientData = data[0];
                    } else {
                        const { data, error } = await sb.from('clients').insert([fallbackClient]).select();
                        if (error) throw error;
                        savedClientData = data[0];
                    }
                } catch (innerE) {
                    console.error('Final Supabase client retry failed:', innerE.message);
                }
            }
        }

        const finalClient = savedClientData ? { ...dbClient, ...savedClientData } : {
            ...dbClient,
            id: client.id || 'local_client_' + Date.now(),
            created_at: new Date().toISOString()
        };

        // Sync with local storage
        const localClients = JSON.parse(localStorage.getItem('local_clients') || '[]');
        const existingIdx = localClients.findIndex(c => String(c.id) === String(finalClient.id) || (c.name === finalClient.name && c.phone === finalClient.phone));
        if (existingIdx !== -1) localClients[existingIdx] = finalClient;
        else localClients.push(finalClient);
        localStorage.setItem('local_clients', JSON.stringify(localClients));

        // Save extras
        const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
        localExtras[finalClient.id] = {
            city: client.city,
            email: client.email,
            instagram: client.instagram,
            facebook: client.facebook,
            website: client.website
        };
        localStorage.setItem('local_client_extras', JSON.stringify(localExtras));
        
        this.invalidateCache('clients');
        return finalClient;
    },

    async deleteClient(id) {
        const { error } = await sb.from('clients').delete().eq('id', id);
        if (error) throw error;

        // Sync with local storage
        let localClients = JSON.parse(localStorage.getItem('local_clients') || '[]');
        localClients = localClients.filter(c => String(c.id) !== String(id));
        localStorage.setItem('local_clients', JSON.stringify(localClients));

        // Remove extras
        const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
        delete localExtras[id];
        localStorage.setItem('local_client_extras', JSON.stringify(localExtras));
        this.invalidateCache('clients');
    },

    // Projects
    async getProjects(clientId = null, forceRefresh = false) {
        if (!Auth.getUserId()) return [];
        if (!clientId && !forceRefresh && this._cache.projects) return this._cache.projects;

        let dbProjects = [];
        let localProjects = JSON.parse(localStorage.getItem('local_projects') || '[]');

        try {
            let query = sb.from('projects').select('*, clients(name, organization)').eq('user_id', Auth.getUserId());
            if (clientId) {
                query = query.eq('client_id', clientId);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            dbProjects = data || [];

            // Hydrate local storage with synced projects
            if (dbProjects.length > 0 && !clientId) {
                const newLocal = [...localProjects.filter(p => String(p.id).startsWith('local_'))];
                dbProjects.forEach(dp => {
                    if (!newLocal.some(lp => String(lp.id) === String(dp.id))) {
                        newLocal.push(dp);
                    }
                });
                if (newLocal.length > localProjects.length) {
                    localStorage.setItem('local_projects', JSON.stringify(newLocal));
                }
            }
        } catch (e) {
            console.warn('Error fetching projects from Supabase:', e.message);
        }
        
        // Merge DB and Local projects (only own user's data)
        const currentUserId = Auth.getUserId();
        const allProjects = [...dbProjects];
        localProjects.forEach(lp => {
            if (!allProjects.some(dp => String(dp.id) === String(lp.id))) {
                if (!clientId || String(lp.client_id) === String(clientId)) {
                    // Only include local projects that belong to current user or have no user_id (legacy)
                    if (!lp.user_id || lp.user_id === currentUserId) {
                        allProjects.push(lp);
                    }
                }
            }
        });
        
        // Merge local extra columns data
        const localLocations = JSON.parse(localStorage.getItem('local_project_locations') || '{}');
        const localPaymentStatuses = JSON.parse(localStorage.getItem('local_project_payment_statuses') || '{}');
        const localReasons = JSON.parse(localStorage.getItem('local_project_reasons') || '{}');
        const localSubjects = JSON.parse(localStorage.getItem('local_project_subjects') || '{}');
        const localTimes = JSON.parse(localStorage.getItem('local_project_times') || '{}');
        const localStyling = JSON.parse(localStorage.getItem('local_project_styling') || '{}');
        const localPubApproval = JSON.parse(localStorage.getItem('local_project_pub_approval') || '{}');

        const clients = await this.getClients(false);
        
        return allProjects.map(p => {
            // Normalize clients field
            let normalizedClients = p.clients;
            if (Array.isArray(p.clients)) {
                normalizedClients = p.clients[0];
            } else if (p.clients && typeof p.clients === 'object' && !p.clients.name) {
                normalizedClients = null;
            }

            // Fallback: If name is still missing, try to find it in the clients list by ID
            if ((!normalizedClients || !normalizedClients.name) && p.client_id) {
                const foundClient = clients.find(c => String(c.id) === String(p.client_id));
                if (foundClient) {
                    normalizedClients = { name: foundClient.name, organization: foundClient.organization };
                }
            }
            
            const pid = p.id;
            return {
                ...p,
                clients: normalizedClients,
                location: p.location || localLocations[pid] || '',
                payment_status: p.payment_status || localPaymentStatuses[pid] || 'not_paid',
                not_closed_reason: p.not_closed_reason || localReasons[pid] || '',
                subjects_count: p.subjects_count || localSubjects[pid]?.count || '',
                subjects_details: p.subjects_details || localSubjects[pid]?.details || '',
                shoot_time: p.shoot_time || localTimes[pid] || '',
                styling_call: p.styling_call || localStyling[pid] || 'none',
                publication_approval: p.publication_approval !== undefined ? p.publication_approval : (localPubApproval[pid] || false)
            };
        });

        if (!clientId) this._cache.projects = results;
        return results;
    },

    async saveProject(project) {
        let savedProjectData = null;
        const dbProject = {
            client_id: project.clientId,
            name: project.name,
            shoot_date: project.shootDate || null,
            status: project.status || 'new',
            payment_status: project.paymentStatus || 'not_paid',
            payments: project.payments,
            drive_link: project.driveLink,
            notes: project.notes,
            location: project.location,
            not_closed_reason: project.notClosedReason,
            subjects_count: project.subjectsCount,
            subjects_details: project.subjectsDetails,
            shoot_time: project.shootTime || null,
            styling_call: project.stylingCall,
            publication_approval: project.publicationApproval || false,
            status_date: new Date().toISOString(),
            user_id: Auth.getUserId()
        };

        try {
            if (project.id && !String(project.id).startsWith('local_')) {
                const { data, error } = await sb.from('projects').update(dbProject).eq('id', project.id).select('*, clients(name, organization)');
                if (error) throw error;
                savedProjectData = data[0];
            } else {
                const { data, error } = await sb.from('projects').insert([dbProject]).select('*, clients(name, organization)');
                if (error) throw error;
                savedProjectData = data[0];
            }
        } catch (e) {
            console.warn('Supabase project save failed, attempting fallback:', e.message);
            
            // Re-attempt without potentially missing columns if it's a 400 error
            if (e.message?.includes('column') || e.status === 400) {
                try {
                    const fallbackProject = { ...dbProject };
                    delete fallbackProject.location;
                    delete fallbackProject.payment_status;
                    delete fallbackProject.not_closed_reason;
                    delete fallbackProject.subjects_count;
                    delete fallbackProject.subjects_details;
                    delete fallbackProject.shoot_time;
                    delete fallbackProject.styling_call;
                    delete fallbackProject.publication_approval;
                    
                    if (project.id && !String(project.id).startsWith('local_')) {
                        const { data, error } = await sb.from('projects').update(fallbackProject).eq('id', project.id).select('*, clients(name, organization)');
                        if (error) throw error;
                        savedProjectData = data[0];
                    } else {
                        const { data, error } = await sb.from('projects').insert([fallbackProject]).select('*, clients(name, organization)');
                        if (error) throw error;
                        savedProjectData = data[0];
                    }
                } catch (innerE) {
                    console.error('Final Supabase retry failed:', innerE.message);
                }
            }
        }

        if (savedProjectData && Array.isArray(savedProjectData.clients)) {
            savedProjectData.clients = savedProjectData.clients[0];
        }

        // Final result - either from DB or constructed for local storage
        const finalProject = savedProjectData || {
            ...dbProject,
            id: project.id || 'local_proj_' + Date.now(),
            created_at: project.created_at || new Date().toISOString()
        };

        // Sync with local storage
        const localProjects = JSON.parse(localStorage.getItem('local_projects') || '[]');
        const existingIdx = localProjects.findIndex(p => String(p.id) === String(finalProject.id) || (p.name === finalProject.name && p.client_id === finalProject.client_id));
        if (existingIdx !== -1) localProjects[existingIdx] = finalProject;
        else localProjects.push(finalProject);
        localStorage.setItem('local_projects', JSON.stringify(localProjects));

        // Sync extra columns for backward compatibility and inconsistent DB states
        const localLocations = JSON.parse(localStorage.getItem('local_project_locations') || '{}');
        const localPaymentStatuses = JSON.parse(localStorage.getItem('local_project_payment_statuses') || '{}');
        const localReasons = JSON.parse(localStorage.getItem('local_project_reasons') || '{}');
        const localSubjects = JSON.parse(localStorage.getItem('local_project_subjects') || '{}');
        const localTimes = JSON.parse(localStorage.getItem('local_project_times') || '{}');
        const localStyling = JSON.parse(localStorage.getItem('local_project_styling') || '{}');
        const localPubApproval = JSON.parse(localStorage.getItem('local_project_pub_approval') || '{}');

        const pid = finalProject.id;
        localLocations[pid] = project.location;
        localPaymentStatuses[pid] = project.paymentStatus || 'not_paid';
        localReasons[pid] = project.notClosedReason;
        localSubjects[pid] = { count: project.subjectsCount, details: project.subjectsDetails };
        localTimes[pid] = project.shootTime;
        localStyling[pid] = project.stylingCall;
        localPubApproval[pid] = project.publicationApproval || false;

        localStorage.setItem('local_project_locations', JSON.stringify(localLocations));
        localStorage.setItem('local_project_payment_statuses', JSON.stringify(localPaymentStatuses));
        localStorage.setItem('local_project_reasons', JSON.stringify(localReasons));
        localStorage.setItem('local_project_subjects', JSON.stringify(localSubjects));
        localStorage.setItem('local_project_times', JSON.stringify(localTimes));
        localStorage.setItem('local_project_styling', JSON.stringify(localStyling));
        localStorage.setItem('local_project_pub_approval', JSON.stringify(localPubApproval));

        // Add default tasks only on creation or explicit sync
        const isNew = typeof project.id === 'undefined' || !project.id || String(project.id).startsWith('local_proj_');
        await this.addDefaultsToProject(finalProject.id, finalProject.shoot_date, { ...finalProject, clients: finalProject.clients || (await sb.from('clients').select('name').eq('id', finalProject.client_id).single()).data }, isNew);
        
        this.invalidateCache('projects');
        return finalProject;
    },

    async updateProjectStatus(id, status) {
        const { error } = await sb.from('projects').update({ 
            status,
            status_date: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
    },

    async updateProjectStylingCall(id, styling_call) {
        // Try getting project first to ensure we have the shoot date
        const projects = await this.getProjects();
        const p = projects.find(proj => String(proj.id) === String(id));
        if (!p) return;

        try {
            const { error } = await sb.from('projects').update({ styling_call }).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.warn('Supabase styling call update failed, storing locally:', e.message);
            const localStyling = JSON.parse(localStorage.getItem('local_project_styling') || '{}');
            localStyling[id] = styling_call;
            localStorage.setItem('local_project_styling', JSON.stringify(localStyling));
        }

        // Sync tasks (add/update/delete styling task)
        await this.addDefaultsToProject(id, p.shoot_date, { ...p, styling_call });
    },

    async updateProjectPaymentStatus(id, payment_status) {
        const { error } = await sb.from('projects').update({ payment_status }).eq('id', id);
        if (error) throw error;
    },

    async autoArchiveProjects() {
        try {
            const projects = await Store.getProjects();
            const now = new Date();
            const archiveDelay = this.getArchiveDelay(); // in days, default 30

            for (const project of projects) {
                let thresholdDays = null;

                if (project.status === 'delivered') {
                    if (!project.publication_approval) {
                        // Delivered + NO approval -> archive after 1 week
                        thresholdDays = 7;
                    } else {
                        // Delivered + WITH approval -> keep in column, don't auto-archive
                        thresholdDays = null;
                    }
                } else if (project.status === 'published') {
                    // Published -> archive after user-defined delay
                    thresholdDays = archiveDelay;
                }

                if (thresholdDays !== null) {
                    const statusDateStr = project.status_date || project.updated_at || project.created_at;
                    const statusDate = statusDateStr ? new Date(statusDateStr) : null;
                    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
                    
                    if (statusDate && (now.getTime() - statusDate.getTime()) > thresholdMs) {
                        await this.updateProjectStatus(project.id, 'archived');
                        const clientName = project.clients?.name ? ` (<span class="log-client-link" onclick="app.viewClient('${project.client_id}')">${project.clients.name}</span>)` : '';
                        const projLink = `<span class="log-client-link" onclick="app.viewProject('${project.id}')">${project.name}</span>`;
                        await this.logAction('ארכוב אוטומטי', `הפרויקט "${projLink}${clientName}" הועבר לארכיון באופן אוטומטי מסטטוס ${project.status === 'published' ? 'פורסם' : 'נמסר'}`, 'project', project.id);
                    }
                }
            }
        } catch (e) {
            console.warn('Auto-archiving failed:', e.message);
        }
    },

    getArchiveDelay() {
        return parseInt(localStorage.getItem('settings_archive_delay') || '30');
    },

    setArchiveDelay(days) {
        localStorage.setItem('settings_archive_delay', days);
    },

    async deleteProject(id) {
        const { error } = await sb.from('projects').delete().eq('id', id);
        if (error) throw error;

        // Sync with local storage
        let localProjects = JSON.parse(localStorage.getItem('local_projects') || '[]');
        localProjects = localProjects.filter(p => String(p.id) !== String(id));
        localStorage.setItem('local_projects', JSON.stringify(localProjects));

        // Clean up extras
        const extraKeys = [
            'local_project_locations',
            'local_project_payment_statuses',
            'local_project_reasons',
            'local_project_subjects',
            'local_project_times',
            'local_project_styling'
        ];
        extraKeys.forEach(key => {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data[id]) {
                delete data[id];
                localStorage.setItem(key, JSON.stringify(data));
            }
        });
        this.invalidateCache('projects');
    },

    // Packages
    async getPackages() {
        if (!Auth.getUserId()) return [];
        let dbPackages = [];
        let localPackages = JSON.parse(localStorage.getItem('local_packages') || '[]');

        try {
            const { data, error } = await sb.from('packages').select('*').order('name');
            if (error) throw error;
            dbPackages = data || [];
        } catch (e) {
            console.warn('Error fetching packages from Supabase:', e.message);
        }

        // Merge DB and Local
        const allPackages = [...dbPackages];
        localPackages.forEach(lp => {
            if (!allPackages.some(dp => String(dp.id) === String(lp.id))) {
                allPackages.push(lp);
            }
        });

        // Ensure duration and other fields are merged from local if missing in DB
        const localPackageExtras = JSON.parse(localStorage.getItem('local_package_extras') || '{}');
        return allPackages.map(p => ({
            ...p,
            duration: p.duration || localPackageExtras[p.id]?.duration || ''
        }));
    },

    async savePackage(pkg) {
        const dbData = { name: pkg.name, price: pkg.price, user_id: Auth.getUserId() };
        let savedPackageData = null;

        try {
            // Attempt with duration first
            const fullData = { ...dbData, duration: pkg.duration };
            if (pkg.id && !String(pkg.id).startsWith('local_')) {
                const { data, error } = await sb.from('packages').update(fullData).eq('id', pkg.id).select();
                if (error) throw error;
                savedPackageData = data[0];
            } else {
                const { data, error } = await sb.from('packages').insert([fullData]).select();
                if (error) throw error;
                savedPackageData = data[0];
            }
        } catch (e) {
            console.warn('Supabase package save failed (maybe duration column missing), trying fallback:', e.message);
            try {
                if (pkg.id && !String(pkg.id).startsWith('local_')) {
                    const { data, error } = await sb.from('packages').update(dbData).eq('id', pkg.id).select();
                    if (error) throw error;
                    savedPackageData = data[0];
                } else {
                    const { data, error } = await sb.from('packages').insert([dbData]).select();
                    if (error) throw error;
                    savedPackageData = data[0];
                }
            } catch (innerE) {
                console.error('Final Supabase package save failed:', innerE.message);
            }
        }

        const finalPackage = savedPackageData || {
            ...dbData,
            duration: pkg.duration,
            id: pkg.id || 'local_pkg_' + Date.now(),
            created_at: new Date().toISOString()
        };

        // Sync with local storage
        const localPackages = JSON.parse(localStorage.getItem('local_packages') || '[]');
        const existingIdx = localPackages.findIndex(p => String(p.id) === String(finalPackage.id));
        if (existingIdx !== -1) localPackages[existingIdx] = finalPackage;
        else localPackages.push(finalPackage);
        localStorage.setItem('local_packages', JSON.stringify(localPackages));

        // Save duration to extras anyway (safety)
        const localPackageExtras = JSON.parse(localStorage.getItem('local_package_extras') || '{}');
        localPackageExtras[finalPackage.id] = { duration: pkg.duration };
        localStorage.setItem('local_package_extras', JSON.stringify(localPackageExtras));

        return finalPackage;
    },

    async deletePackage(id) {
        const { error } = await sb.from('packages').delete().eq('id', id);
        if (error) throw error;

        // Sync with local storage
        let localPackages = JSON.parse(localStorage.getItem('local_packages') || '[]');
        localPackages = localPackages.filter(p => String(p.id) !== String(id));
        localStorage.setItem('local_packages', JSON.stringify(localPackages));

        // Remove extra duration if stored
        const localPackageExtras = JSON.parse(localStorage.getItem('local_package_extras') || '{}');
        if (localPackageExtras[id]) {
            delete localPackageExtras[id];
            localStorage.setItem('local_package_extras', JSON.stringify(localPackageExtras));
        }
    },

    // Notes (Journal)
    async getNotes(clientId = null, projectId = null) {
        let query = sb.from('notes').select('*');
        if (clientId) query = query.eq('client_id', clientId);
        if (projectId) query = query.eq('project_id', projectId);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) console.error('Error fetching notes:', error);
        return data || [];
    },

    async addNote(content, clientId = null, projectId = null) {
        const dbNote = {
            content,
            client_id: clientId,
            project_id: projectId,
            user_id: Auth.getUserId()
        };
        const { error } = await sb.from('notes').insert([dbNote]);
        if (error) throw error;
    },

    async updateNote(id, content) {
        const { error } = await sb.from('notes').update({ content }).eq('id', id);
        if (error) throw error;
    },

    async deleteNote(id) {
        const { error } = await sb.from('notes').delete().eq('id', id);
        if (error) throw error;
    },

    // user_sessions logging
    async logSessionStart() {
        if (!Auth.session?.user?.id || !Auth.session?.user?.email) return;
        
        // Never log sessions during impersonation — it corrupts user data
        if (window.Admin && Admin._impersonatingUserId) return;
        
        // Always use the real auth session ID, NOT Auth.getUserId() which may be impersonated
        const realUserId = Auth.session.user.id;
        const realEmail = Auth.session.user.email;

        try {
            // Upsert into persistent profiles table
            const profileData = {
                user_id: realUserId,
                email: realEmail,
                last_seen: new Date().toISOString()
            };
            await sb.from('user_profiles').upsert([profileData], { onConflict: 'user_id' });

            const sessionData = {
                user_id: realUserId,
                user_email: realEmail,
                login_time: new Date().toISOString(),
                last_active: new Date().toISOString(),
                duration_minutes: 0
            };
            
            const { data, error } = await sb.from('user_sessions').insert([sessionData]).select();
            if (error) {
                console.warn('Could not log session start (table might not exist):', error.message);
                return null;
            }
            if (data && data.length > 0) {
                localStorage.setItem('current_session_id', data[0].id);
                localStorage.setItem('session_start_time', data[0].login_time);
            }
        } catch (e) {
            console.warn('Session logging error:', e.message);
        }
    },

    async updateSession() {
        const sessionId = localStorage.getItem('current_session_id');
        if (!sessionId || !Auth.getUserId()) return;
        
        try {
            const startTimeStr = localStorage.getItem('session_start_time');
            if (!startTimeStr) return;
            
            const startTime = new Date(startTimeStr);
            const now = new Date();
            const durationMinutes = Math.floor((now - startTime) / 60000);
            
            const { error } = await sb.from('user_sessions').update({
                last_active: now.toISOString(),
                duration_minutes: durationMinutes
            }).eq('id', sessionId);
            
            if (error) console.warn('Could not update session:', error.message);
        } catch (e) {
            // Silently fail
        }
    },

    async logSessionEnd() {
        const sessionId = localStorage.getItem('current_session_id');
        if (!sessionId || !Auth.getUserId()) return;
        
        try {
            const startTimeStr = localStorage.getItem('session_start_time');
            const now = new Date();
            let durationMinutes = 0;
            if (startTimeStr) {
                const startTime = new Date(startTimeStr);
                durationMinutes = Math.floor((now - startTime) / 60000);
            }
            
            await sb.from('user_sessions').update({
                logout_time: now.toISOString(),
                last_active: now.toISOString(),
                duration_minutes: durationMinutes
            }).eq('id', sessionId);
            
            localStorage.removeItem('current_session_id');
            localStorage.removeItem('session_start_time');
        } catch (e) {}
    },

    // Action Logs
    async getActionLogs(limit = 100) {
        if (!Auth.getUserId()) return [];
        try {
            const { data, error } = await sb
                .from('action_logs')
                .select('*')
                .eq('user_id', Auth.getUserId())
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                if (error.code === '42P01') return JSON.parse(localStorage.getItem('local_action_logs') || '[]');
                throw error;
            }
            return data || [];
        } catch (e) {
            console.warn('Error fetching action logs:', e.message);
            return JSON.parse(localStorage.getItem('local_action_logs') || '[]');
        }
    },

    async logAction(action, details = '', entityType = null, entityId = null) {
        const logEntry = {
            id: crypto.randomUUID ? crypto.randomUUID() : 'log_' + Date.now(),
            action,
            details,
            entity_type: entityType,
            entity_id: entityId,
            created_at: new Date().toISOString(),
            user_id: Auth.getUserId()
        };

        try {
            const { error } = await sb.from('action_logs').insert([logEntry]);
            if (error) {
                if (error.code === '42P01') {
                    this._actionLogsTableExists = false;
                    localStorage.setItem('sb_action_logs_missing', 'true');
                }
                throw error;
            }
        } catch (e) {
            const localLogs = JSON.parse(localStorage.getItem('local_action_logs') || '[]');
            localLogs.unshift(logEntry);
            if (localLogs.length > 150) localLogs.pop(); // Keep a bit more locally
            localStorage.setItem('local_action_logs', JSON.stringify(localLogs));
        }
    },

    // Checklists (with Local Fallback for missing table)
    async _checkTable(tableName) {
        try {
            const { error } = await sb.from(tableName).select('count', { count: 'exact', head: true }).limit(1);
            return !error || error.code !== '42P01'; // 42P01 is "relation does not exist"
        } catch (e) {
            return false;
        }
    },

    async getChecklistItems(projectId) {
        let dbItems = [];
        let localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        
        if (this._checklistTableExists !== false && this._rlsChecklistEnabled !== false) {
            try {
                const { data, error } = await sb
                    .from('project_checklists')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true });
                
                if (error) {
                    if (error.code === '42P01') this._checklistTableExists = false;
                    throw error;
                }
                dbItems = data || [];
            } catch (e) {
                console.warn('Supabase fetch failed, using only local:', e.message);
            }
        }

        // Merge and de-duplicate by ID
        const localProjectItems = localItems.filter(item => String(item.project_id) === String(projectId));
        const allItems = [...dbItems];
        
        localProjectItems.forEach(localItem => {
            if (!allItems.some(dbItem => String(dbItem.id) === String(localItem.id))) {
                allItems.push(localItem);
            }
        });

        // Final de-duplicate by content/category for UI cleanliness
        const seen = new Set();
        return allItems.filter(t => {
            const content = String(t.content || '').trim();
            const category = String(t.category || '');
            const key = `${content}-${category}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    },

    async getTaskById(id) {
        if (this._checklistTableExists === false || String(id).startsWith('local_')) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.find(item => String(item.id) === String(id));
        }

        try {
            const { data, error } = await sb.from('project_checklists').select('*, projects(name)').eq('id', id).single();
            if (error) throw error;
            return data;
        } catch (e) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.find(item => String(item.id) === String(id));
        }
    },

    async getAllTasks(forceRefresh = false) {
        if (!Auth.getUserId()) return [];
        if (!forceRefresh && this._cache.tasks) return this._cache.tasks;

        let dbTasks = [];
        let localTasks = JSON.parse(localStorage.getItem('local_checklists') || '[]');

        if (this._checklistTableExists !== false && this._rlsChecklistEnabled !== false) {
            try {
                const { data, error } = await sb
                    .from('project_checklists')
                    .select('*, projects(name)')
                    .eq('user_id', Auth.getUserId())
                    .order('created_at', { ascending: false });
                
                if (error) {
                    if (error.code === '42P01') this._checklistTableExists = false;
                    throw error;
                }
                dbTasks = data || [];

                // Hydrate local storage with synced tasks
                if (dbTasks.length > 0) {
                    const newLocal = [...localTasks.filter(t => String(t.id).startsWith('local_'))];
                    dbTasks.forEach(dt => {
                        if (!newLocal.some(lt => String(lt.id) === String(dt.id))) {
                            newLocal.push(dt);
                        }
                    });
                    if (newLocal.length > localTasks.length) {
                        localStorage.setItem('local_checklists', JSON.stringify(newLocal));
                    }
                }
            } catch (e) {
                console.warn('Supabase fetch failed, using only local:', e.message);
            }
        }

        // Merge and de-duplicate by ID
        const allTasks = [...dbTasks];
        localTasks.forEach(localTask => {
            if (!allTasks.some(dbTask => String(dbTask.id) === String(localTask.id))) {
                allTasks.push(localTask);
            }
        });

        // De-duplicate tasks for the UI by content/date/pid
        const seen = new Set();
        const results = allTasks.filter(t => {
            const date = String(t.due_date || t.dueDate || '').split('T')[0].trim();
            const content = String(t.content || '').trim();
            const pid = String(t.project_id || t.projectId || 'no-proj');
            const key = `${pid}-${content}-${date}`;
            
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        this._cache.tasks = results;
        return results;
    },

    cleanupDuplicates() {
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        if (localItems.length === 0) return;

        const seen = new Set();
        const uniqueItems = localItems.filter(t => {
            const date = String(t.due_date || t.dueDate || '').trim();
            const content = String(t.content || '').trim();
            const pid = String(t.project_id || t.projectId || 'no-proj');
            const key = `${pid}-${content}-${date}`;
            
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (uniqueItems.length !== localItems.length) {
            console.log(`Cleaned up ${localItems.length - uniqueItems.length} duplicate tasks from local storage.`);
            localStorage.setItem('local_checklists', JSON.stringify(uniqueItems));
        }
    },

    async syncLocalTasksToSupabase() {
        // Only sync if Supabase is available
        if (this._checklistTableExists === false || this._rlsChecklistEnabled === false) {
            console.log('Supabase checklists unavailable, skipping sync.');
            return;
        }

        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        const localOnlyItems = localItems.filter(t => String(t.id).startsWith('local_'));
        
        if (localOnlyItems.length === 0) return;
        
        console.log(`Syncing ${localOnlyItems.length} local-only tasks to Supabase...`);
        let syncedCount = 0;

        for (const item of localOnlyItems) {
            try {
                const dataToSave = {
                    project_id: item.project_id || item.projectId || null,
                    content: item.content,
                    is_completed: item.is_completed || false,
                    category: item.category || 'task',
                    due_date: item.due_date || item.dueDate || null,
                    user_id: Auth.getUserId()
                };

                // Try with notes column first
                if (this._notesColumnExists !== false && item.notes) {
                    dataToSave.notes = item.notes;
                }

                const { data, error } = await sb.from('project_checklists').insert([dataToSave]).select();
                
                if (error) {
                    // Handle missing notes column
                    if (error.message?.includes('notes') || error.code === '42703') {
                        this._notesColumnExists = false;
                        delete dataToSave.notes;
                        const retry = await sb.from('project_checklists').insert([dataToSave]).select();
                        if (retry.error) throw retry.error;
                        if (retry.data && retry.data[0]) {
                            // Replace local ID with Supabase ID
                            this._replaceLocalId(item.id, retry.data[0].id);
                            syncedCount++;
                        }
                    } else if (error.code === '42501' || error.message?.includes('RLS')) {
                        // RLS is blocking — stop trying
                        this._rlsChecklistEnabled = false;
                        localStorage.setItem('sb_checklists_rls_blocked', 'true');
                        console.warn('RLS blocking sync, stopping.');
                        break;
                    } else {
                        throw error;
                    }
                } else if (data && data[0]) {
                    // Success — replace local ID with Supabase ID
                    this._replaceLocalId(item.id, data[0].id);
                    syncedCount++;
                }
            } catch (e) {
                console.warn(`Failed to sync task "${item.content}":`, e.message);
            }
        }
        
        if (syncedCount > 0) {
            console.log(`Successfully synced ${syncedCount} tasks to Supabase.`);
        }
    },

    _replaceLocalId(oldId, newId) {
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        const idx = localItems.findIndex(i => String(i.id) === String(oldId));
        if (idx !== -1) {
            localItems[idx].id = newId;
            localStorage.setItem('local_checklists', JSON.stringify(localItems));
        }
    },

    async cleanupOrphanTasks() {
        // Clean up tasks that reference deleted projects
        const projects = await this.getProjects();
        if (projects.length === 0) return; // Safety: don't cleanup if no projects loaded
        
        const projectIds = new Set(projects.map(p => String(p.id)));
        
        // Clean local storage
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        let count = 0;
        const cleanedItems = localItems.map(t => {
            const pid = t.project_id || t.projectId;
            if (pid && !projectIds.has(String(pid))) {
                // If it looks like a DB ID but it's not in our list, it might be an orphan
                // However, we only unlink if we are reasonably sure we have a complete project list
                if (!String(pid).startsWith('local_')) {
                    count++;
                    return { ...t, project_id: null, projectId: null };
                }
            }
            return t;
        });
        
        if (count > 0) {
            console.log(`Cleaned up ${count} orphan tasks.`);
            localStorage.setItem('local_checklists', JSON.stringify(cleanedItems));
        }
    },

    async saveChecklistItem(item) {
        let savedItemId = item.id;
        const isCompleted = item.isCompleted !== undefined ? item.isCompleted : (item.is_completed !== undefined ? item.is_completed : false);
        const projectId = item.projectId || item.project_id || null;
        const dueDate = item.dueDate || item.due_date || null;

        // If table doesn't exist or RLS is blocking consistently, stay local
        if (this._checklistTableExists !== false && this._rlsChecklistEnabled !== false) {
            try {
                let res;
                const dataToSave = {
                    project_id: projectId,
                    content: item.content,
                    is_completed: isCompleted,
                    category: item.category || 'task',
                    due_date: dueDate,
                    user_id: Auth.getUserId()
                };

                // Only add notes if the column is known to exist
                if (this._notesColumnExists !== false) {
                    dataToSave.notes = item.notes || null;
                }

                if (item.id && !String(item.id).startsWith('local_')) {
                    res = await sb.from('project_checklists').update(dataToSave).eq('id', item.id).select();
                } else {
                    res = await sb.from('project_checklists').insert([dataToSave]).select();
                }
                
                if (res.error) {
                    // Handle table missing
                    if (res.error.code === '42P01') {
                        this._checklistTableExists = false;
                        localStorage.setItem('sb_checklists_missing', 'true');
                        throw res.error;
                    }
                    
                    // Handle RLS error (401 / Unauthorized / Policy violation)
                    if (res.error.code === '42501' || res.error.status === 401 || res.error.message?.includes('RLS') || res.error.message?.includes('policy')) {
                        if (this._rlsChecklistEnabled !== false) {
                            console.warn('Supabase RLS blocking checklist save, staying local');
                            this._rlsChecklistEnabled = false;
                            localStorage.setItem('sb_checklists_rls_blocked', 'true');
                        }
                        throw res.error;
                    }

                    // Handle missing 'notes' column if we thought it existed
                    if ((res.error.message?.includes('notes') || res.error.code === '42703') && this._notesColumnExists !== false) {
                        console.warn('Supabase project_checklists missing notes column, disabling notes sync');
                        this._notesColumnExists = false;
                        localStorage.setItem('sb_checklists_notes_missing', 'true');
                        
                        // Only retry if RLS is NOT actively blocking (to avoid double 401 logs)
                        if (this._rlsChecklistEnabled !== false) {
                            const fallbackData = { ...dataToSave };
                            delete fallbackData.notes;
                            
                            if (item.id && !String(item.id).startsWith('local_')) {
                                res = await sb.from('project_checklists').update(fallbackData).eq('id', item.id).select();
                            } else {
                                res = await sb.from('project_checklists').insert([fallbackData]).select();
                            }
                            if (res.error) throw res.error;
                        } else {
                            throw new Error('RLS blocking retry');
                        }
                    } else {
                        throw res.error;
                    }
                }
                if (res.data && res.data[0]) savedItemId = res.data[0].id;
            } catch (e) {
                // Silently fallback if we already logged the specific reason above or if it's a general network error
                if (this._checklistTableExists !== false && this._rlsChecklistEnabled !== false) {
                    console.warn('Supabase checklist save failed, using local fallback:', e.message);
                }
            }
        }

        // Sync with Local storage
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        
        // Find existing index: 
        // 1. By exact ID match
        // 2. OR if it's a new item (no ID or local ID), by content/project match but ONLY if the item to save also doesn't have a final ID yet
        const existingIdx = localItems.findIndex(i => {
            if (savedItemId && String(i.id) === String(savedItemId)) return true;
            if (item.id && String(i.id) === String(item.id)) return true;
            
            // If both don't have a real DB ID, match by content to prevent duplicates during creation
            const isLocal = (id) => !id || String(id).startsWith('local_');
            if (isLocal(savedItemId) && isLocal(item.id) && isLocal(i.id)) {
                return i.content === item.content && i.project_id === projectId && i.category === item.category;
            }
            return false;
        });
        
        const itemToSave = {
            id: savedItemId || item.id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            project_id: projectId,
            content: item.content,
            is_completed: isCompleted,
            category: item.category || 'task',
            due_date: dueDate,
            notes: item.notes || null,
            created_at: item.created_at || new Date().toISOString()
        };

        if (existingIdx !== -1) {
            localItems[existingIdx] = itemToSave;
        } else {
            localItems.push(itemToSave);
        }
        localStorage.setItem('local_checklists', JSON.stringify(localItems));
        this.invalidateCache('tasks');
    },

    async toggleChecklistItem(id, isCompleted) {
        if (this._checklistTableExists !== false) {
            try {
                if (!String(id).startsWith('local_')) {
                    const { error } = await sb.from('project_checklists').update({ is_completed: isCompleted }).eq('id', id);
                    if (error) throw error;
                }
            } catch (e) {
                console.warn('Supabase toggle failed, using local');
            }
        }
        
        // Always update Local storage
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        const idx = localItems.findIndex(i => String(i.id) === String(id));
        if (idx !== -1) {
            const item = localItems[idx];
            item.is_completed = isCompleted;
            localStorage.setItem('local_checklists', JSON.stringify(localItems));
            
            // Build project reference for log
            let projectRef = '';
            if (item.project_id) {
                try {
                    const projects = await this.getProjects();
                    const project = projects.find(p => String(p.id) === String(item.project_id));
                    if (project) {
                        const projectLink = `<span class="log-client-link" onclick="app.viewProject('${project.id}')">${project.name}</span>`;
                        const clientLink = project.clients?.name ? ` | <span class="log-client-link" onclick="app.viewClient('${project.client_id}')">${project.clients.name}</span>` : '';
                        projectRef = ` (${projectLink}${clientLink})`;
                    }
                } catch (e) {
                    console.warn('Could not resolve project for task log');
                }
            }
            
            // Log action with project reference
            const taskLink = `<span class="log-client-link" onclick="app.viewTask('${id}')">${item.content}</span>`;
            this.logAction(
                isCompleted ? 'השלמת משימה' : 'ביטול השלמת משימה',
                `המשימה "${taskLink}" ${isCompleted ? 'סומנה כבוצעה' : 'סומנה כלא בוצעה'}${projectRef}`,
                'task',
                id
            );
        }
        this.invalidateCache('tasks');
    },

    async deleteChecklistItem(id) {
        if (this._checklistTableExists !== false) {
            try {
                if (!String(id).startsWith('local_')) {
                    const { error } = await sb.from('project_checklists').delete().eq('id', id);
                    if (error) throw error;
                }
            } catch (e) {
                console.warn('Supabase delete failed, using local');
            }
        }

        // Always delete from Local storage to stay in sync
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        const itemToDelete = localItems.find(i => String(i.id) === String(id));
        const filtered = localItems.filter(i => String(i.id) !== String(id));
        localStorage.setItem('local_checklists', JSON.stringify(filtered));
        
        if (itemToDelete) {
            // Build project reference for log
            let projectRef = '';
            if (itemToDelete.project_id) {
                try {
                    const projects = await this.getProjects();
                    const project = projects.find(p => String(p.id) === String(itemToDelete.project_id));
                    if (project) {
                        const projectLink = `<span class="log-client-link" onclick="app.viewProject('${project.id}')">${project.name}</span>`;
                        const clientLink = project.clients?.name ? ` | <span class="log-client-link" onclick="app.viewClient('${project.client_id}')">${project.clients.name}</span>` : '';
                        projectRef = ` (${projectLink}${clientLink})`;
                    }
                } catch (e) {
                    console.warn('Could not resolve project for task log');
                }
            }
            
            const taskLink = `<span class="log-client-link" onclick="app.viewTask('${id}')">${itemToDelete.content}</span>`;
            this.logAction('מחיקת משימה', `המשימה "${taskLink}" נמחקה${projectRef}`, 'task', id);
        }
        this.invalidateCache('tasks');
    },

    // Checklist Defaults
    getChecklistDefaults() {
        const stored = localStorage.getItem('checklist_defaults');
        if (stored) return JSON.parse(stored);
        
        // Return hardcoded defaults if nothing in localStorage
        return {
            shoot: ['שיחה מקדימה עם הלקוח/ה', 'בדיקת מזג אוויר', 'שליחת תזכורת יום לפני', 'בדיקת לוקיישן'],
            equipment: ['מצלמה גוף 1', 'מכרטיסי זיכרון ריקים', 'סוללות טעונות', 'עדשות נקיות']
        };
    },

    saveChecklistDefaults(defaults) {
        localStorage.setItem('checklist_defaults', JSON.stringify(defaults));
    },

    async addDefaultsToProject(projectId, shootDate = null, projectData = null, forceDefaults = false) {
        if (!projectId) return;
        
        let clientName = '';
        let projectName = '';
        let stylingCall = 'none';

        if (projectData) {
            clientName = projectData.clients?.name || '';
            projectName = projectData.name || '';
            stylingCall = projectData.styling_call || 'none';
        } else {
            let projects = await this.getProjects();
            let currentProjectResource = projects.find(p => String(p.id) === String(projectId));
            stylingCall = currentProjectResource?.styling_call || 'none';
            projectName = currentProjectResource?.name || '';
            if (currentProjectResource?.clients?.name) clientName = currentProjectResource.clients.name;
        }

        // If client name or project name is still missing, try to fetch them
        if (!clientName || !projectName) {
            try {
                const { data } = await sb.from('projects').select('name, clients(name)').eq('id', projectId).single();
                if (data?.clients?.name && !clientName) {
                    clientName = data.clients.name;
                }
                if (data?.name && !projectName) {
                    projectName = data.name;
                }
            } catch (e) {
                console.warn('Could not fetch client/project name for defaults');
            }
        }

        const existingItems = await this.getChecklistItems(projectId);
        const defaults = this.getChecklistDefaults();
        
        let itemsToSave = [];
        
        if (forceDefaults) {
            itemsToSave = [
                ...defaults.shoot.map(content => {
                    let dueDate = null;
                    let finalContent = content;
                    if (content.includes('תזכורת')) {
                        if (shootDate) {
                            const date = new Date(shootDate);
                            date.setDate(date.getDate() - 1);
                            dueDate = date.toISOString().split('T')[0];
                        }
                        if (clientName) {
                            finalContent = `${content} (${clientName})`;
                        }
                    }
                    return { projectId, content: finalContent, category: 'shoot', dueDate };
                }),
                ...defaults.equipment.map(content => ({ projectId, content, category: 'equipment' }))
            ];
        } else if (shootDate) {
            // Even if not forcing defaults, if there's a shoot date, update or CREATE the 'Reminder' task
            const reminderTask = existingItems.find(i => i.content.includes('תזכורת'));
            const date = new Date(shootDate);
            date.setDate(date.getDate() - 1);
            const newDueDate = date.toISOString().split('T')[0];
            const content = clientName ? `שליחת תזכורת יום לפני (${clientName})` : 'שליחת תזכורת יום לפני';

            if (reminderTask) {
                if (reminderTask.due_date !== newDueDate || reminderTask.dueDate !== newDueDate || reminderTask.content !== content) {
                    await this.saveChecklistItem({
                        ...reminderTask,
                        dueDate: newDueDate,
                        content: content,
                        projectId: projectId
                    });
                }
            } else {
                // CREATE missing reminder
                itemsToSave.push({
                    projectId,
                    content: content,
                    category: 'shoot',
                    dueDate: newDueDate
                });
            }
        }

        // Handle Styling Call Task separately to allow updates/deletions
        const existingStylingTasks = existingItems.filter(i => i.category === 'styling' || i.content.includes('שיחת סטיילינג'));
        
        if (stylingCall !== 'none' && shootDate) {
            const weeks = stylingCall === '1_week' ? 1 : 2;
            const stylingDate = this._calculateStylingDate(shootDate, weeks);
            const content = clientName
                ? `שיחת סטיילינג (${clientName})`
                : 'שיחת סטיילינג';
            
            if (existingStylingTasks.length > 0) {
                // Update only the first one, delete others if they exist
                const firstTask = existingStylingTasks[0];
                if (firstTask.due_date !== stylingDate || firstTask.content !== content) {
                    await this.saveChecklistItem({
                        ...firstTask,
                        dueDate: stylingDate,
                        content: content,
                        projectId: projectId
                    });
                }
                
                // Delete extras
                for (let i = 1; i < existingStylingTasks.length; i++) {
                    await this.deleteChecklistItem(existingStylingTasks[i].id, projectId);
                }
            } else {
                // Create new styling task
                itemsToSave.push({
                    projectId,
                    content: content,
                    category: 'styling',
                    dueDate: stylingDate
                });
            }
        } else if (stylingCall === 'none' && existingStylingTasks.length > 0) {
            // Delete ALL styling tasks if styling call was removed
            for (const task of existingStylingTasks) {
                await this.deleteChecklistItem(task.id, projectId);
            }
        }

        const finalItemsToSave = [];
        const seenCurrent = new Set();

        for (const item of itemsToSave) {
            const key = `${item.content}-${item.category}`;
            const exists = existingItems.some(existing => 
                existing.content === item.content && 
                (existing.category === item.category || (item.category === 'shoot' && existing.category === 'styling'))
            );
            if (!exists && !seenCurrent.has(key)) {
                finalItemsToSave.push(item);
                seenCurrent.add(key);
            }
        }

        for (const item of finalItemsToSave) {
            try {
                await this.saveChecklistItem(item);
            } catch (err) {
                console.error('Failed to save default item:', item, err);
            }
        }
    },

    async importCategoryDefaults(projectId, category, shootDate = null, projectData = null) {
        console.log('importCategoryDefaults started for', category, 'project', projectId);
        if (!projectId) return;

        let clientName = projectData?.clients?.name || '';
        let projectName = projectData?.name || '';
        if (!clientName || !projectName) {
             try {
                const { data } = await sb.from('projects').select('name, clients(name)').eq('id', projectId).single();
                if (data?.clients?.name && !clientName) clientName = data.clients.name;
                if (data?.name && !projectName) projectName = data.name;
            } catch (e) {}
        }

        const existingItems = await this.getChecklistItems(projectId);
        console.log('Existing items for project:', existingItems.length);
        
        const allDefaults = this.getChecklistDefaults();
        const categoryDefaults = allDefaults[category] || [];
        console.log('Defaults for category', category, ':', categoryDefaults.length);

        const itemsToSave = categoryDefaults.map(content => {
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
            return { projectId, content: finalContent, category, dueDate };
        });

        const finalItemsToSave = itemsToSave.filter(defItem => 
            !existingItems.some(existing => 
                existing.content === defItem.content && 
                (existing.category === defItem.category || (defItem.category === 'shoot' && existing.category === 'styling'))
            )
        );
        console.log('Final items to save:', finalItemsToSave.length);

        for (const item of finalItemsToSave) {
            try {
                await this.saveChecklistItem(item);
            } catch (err) {
                console.error('Failed to save default item:', item, err);
            }
        }
        return finalItemsToSave;
    },

    getChecklistDisplayMode() {
        return localStorage.getItem('checklist_display_mode') || 'checkbox';
    },

    setChecklistDisplayMode(mode) {
        localStorage.setItem('checklist_display_mode', mode);
    },

    getCalendarCity() {
        return localStorage.getItem('calendar_city') || CONFIG.calendarCity || 'IL-Tel+Aviv';
    },

    setCalendarCity(city) {
        localStorage.setItem('calendar_city', city);
        this._holidayCache = {}; // Clear cache when city changes
    },

    getUserGender() {
        const metadataGender = Auth.session?.user?.user_metadata?.gender;
        if (metadataGender) {
            localStorage.setItem('user_gender', metadataGender);
            return metadataGender;
        }
        return localStorage.getItem('user_gender') || 'female';
    },

    async setUserGender(gender) {
        localStorage.setItem('user_gender', gender);
        
        // Sync with Supabase if logged in
        if (Auth.getUserId()) {
            try {
                await sb.auth.updateUser({
                    data: { gender: gender }
                });
            } catch (e) {
                console.warn('Failed to sync gender with Supabase:', e.message);
            }
        }
    },

    async fixLegacyTaskNames() {
        // Fix tasks that have [object Object] in their names
        const allTasks = await this.getAllTasks();
        const tasksToFix = allTasks.filter(t => t.content && t.content.includes('[object Object]'));
        
        for (const task of tasksToFix) {
            if (!task.project_id) continue;
            
            try {
                // Get the client name for this project
                const { data } = await sb.from('projects').select('clients(name)').eq('id', task.project_id).single();
                const clientName = data?.clients?.name || '';
                
                if (clientName) {
                    // Replace [object Object] with the actual client name
                    const fixedContent = task.content.replace('[object Object]', clientName);
                    await this.saveChecklistItem({
                        ...task,
                        content: fixedContent,
                        isCompleted: task.is_completed,
                        projectId: task.project_id,
                        dueDate: task.due_date
                    });
                    console.log('Fixed task:', task.id, 'from', task.content, 'to', fixedContent);
                }
            } catch (e) {
                console.warn('Could not fix task:', task.id, e);
            }
        }
        
        return tasksToFix.length;
    },

    _calculateStylingDate(shootDate, weeks) {
        const date = new Date(shootDate);
        date.setDate(date.getDate() - (weeks * 7));
        
        // If lands on Saturday (6), move to Friday (5)
        if (date.getDay() === 6) {
            date.setDate(date.getDate() - 1);
        }
        
        return date.toISOString().split('T')[0];
    },

    _holidayCache: {},
    async getJewishHolidays(year, month) {
        const cacheKey = `${year}-${month}`;
        if (this._holidayCache[cacheKey]) return this._holidayCache[cacheKey];

        try {
            const city = this.getCalendarCity();
            const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&month=${month}&ss=on&mf=on&c=on&geo=city&city=${city}&m=50&lg=sh`;
            const response = await fetch(url);
            const data = await response.json();
            
            // Map items by date for easy lookup
            const holidays = {};
            data.items.forEach(item => {
                const date = item.date.split('T')[0];
                if (!holidays[date]) holidays[date] = [];
                holidays[date].push(item);
            });
            
            this._holidayCache[cacheKey] = holidays;
            return holidays;
        } catch (e) {
            console.error('Error fetching Jewish holidays:', e);
            return {};
        }
    },

    getStatusInfo(statusId) {
        return this.defaults.statuses.find(s => s.id === statusId) || this.defaults.statuses[0];
    },

    // Locations
    async getLocations() {
        if (!Auth.getUserId()) return [];
        const mapDefault = (locs) => locs.map(l => ({ ...l, id: `default-${l.id}`, isCustom: false }));
        try {
            const { data, error } = await sb.from('locations').select('*').order('title');
            if (error) {
                if (error.code === '42P01') return mapDefault(this.defaults.locations);
                throw error;
            }
            const customLocations = (data || []).map(l => ({ ...l, isCustom: true }));
            return [...mapDefault(this.defaults.locations), ...customLocations];
        } catch (e) {
            console.warn('Error fetching locations, using defaults:', e);
            return mapDefault(this.defaults.locations);
        }
    },

    async saveLocation(location) {
        const dbLocation = {
            title: location.title,
            region: location.region,
            type: location.type,
            description: location.description,
            user_id: Auth.getUserId()
        };

        try {
        if (location.id && !String(location.id).startsWith('default-')) { // Only edit custom locations
                const { error } = await sb.from('locations').update(dbLocation).eq('id', location.id);
                if (error) throw error;
            } else {
                const { error } = await sb.from('locations').insert([dbLocation]);
                if (error) throw error;
            }
        } catch (e) {
            console.error('Error saving location:', e);
            throw e;
        }
    },

    async deleteLocation(id) {
        // Only allow deleting custom locations (id > 15)
        if (String(id).startsWith('default-')) {
            throw new Error('לא ניתן למחוק לוקיישנים מובנים');
        }
        try {
            const { error } = await sb.from('locations').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('Error deleting location:', e);
            throw e;
        }
    },

    // =====================
    // Documents
    // =====================
    _documentsTableExists: null,

    async getDocuments(clientId = null, projectId = null) {
        if (!Auth.getUserId()) return [];

        try {
            let query = sb.from('client_documents')
                .select('*')
                .eq('user_id', Auth.getUserId())
                .order('created_at', { ascending: false });

            if (clientId) query = query.eq('client_id', clientId);
            if (projectId) query = query.eq('project_id', projectId);

            const { data, error } = await query;
            if (error) {
                if (error.code === '42P01') {
                    this._documentsTableExists = false;
                    return [];
                }
                throw error;
            }
            this._documentsTableExists = true;
            return data || [];
        } catch (e) {
            console.warn('Error fetching documents:', e.message);
            return [];
        }
    },

    async uploadDocument(file, clientId, projectId = null, description = '') {
        if (!Auth.getUserId() || !clientId) throw new Error('Missing required data');

        const userId = Auth.getUserId();
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${userId}/${clientId}/${timestamp}_${safeName}`;

        // 1. Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await sb.storage
            .from('client-documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('שגיאה בהעלאת הקובץ: ' + uploadError.message);
        }

        // 2. Save metadata to DB
        const docRecord = {
            client_id: clientId,
            project_id: projectId || null,
            user_id: userId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            description: description || null
        };

        const { data, error } = await sb.from('client_documents').insert([docRecord]).select();
        if (error) {
            // Cleanup uploaded file if metadata save failed
            await sb.storage.from('client-documents').remove([filePath]);
            throw new Error('שגיאה בשמירת פרטי המסמך: ' + error.message);
        }

        // Log action
        const clients = await this.getClients();
        const client = clients.find(c => String(c.id) === String(clientId));
        const clientLink = client ? `<span class="log-client-link" onclick="app.viewClient('${clientId}')">${client.name}</span>` : '';
        let logDetails = `הועלה מסמך "${file.name}"`;
        if (clientLink) logDetails += ` ללקוח ${clientLink}`;
        if (projectId) {
            const projects = await this.getProjects();
            const project = projects.find(p => String(p.id) === String(projectId));
            if (project) {
                logDetails += ` | פרויקט: <span class="log-client-link" onclick="app.viewProject('${projectId}')">${project.name}</span>`;
            }
        }
        this.logAction('העלאת מסמך', logDetails, 'document', data?.[0]?.id);

        return data?.[0];
    },

    async deleteDocument(docId) {
        if (!Auth.getUserId()) return;

        // 1. Get document to find file path
        const { data: doc, error: fetchError } = await sb
            .from('client_documents')
            .select('*')
            .eq('id', docId)
            .single();

        if (fetchError || !doc) {
            throw new Error('מסמך לא נמצא');
        }

        // 2. Delete from Storage
        const { error: storageError } = await sb.storage
            .from('client-documents')
            .remove([doc.file_path]);

        if (storageError) {
            console.warn('Storage delete warning:', storageError.message);
        }

        // 3. Delete metadata from DB
        const { error: dbError } = await sb.from('client_documents').delete().eq('id', docId);
        if (dbError) {
            throw new Error('שגיאה במחיקת פרטי המסמך: ' + dbError.message);
        }

        // Log action
        this.logAction('מחיקת מסמך', `המסמך "${doc.file_name}" נמחק`, 'document', docId);
    },

    getDocumentUrl(filePath) {
        const { data } = sb.storage.from('client-documents').getPublicUrl(filePath);
        return data?.publicUrl || null;
    },

    async getDocumentDownloadUrl(filePath) {
        const { data, error } = await sb.storage
            .from('client-documents')
            .createSignedUrl(filePath, 3600); // 1 hour
        if (error) {
            console.error('Error creating signed URL:', error);
            return null;
        }
        return data?.signedUrl || null;
    }
};

window.Store = Store;
