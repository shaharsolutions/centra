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

        const googleBtn = document.getElementById('google-auth-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        // Remember Me: auto-fill email if saved
        const savedEmail = localStorage.getItem('remember_email');
        if (savedEmail) {
            const emailInput = document.getElementById('auth-email');
            if (emailInput) emailInput.value = savedEmail;
        }
        // Open Terms Modal
        const openTermsBtn = document.getElementById('open-terms-link');
        const termsModal = document.getElementById('terms-modal');
        if (openTermsBtn && termsModal) {
            openTermsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                termsModal.classList.remove('hidden');
            });
        }

        // Open Privacy Modal (from within terms or elsewhere)
        const openPrivacyBtn = document.getElementById('open-privacy-link');
        const privacyModal = document.getElementById('privacy-modal');
        if (openPrivacyBtn && privacyModal) {
            openPrivacyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                privacyModal.classList.remove('hidden');
            });
        }

        // Approve Terms Button
        const approveTermsBtn = document.getElementById('approve-terms-btn');
        const authTermsCheckbox = document.getElementById('auth-terms');
        if (approveTermsBtn && authTermsCheckbox) {
            approveTermsBtn.addEventListener('click', () => {
                authTermsCheckbox.checked = true;
                termsModal.classList.add('hidden');
            });
        }

        // Close Modals
        document.querySelectorAll('#terms-modal, #privacy-modal').forEach(modal => {
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.addEventListener('click', () => modal.classList.add('hidden'));
            });
        });
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
                const terms = document.getElementById('auth-terms');
                if (terms && !terms.checked) {
                    throw new Error('יש לאשר את תנאי השימוש כדי להמשיך');
                }
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

    async signInWithGoogle() {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) errorDiv.classList.add('hidden');

        try {
            const { error } = await sb.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'https://shaharsolutions.github.io/Centra/index.html'
                }
            });
            if (error) throw error;
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = this.getHebrewError(error.message);
                errorDiv.classList.remove('hidden');
            }
        }
    },

    toggleMode() {
        this.isSignUp = !this.isSignUp;
        const subtitle = document.getElementById('auth-subtitle');
        const submitBtn = document.getElementById('auth-submit-btn');
        const switchText = document.getElementById('auth-switch-text');
        const switchBtn = document.getElementById('auth-switch-btn');
        const googleBtn = document.getElementById('google-auth-btn');
        const rememberGroup = document.getElementById('auth-remember')?.parentElement;
        const termsGroup = document.getElementById('auth-terms-group');

        if (this.isSignUp) {
            subtitle.textContent = 'צור חשבון חדש ב-Centra';
            submitBtn.textContent = 'הרשמה';
            if (googleBtn) googleBtn.querySelector('span').textContent = 'הרשמה עם Google';
            switchText.textContent = 'כבר יש לך חשבון?';
            switchBtn.textContent = 'התחברות עכשיו';
            if (rememberGroup) rememberGroup.classList.add('hidden');
            if (termsGroup) {
                termsGroup.classList.remove('hidden');
                termsGroup.style.display = 'flex'; // Explicitly set for flex layouts
            }
        } else {
            subtitle.textContent = 'התחבר למערכת הניהול שלך';
            submitBtn.textContent = 'התחברות';
            if (googleBtn) googleBtn.querySelector('span').textContent = 'התחברות עם Google';
            switchText.textContent = 'אין לך חשבון?';
            switchBtn.textContent = 'הרשמה עכשיו';
            if (rememberGroup) rememberGroup.classList.remove('hidden');
            if (termsGroup) {
                termsGroup.classList.add('hidden');
                termsGroup.style.display = 'none';
            }
        }
    },

    async updateUI() {
        const overlay = document.getElementById('auth-overlay');
        const userProfile = document.getElementById('user-profile-info');
        const isLoginPage = window.location.pathname.includes('login.html');
        const isIndexPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');

        if (this.session) {
            if (overlay) overlay.classList.add('hidden');
            
            // Redirect from login to index if session exists
            if (isLoginPage) {
                window.location.href = 'index.html';
                return;
            }

            if (userProfile) {
                const profile = window.Store ? await Store.getUserProfile() : null;
                const planName = profile?.plan === 'professional' ? 'Pro' : 'Starter';
                const planColor = profile?.plan === 'professional' ? '#7C3AED' : '#64748B';
                const planBg = profile?.plan === 'professional' ? '#EDE9FE' : '#F1F5F9';

                userProfile.innerHTML = `
                    <div class="user-info" style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; justify-content: flex-end;">
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0; min-width: 0;">
                            <span class="user-email" style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.2; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: ltr;">${this.session.user.email}</span>
                            <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                                <span class="user-plan" style="font-size: 0.65rem; font-weight: 800; color: ${planColor}; background: ${planBg}; padding: 2px 8px; border-radius: 4px; border: 1px solid ${planColor}30; letter-spacing: 0.02em;">
                                    ${planName}
                                </span>
                            </div>
                        </div>
                        <button onclick="Auth.logout(event)" class="btn btn-secondary btn-sm" style="padding: 6px; border-radius: 8px; height: 34px; width: 34px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="התנתקות">
                            <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            }
            
            // Show admin nav if user is admin
            if (window.Admin && Admin.isAdmin()) {
                const adminNav = document.getElementById('nav-admin');
                const adminNavMobile = document.getElementById('nav-admin-mobile');
                if (adminNav) adminNav.classList.remove('hidden');
                if (adminNavMobile) adminNavMobile.classList.remove('hidden');
            }

            // Initialize app if not already done
            if (window.app && !window.app.initialized) {
                window.app.init();
            }
        } else {
            if (overlay) {
                overlay.classList.remove('hidden');
            } else if (isIndexPage) {
                // If on index and no session and no overlay (meaning it's separated), redirect to login
                window.location.href = 'login.html';
            }
        }
    },

    async logout(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const performLogout = async () => {
            await sb.auth.signOut();
            window.location.href = 'login.html';
        };

        if (window.app && window.app.confirmAction) {
            window.app.confirmAction(
                'התנתקות מהמערכת',
                'האם אתה בטוח שברצונך להתנתק מהמערכת?',
                performLogout
            );
            // Change button text in the modal to be more specific
            const yesBtn = document.getElementById('confirm-yes-btn');
            if (yesBtn) {
                yesBtn.textContent = 'כן, להתנתק';
                yesBtn.style.background = 'var(--primary)';
            }
        } else {
            // Simplified fallback if app is not yet initialized but the modal is in HTML
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const descEl = document.getElementById('confirm-desc');
            if (modal && titleEl && descEl) {
                titleEl.innerHTML = 'התנתקות מהמערכת';
                descEl.innerHTML = 'בטוח שאתה רוצה להתנתק?';
                document.getElementById('confirm-yes-btn').onclick = async () => {
                    modal.classList.add('hidden');
                    performLogout();
                };
                document.getElementById('confirm-no-btn').onclick = () => modal.classList.add('hidden');
                modal.classList.remove('hidden');
            } else {
                // Last resort: just sign out if no UI is available
                performLogout();
            }
        }
    },

    getHebrewError(message) {
        if (message.includes('Invalid login credentials')) return 'אימייל או סיסמה לא נכונים';
        if (message.includes('User already registered')) return 'המשתמש כבר קיים במערכת';
        if (message.includes('Password should be at least 6 characters')) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
        if (message.includes('Email not confirmed')) return 'יש לאשר את האימייל שנשלח אליך';
        if (message.includes('יש לאשר את תנאי השימוש')) return message;
        return message;
    },

    getUserId() {
        // If admin is impersonating another user, return that user's ID
        if (window.Admin && Admin._impersonatingUserId) {
            return Admin._impersonatingUserId;
        }
        return this.session?.user?.id;
    },

    getEmail() {
        return this.session?.user?.email || null;
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
    if (typeof sb !== 'undefined' && sb !== null) {
        Auth.init();
    } else {
        console.error('Supabase client (sb) is not initialized. Please check app-config.js.');
    }
});
