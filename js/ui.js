const UI = {
    renderDashboard() {
        const customers = Store.getCustomers();
        const openJobs = customers.filter(c => ['closed', 'shooting', 'editing'].includes(c.status)).length;
        const waitingPayment = customers.filter(c => c.payments?.status !== 'paid' && c.payments?.total > 0).length;
        const inEditing = customers.filter(c => c.status === 'editing').length;

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon-label"><i data-lucide="briefcase"></i> עבודות פתוחות</div>
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
                <button class="btn btn-secondary" onclick="document.getElementById('quick-add-btn').click()">
                    <i data-lucide="user-plus"></i> הוספת לקוח
                </button>
                <button class="btn btn-secondary" onclick="app.navigate('calendar')">
                    <i data-lucide="calendar"></i> הלו״ז שלי
                </button>
            </div>
        `;
        
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'הדשבורד שלך';
        document.getElementById('view-subtitle').innerText = 'מבט מהיר על העסק.';
        lucide.createIcons();
    },

    renderCustomers() {
        const customers = Store.getCustomers();
        let listHtml = '';

        if (customers.length === 0) {
            listHtml = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">עדיין אין לקוחות. קדימה, צלמי משהו! 📸</div>';
        } else {
            listHtml = `
                <div class="card-list">
                    ${customers.map(c => {
                        const status = Store.getStatusInfo(c.status);
                        const pStatus = c.payments?.status || 'unpaid';
                        const pLabel = pStatus === 'paid' ? 'שולם' : (pStatus === 'deposit' ? 'מקדמה' : 'לא שולם');
                        const pClass = pStatus === 'paid' ? 'badge-closed' : (pStatus === 'deposit' ? 'badge-quote' : 'badge-new');
                        
                        return `
                            <div class="list-item">
                                <div class="item-info">
                                    <span class="item-name">${c.name}</span>
                                    <div style="display:flex; gap:8px; align-items:center;">
                                        <span class="item-sub">${c.phone} | ${this.getSourceLabel(c.source)}</span>
                                        <span class="badge ${pClass}" style="font-size: 10px; padding: 2px 8px;">${pLabel}</span>
                                    </div>
                                </div>
                                <div class="item-actions" style="display: flex; align-items: center; gap: 12px;">
                                    <a href="https://wa.me/972${c.phone.replace(/^0/, '')}" target="_blank" class="btn btn-secondary btn-sm" style="color:#25D366;">
                                        <i data-lucide="message-circle" style="width:14px;"></i>
                                    </a>
                                    <span class="badge ${status.class}">${status.label}</span>
                                    <button class="btn btn-secondary btn-sm" onclick="app.editCustomer('${c.id}')"><i data-lucide="edit-2" style="width:14px;"></i></button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = listHtml;
        document.getElementById('view-title').innerText = 'ניהול לקוחות';
        document.getElementById('view-subtitle').innerText = 'כל הלקוחות שלך במקום אחד.';
        lucide.createIcons();
    },

    renderCalendar() {
        const customers = Store.getCustomers()
            .filter(c => c.shootDate)
            .sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate));

        let html = '';
        if (customers.length === 0) {
            html = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">אין צילומים מתוכננים. שיהיה לו״ז עמוס בקרוב! 🙏</div>';
        } else {
            html = `
                <div class="card-list">
                    ${customers.map(c => `
                        <div class="list-item">
                            <div class="item-info">
                                <span class="item-name">${c.name}</span>
                                <span class="item-sub">${new Date(c.shootDate).toLocaleDateString('he-IL')} בשעה ${c.shootTime || '--:--'}</span>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-secondary" onclick="app.editCustomer('${c.id}')">פרטים</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'לוח צילומים';
        document.getElementById('view-subtitle').innerText = 'הצילומים הקרובים שלך.';
        lucide.createIcons();
    },

    renderEditing() {
        const customers = Store.getCustomers().filter(c => c.status === 'editing');
        let html = '';

        if (customers.length === 0) {
            html = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">אין עבודות בעריכה. איזה כיף, חופש! 🥤</div>';
        } else {
            html = `
                <div class="card-list">
                    ${customers.map(c => `
                        <div class="list-item">
                            <div class="item-info">
                                <span class="item-name">${c.name}</span>
                                <span class="item-sub">ממתין למסירה</span>
                            </div>
                            <div class="item-actions">
                                <button class="btn btn-primary btn-sm" onclick="app.updateStatus('${c.id}', 'delivered')">סומן כנמסר ✅</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'עבודות בעריכה';
        document.getElementById('view-subtitle').innerText = 'אל תשכחי לשלוח ללקוחות!';
        lucide.createIcons();
    },

    renderSettings() {
        const packages = Store.getPackages();
        const html = `
            <div class="settings-container">
                <section class="settings-section">
                    <h2 class="section-title">חבילות צילום</h2>
                    <p class="section-desc">הגדירי את החבילות שאת מציעה ללקוחות.</p>
                    
                    <div class="card-list" style="margin-top: 20px;">
                        ${packages.map(p => `
                            <div class="list-item">
                                <div class="item-info">
                                    <span class="item-name">${p.name}</span>
                                    <span class="item-sub">${p.price} ₪</span>
                                </div>
                                <div class="item-actions" style="display:flex; gap:8px;">
                                    <button class="btn btn-secondary btn-sm" onclick="app.editPackage('${p.id}')">
                                        <i data-lucide="edit-2" style="width:14px;"></i>
                                    </button>
                                    <button class="btn btn-secondary btn-sm" onclick="app.deletePackage('${p.id}')">
                                        <i data-lucide="trash-2" style="width:14px; color:#EF4444;"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div id="package-form-container" style="margin-top:20px; padding:20px; background:white; border-radius:var(--radius-lg); border:1px solid var(--border);">
                        <h3 id="package-form-title" style="margin-bottom:15px; font-size:1rem;">הוספת חבילה חדשה</h3>
                        <div class="form-row" style="margin-bottom:0; align-items: flex-end;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label>שם החבילה</label>
                                <input type="text" id="new-pkg-name" placeholder="לדוגמה: צילומי תדמית">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label>מחיר (₪)</label>
                                <input type="number" id="new-pkg-price" placeholder="0">
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button id="add-pkg-btn" class="btn btn-primary" onclick="app.savePackage()">הוספה</button>
                                <button id="cancel-pkg-btn" class="btn btn-secondary" style="display:none;" onclick="app.clearPackageForm()">ביטול</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="settings-section" style="margin-top:40px; padding-top:40px; border-top:1px solid var(--border);">
                    <h2 class="section-title" style="color:#EF4444;">ניהול נתונים</h2>
                    <p class="section-desc">זהירות: פעולות אלו אינן ניתנות לביטול.</p>
                    <button class="btn btn-secondary" style="margin-top:15px; color:#EF4444; border-color:#FECACA;" onclick="app.resetData()">
                        מחיקת כל הנתונים והתחלה מחדש
                    </button>
                </section>
            </div>
        `;
        document.getElementById('view-container').innerHTML = html;
        document.getElementById('view-title').innerText = 'הגדרות';
        document.getElementById('view-subtitle').innerText = 'התאמת המערכת לעסק שלך.';
        lucide.createIcons();
    },

    getSourceLabel(source) {
        const sources = {
            'whatsapp': 'וואטסאפ',
            'instagram': 'אינסטגרם',
            'recommendation': 'המלצה',
            'other': 'אחר'
        };
        return sources[source] || source;
    },

    populatePackages() {
        const pkgs = Store.getPackages();
        const select = document.getElementById('package');
        select.innerHTML = pkgs.map(p => `<option value="${p.id}">${p.name} (${p.price} ₪)</option>`).join('');
    }
};

window.UI = UI;
