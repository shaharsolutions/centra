const supabaseUrl = 'https://qpgceyfsgquhdtvyybwf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZ2NleWZzZ3F1aGR0dnl5YndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MzQ3NjAsImV4cCI6MjA4NTUxMDc2MH0.mM2paucqV5IMyYkB2XE-zRkv3i6XxB80dSzTiCXr_3Q';
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
            { id: 'delivered', label: 'נמסר', class: 'badge-delivered' }
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
        ]
    },

    async init() {
        // Silently check if checklist table exists and cache it in localStorage
        if (localStorage.getItem('sb_checklists_missing') === 'true') {
            this._checklistTableExists = false;
        } else {
            try {
                const { error } = await sb.from('project_checklists').select('count', { count: 'exact', head: true }).limit(1);
                if (error && (error.code === '42P01' || error.status === 404)) {
                    this._checklistTableExists = false;
                    localStorage.setItem('sb_checklists_missing', 'true');
                } else {
                    this._checklistTableExists = true;
                    localStorage.removeItem('sb_checklists_missing');
                }
            } catch (e) {
                this._checklistTableExists = false;
            }
        }

        const { data: packages, error } = await sb.from('packages').select('*');
        if (error) {
            console.error('Error connecting to Supabase:', error);
            return;
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
    },

    _checklistTableExists: null,

    // Clients
    async getClients() {
        const { data, error } = await sb
            .from('clients')
            .select('*')
            .order('name');
        if (error) console.error('Error fetching clients:', error);
        
        const clients = data || [];
        const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
        
        return clients.map(c => ({
            ...c,
            city: localExtras[c.id]?.city || c.city,
            email: localExtras[c.id]?.email || c.email,
            instagram: localExtras[c.id]?.instagram || c.instagram,
            facebook: localExtras[c.id]?.facebook || c.facebook,
            website: localExtras[c.id]?.website || c.website
        }));
    },

    async saveClient(client) {
        const dbClient = {
            name: client.name,
            phone: client.phone,
            source: client.source
        };

        if (client.id) {
            const { error } = await sb.from('clients').update(dbClient).eq('id', client.id);
            if (error) throw error;
            
            // Save extras
            const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
            localExtras[client.id] = {
                city: client.city,
                email: client.email,
                instagram: client.instagram,
                facebook: client.facebook,
                website: client.website
            };
            localStorage.setItem('local_client_extras', JSON.stringify(localExtras));
        } else {
            const { data, error } = await sb.from('clients').insert([dbClient]).select();
            if (error) throw error;
            
            if (data && data[0]) {
                const newId = data[0].id;
                const localExtras = JSON.parse(localStorage.getItem('local_client_extras') || '{}');
                localExtras[newId] = {
                    city: client.city,
                    email: client.email,
                    instagram: client.instagram,
                    facebook: client.facebook,
                    website: client.website
                };
                localStorage.setItem('local_client_extras', JSON.stringify(localExtras));
            }
        }
    },

    async deleteClient(id) {
        const { error } = await sb.from('clients').delete().eq('id', id);
        if (error) throw error;
    },

    // Projects
    async getProjects(clientId = null) {
        let query = sb.from('projects').select('*, clients(name)');
        if (clientId) {
            query = query.eq('client_id', clientId);
        }
        const { data: projects, error } = await query.order('created_at', { ascending: false });
        if (error) console.error('Error fetching projects:', error);
        
        const data = projects || [];
        
        // Merge local data if DB columns are missing
        const localLocations = JSON.parse(localStorage.getItem('local_project_locations') || '{}');
        const localPaymentStatuses = JSON.parse(localStorage.getItem('local_project_payment_statuses') || '{}');
        return data.map(p => {
            // Normalize clients field - ensure it's always { name: '...' } or null
            let normalizedClients = p.clients;
            if (p.clients && typeof p.clients === 'object' && !p.clients.name) {
                // If clients is an object but doesn't have a 'name' property, try to find it
                normalizedClients = null;
            }
            
            return {
                ...p,
                clients: normalizedClients,
                location: p.location || localLocations[p.id] || '',
                payment_status: p.payment_status || localPaymentStatuses[p.id] || 'not_paid',
                not_closed_reason: p.not_closed_reason || JSON.parse(localStorage.getItem('local_project_reasons') || '{}')[p.id] || '',
                subjects_count: p.subjects_count || JSON.parse(localStorage.getItem('local_project_subjects') || '{}')[p.id]?.count || '',
                subjects_details: p.subjects_details || JSON.parse(localStorage.getItem('local_project_subjects') || '{}')[p.id]?.details || '',
                shoot_time: p.shoot_time || JSON.parse(localStorage.getItem('local_project_times') || '{}')[p.id] || '',
                styling_call: p.styling_call || JSON.parse(localStorage.getItem('local_project_styling') || '{}')[p.id] || 'none'
            };
        });
    },

    async saveProject(project) {
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
            shoot_time: project.shootTime,
            styling_call: project.stylingCall
        };

        try {
            if (project.id) {
                const { data, error } = await sb.from('projects').update(dbProject).eq('id', project.id).select('*, clients(name)');
                if (error) throw error;
                return data[0];
            } else {
                const { data, error } = await sb.from('projects').insert([dbProject]).select('*, clients(name)');
                if (error) throw error;
                return data[0];
            }
        } catch (e) {
            // If column is missing (400 or specifically "location" or "payment_status" not found)
            console.warn('Supabase column save failed, storing locally:', e.message);
            
            // Save to localStorage mapping
            const localLocations = JSON.parse(localStorage.getItem('local_project_locations') || '{}');
            const localPaymentStatuses = JSON.parse(localStorage.getItem('local_project_payment_statuses') || '{}');
            
            // Re-attempt without missing fields
            const fallbackProject = { ...dbProject };
            delete fallbackProject.location;
            delete fallbackProject.payment_status;
            delete fallbackProject.not_closed_reason;
            delete fallbackProject.subjects_count;
            delete fallbackProject.subjects_details;
            delete fallbackProject.shoot_time;
            delete fallbackProject.styling_call;
            
            const localReasons = JSON.parse(localStorage.getItem('local_project_reasons') || '{}');
            const localSubjects = JSON.parse(localStorage.getItem('local_project_subjects') || '{}');
            const localTimes = JSON.parse(localStorage.getItem('local_project_times') || '{}');
            const localStyling = JSON.parse(localStorage.getItem('local_project_styling') || '{}');

            let result;
            if (project.id) {
                localLocations[project.id] = project.location;
                localPaymentStatuses[project.id] = project.paymentStatus || 'not_paid';
                const { data, error } = await sb.from('projects').update(fallbackProject).eq('id', project.id).select('*, clients(name)');
                if (error) throw error;
                result = data[0];
            } else {
                const { data, error } = await sb.from('projects').insert([fallbackProject]).select('*, clients(name)');
                if (error) throw error;
                result = data[0];
                if (project.location) {
                    localLocations[result.id] = project.location;
                }
                localPaymentStatuses[result.id] = project.paymentStatus || 'not_paid';
                localSubjects[result.id] = { count: project.subjectsCount, details: project.subjectsDetails };
                if (project.shootTime) {
                    localTimes[result.id] = project.shootTime;
                }
                if (project.stylingCall) {
                    localStyling[result.id] = project.stylingCall;
                }
            }
            
            localStorage.setItem('local_project_locations', JSON.stringify(localLocations));
            localStorage.setItem('local_project_payment_statuses', JSON.stringify(localPaymentStatuses));
            localStorage.setItem('local_project_reasons', JSON.stringify(localReasons));
            localStorage.setItem('local_project_subjects', JSON.stringify(localSubjects));
            localStorage.setItem('local_project_times', JSON.stringify(localTimes));
            localStorage.setItem('local_project_styling', JSON.stringify(localStyling));
            return { 
                ...result, 
                location: project.location, 
                payment_status: project.paymentStatus || 'not_paid', 
                not_closed_reason: project.notClosedReason,
                subjects_count: project.subjectsCount,
                subjects_details: project.subjectsDetails,
                shoot_time: project.shootTime,
                styling_call: project.stylingCall
            };
        }
    },

    async updateProjectStatus(id, status) {
        const { error } = await sb.from('projects').update({ status }).eq('id', id);
        if (error) throw error;
    },

    async deleteProject(id) {
        const { error } = await sb.from('projects').delete().eq('id', id);
        if (error) throw error;
    },

    // Packages
    async getPackages() {
        const { data, error } = await sb.from('packages').select('*').order('name');
        return data || [];
    },

    async savePackage(pkg) {
        if (pkg.id) {
            await sb.from('packages').update({ name: pkg.name, price: pkg.price }).eq('id', pkg.id);
        } else {
            await sb.from('packages').insert([{ name: pkg.name, price: pkg.price }]);
        }
    },

    async deletePackage(id) {
        await sb.from('packages').delete().eq('id', id);
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
            project_id: projectId
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
        if (this._checklistTableExists === false) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.filter(item => item.project_id === projectId);
        }

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
            return data || [];
        } catch (e) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.filter(item => item.project_id === projectId);
        }
    },

    async getTaskById(id) {
        if (this._checklistTableExists === false || String(id).startsWith('local_')) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.find(item => item.id === id);
        }

        try {
            const { data, error } = await sb.from('project_checklists').select('*, projects(name)').eq('id', id).single();
            if (error) throw error;
            return data;
        } catch (e) {
            const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
            return localItems.find(item => item.id === id);
        }
    },

    async getAllTasks() {
        if (this._checklistTableExists === false) {
            return JSON.parse(localStorage.getItem('local_checklists') || '[]');
        }

        try {
            const { data, error } = await sb
                .from('project_checklists')
                .select('*, projects(name)')
                .order('created_at', { ascending: false });
            
            if (error) {
                if (error.code === '42P01') this._checklistTableExists = false;
                throw error;
            }
            return data || [];
        } catch (e) {
            return JSON.parse(localStorage.getItem('local_checklists') || '[]');
        }
    },

    async saveChecklistItem(item) {
        let savedItemId = item.id;
        if (this._checklistTableExists !== false) {
            try {
                let res;
                if (item.id && !String(item.id).startsWith('local_')) {
                    res = await sb.from('project_checklists').update({
                        content: item.content,
                        is_completed: item.isCompleted,
                        category: item.category,
                        due_date: item.dueDate || null,
                        notes: item.notes || null
                    }).eq('id', item.id).select();
                } else {
                    res = await sb.from('project_checklists').insert([{
                        project_id: item.projectId || null,
                        content: item.content,
                        is_completed: item.isCompleted || false,
                        category: item.category || 'task',
                        due_date: item.dueDate || null,
                        notes: item.notes || null
                    }]).select();
                }
                if (res.error) {
                    if (res.error.code === '42P01') this._checklistTableExists = false;
                    throw res.error;
                }
                if (res.data && res.data[0]) savedItemId = res.data[0].id;
            } catch (e) {
                console.warn('Supabase checklist save failed, using local fallback');
            }
        }

        // Sync with Local storage
        const localItems = JSON.parse(localStorage.getItem('local_checklists') || '[]');
        const existingIdx = localItems.findIndex(i => (savedItemId && i.id === savedItemId) || (i.content === item.content && i.project_id === item.projectId && i.category === item.category));
        
        const itemToSave = {
            id: savedItemId || item.id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            project_id: item.projectId || null,
            content: item.content,
            is_completed: item.isCompleted || false,
            category: item.category || 'task',
            due_date: item.dueDate || null,
            notes: item.notes || null,
            created_at: item.created_at || new Date().toISOString()
        };

        if (existingIdx !== -1) {
            localItems[existingIdx] = itemToSave;
        } else {
            localItems.push(itemToSave);
        }
        localStorage.setItem('local_checklists', JSON.stringify(localItems));
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
        const idx = localItems.findIndex(i => i.id === id);
        if (idx !== -1) {
            localItems[idx].is_completed = isCompleted;
            localStorage.setItem('local_checklists', JSON.stringify(localItems));
        }
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
        const filtered = localItems.filter(i => i.id !== id);
        localStorage.setItem('local_checklists', JSON.stringify(filtered));
    },

    // Checklist Defaults
    getChecklistDefaults() {
        const stored = localStorage.getItem('checklist_defaults');
        if (stored) return JSON.parse(stored);
        
        // Return hardcoded defaults if nothing in localStorage
        return {
            shoot: ['שיחה מקדימה עם הלקוחה', 'בדיקת מזג אוויר', 'שליחת תזכורת יום לפני', 'בדיקת לוקיישן'],
            equipment: ['מצלמה גוף 1', 'מכרטיסי זיכרון ריקים', 'סוללות טעונות', 'עדשות נקיות']
        };
    },

    saveChecklistDefaults(defaults) {
        localStorage.setItem('checklist_defaults', JSON.stringify(defaults));
    },

    async addDefaultsToProject(projectId, shootDate = null) {
        if (!projectId) return;
        
        let clientName = '';
        let projects = await this.getProjects();
        let currentProjectResource = projects.find(p => p.id === projectId);
        let stylingCall = currentProjectResource?.styling_call || 'none';

        try {
            const { data, error } = await sb.from('projects').select('clients(name)').eq('id', projectId).single();
            if (data?.clients?.name) {
                clientName = data.clients.name; // Extract just the name string
            }
        } catch (e) {
            console.warn('Could not fetch client name for defaults');
        }

        const existingItems = await this.getChecklistItems(projectId);
        const defaults = this.getChecklistDefaults();
        
        const itemsToSave = [
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

        if (stylingCall !== 'none' && shootDate) {
            const weeks = stylingCall === '1_week' ? 1 : 2;
            const stylingDate = this._calculateStylingDate(shootDate, weeks);
            itemsToSave.push({
                projectId,
                content: `שיחת סטיילינג ${clientName ? '(' + clientName + ')' : ''}`,
                category: 'shoot',
                dueDate: stylingDate
            });
        }

        const finalItemsToSave = itemsToSave.filter(defItem => !existingItems.some(existing => existing.content === defItem.content && existing.category === defItem.category));

        if (finalItemsToSave.length === 0) return;

        for (const item of finalItemsToSave) {
            try {
                await this.saveChecklistItem(item);
            } catch (err) {
                console.error('Failed to save default item:', item, err);
            }
        }
    },

    getChecklistDisplayMode() {
        return localStorage.getItem('checklist_display_mode') || 'checkbox';
    },

    setChecklistDisplayMode(mode) {
        localStorage.setItem('checklist_display_mode', mode);
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
            const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&month=${month}&ss=on&mf=on&c=on&geo=city&city=IL-Tel+Aviv&m=50&lg=sh`;
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
    }
};

window.Store = Store;
