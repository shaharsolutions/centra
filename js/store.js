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
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) console.error('Error fetching projects:', error);
        return data || [];
    },

    async saveProject(project) {
        const dbProject = {
            client_id: project.clientId,
            name: project.name,
            shoot_date: project.shootDate || null,
            status: project.status || 'new',
            payments: project.payments,
            drive_link: project.driveLink,
            notes: project.notes
        };

        if (project.id) {
            const { error } = await sb.from('projects').update(dbProject).eq('id', project.id);
            if (error) throw error;
        } else {
            const { error } = await sb.from('projects').insert([dbProject]);
            if (error) throw error;
        }
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

    getStatusInfo(statusId) {
        return this.defaults.statuses.find(s => s.id === statusId) || this.defaults.statuses[0];
    }
};

window.Store = Store;
