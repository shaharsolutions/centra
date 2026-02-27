const Auth = {
    session: null,
    isSignUp: false,

    async init() {
        // Listen for auth changes
        sb.auth.onAuthStateChange((event, session) => {
            this.session = session;
            this.updateUI();
            
            if (event === 'SIGNED_IN') {
                console.log('User signed in:', session.user.email);
                if (window.Store) Store.logSessionStart();
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                if (window.Store) Store.logSessionEnd();
                window.location.reload(); // Simplest way to clear state
            }
        });

        // Initialize session
        const { data: { session } } = await sb.auth.getSession();
        this.session = session;
        this.setupEventListeners();
        this.updateUI();

        // Ping session update periodically
        setInterval(() => {
            if (this.session && window.Store) {
                Store.updateSession();
            }
        }, 5 * 60 * 1000); // 5 minutes
    },

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const switchBtn = document.getElementById('auth-switch-btn');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (switchBtn) {
            switchBtn.addEventListener('click', () => this.toggleMode());
        }

        // Remember Me: auto-fill email if saved
        const savedEmail = localStorage.getItem('remember_email');
        if (savedEmail) {
            const emailInput = document.getElementById('auth-email');
            if (emailInput) emailInput.value = savedEmail;
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorDiv = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit-btn');

        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> טוען...';

        try {
            const remember = document.getElementById('auth-remember')?.checked;
            if (remember) {
                localStorage.setItem('remember_email', email);
            } else {
                localStorage.removeItem('remember_email');
            }

            let result;
            if (this.isSignUp) {
                result = await sb.auth.signUp({ email, password });
            } else {
                result = await sb.auth.signInWithPassword({ email, password });
            }

            if (result.error) throw result.error;

            if (this.isSignUp && result.data.user && !result.data.session) {
                errorDiv.textContent = 'שים לב: נשלחה הודעת אימות למייל שלך. יש לאשר אותה כדי להתחבר.';
                errorDiv.classList.remove('hidden');
                errorDiv.style.background = '#ECFDF5';
                errorDiv.style.color = '#059669';
                errorDiv.style.borderColor = '#A7F3D0';
            }

        } catch (error) {
            errorDiv.textContent = this.getHebrewError(error.message);
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = this.isSignUp ? 'הרשמה' : 'התחברות';
        }
    },

    toggleMode() {
        this.isSignUp = !this.isSignUp;
        const subtitle = document.getElementById('auth-subtitle');
        const submitBtn = document.getElementById('auth-submit-btn');
        const switchText = document.getElementById('auth-switch-text');
        const switchBtn = document.getElementById('auth-switch-btn');
        const rememberGroup = document.getElementById('auth-remember')?.parentElement;

        if (this.isSignUp) {
            subtitle.textContent = 'צור חשבון חדש ב-Centra';
            submitBtn.textContent = 'הרשמה';
            switchText.textContent = 'כבר יש לך חשבון?';
            switchBtn.textContent = 'התחברות עכשיו';
            if (rememberGroup) rememberGroup.classList.add('hidden');
        } else {
            subtitle.textContent = 'התחבר למערכת הניהול שלך';
            submitBtn.textContent = 'התחברות';
            switchText.textContent = 'אין לך חשבון?';
            switchBtn.textContent = 'הרשמה עכשיו';
            if (rememberGroup) rememberGroup.classList.remove('hidden');
        }
    },

    updateUI() {
        const overlay = document.getElementById('auth-overlay');
        const userProfile = document.getElementById('user-profile-info');
        
        if (this.session) {
            overlay.classList.add('hidden');
            if (userProfile) {
                userProfile.innerHTML = `
                    <div class="user-info" style="display: flex; align-items: center; gap: 12px;">
                        <span class="user-email" style="font-size: 0.9rem; color: var(--text-muted);">${this.session.user.email}</span>
                        <button onclick="Auth.logout(event)" class="btn btn-secondary btn-sm" style="padding: 4px 8px; border-radius: 6px;">
                            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
                            יציאה
                        </button>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            }
            
            // Show admin nav if user is admin
            if (window.Admin && Admin.isAdmin()) {
                const adminNav = document.getElementById('nav-admin');
                if (adminNav) adminNav.classList.remove('hidden');
            }

            // Initialize app if not already done
            if (window.app && !window.app.initialized) {
                window.app.init();
            }
        } else {
            overlay.classList.remove('hidden');
        }
    },

    async logout(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (window.app && window.app.confirmAction) {
            window.app.confirmAction(
                'התנתקות מהמערכת',
                'האם אתה בטוח שברצונך להתנתק מהמערכת?',
                async () => {
                    await sb.auth.signOut();
                }
            );
            // Change button text in the modal to be more specific
            const yesBtn = document.getElementById('confirm-yes-btn');
            if (yesBtn) {
                yesBtn.textContent = 'כן, להתנתק';
                yesBtn.style.background = 'var(--primary)';
            }
        } else {
            if (confirm('בטוח שאתה רוצה להתנתק?')) {
                await sb.auth.signOut();
            }
        }
    },

    getHebrewError(message) {
        if (message.includes('Invalid login credentials')) return 'אימייל או סיסימה לא נכונים';
        if (message.includes('User already registered')) return 'המשתמש כבר קיים במערכת';
        if (message.includes('Password should be at least 6 characters')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
        if (message.includes('Email not confirmed')) return 'יש לאשר את האימייל שנשלח אליך';
        return message;
    },

    getUserId() {
        // If admin is impersonating another user, return that user's ID
        if (window.Admin && Admin._impersonatingUserId) {
            return Admin._impersonatingUserId;
        }
        return this.session?.user?.id;
    },

    async updatePassword(newPassword) {
        try {
            const { error } = await sb.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: this.getHebrewError(error.message) };
        }
    }
};

// Initialize as soon as config and supabase are available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof sb !== 'undefined') {
        Auth.init();
    }
});
