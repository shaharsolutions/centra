const supabaseUrl = 'https://qpgceyfsgquhdtvyybwf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZ2NleWZzZ3F1aGR0dnl5YndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MzQ3NjAsImV4cCI6MjA4NTUxMDc2MH0.mM2paucqV5IMyYkB2XE-zRkv3i6XxB80dSzTiCXr_3Q';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

const Store = {
    defaults: {
        statuses: [
            { id: 'new', label: 'פנייה חדשה', class: 'badge-new' },
            { id: 'quote', label: 'הצעת מחיר', class: 'badge-quote' },
            { id: 'closed', label: 'סגור', class: 'badge-closed' },
            { id: 'shooting', label: 'בצילום', class: 'badge-shooting' },
            { id: 'editing', label: 'בעריכה', class: 'badge-editing' },
            { id: 'delivered', label: 'נמסר', class: 'badge-delivered' }
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
        return data || [];
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
        } else {
            const { error } = await sb.from('clients').insert([dbClient]);
            if (error) throw error;
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
                payment_status: p.payment_status || localPaymentStatuses[p.id] || 'not_paid'
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
            location: project.location
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
            }
            
            localStorage.setItem('local_project_locations', JSON.stringify(localLocations));
            localStorage.setItem('local_project_payment_statuses', JSON.stringify(localPaymentStatuses));
            return { ...result, location: project.location, payment_status: project.paymentStatus || 'not_paid' };
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
        ].filter(defItem => !existingItems.some(existing => existing.content === defItem.content && existing.category === defItem.category));

        if (itemsToSave.length === 0) return;

        for (const item of itemsToSave) {
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

    getStatusInfo(statusId) {
        return this.defaults.statuses.find(s => s.id === statusId) || this.defaults.statuses[0];
    }
};

window.Store = Store;
