const state = {
    currentScreen: 'screen-login',
    email: '',
    role: 'normal',
    otp: '',
    masterOtp: '',
    userId: ''
};

const screens = ['screen-login', 'screen-signup-1', 'screen-otp', 'screen-admin-notice', 'screen-master-otp', 'screen-credentials', 'screen-dashboard', 'screen-recover-1', 'screen-recover-2'];

// UI Helpers
const showScreen = (id) => {
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (!el) return;
        el.classList.remove('active');
        if (s === id) {
            setTimeout(() => el.classList.add('active'), 50);
        }
    });

    // Erase all input values on screen change for security
    document.querySelectorAll('input').forEach(input => {
        input.value = '';
    });

    document.getElementById('error-display').innerText = '';
    document.getElementById('error-display').style.color = '#ff3333';
    state.currentScreen = id;
};

const setError = (msg, isSuccess = false) => {
    const el = document.getElementById('error-display');
    el.innerText = isSuccess ? `// ${msg}` : `!! ERROR: ${msg}`;
    el.style.color = isSuccess ? '#33ff33' : '#ff3333';
};

const setBtnLoading = (id, isLoading) => {
    const btn = document.getElementById(id);
    const loader = document.getElementById('monolith-loader');
    if (!btn || !loader) return;

    if (!btn.getAttribute('data-original-text')) {
        btn.setAttribute('data-original-text', btn.innerHTML);
    }

    btn.disabled = isLoading;
    loader.style.display = isLoading ? 'block' : 'none';

    if (isLoading) {
        btn.innerHTML = 'EXECUTING...';
    } else {
        btn.innerHTML = btn.getAttribute('data-original-text');
    }
};

const apiCall = async (endpoint, data) => {
    try {
        const res = await fetch(`/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'COMMAND_FAILED');
        return result;
    } catch (err) {
        setError(err.message);
        throw err;
    }
};

// --- Screen Interactions ---

// Login
document.getElementById('btn-login').onclick = async () => {
    const userId = document.getElementById('login-userid').value;
    const mpin = document.getElementById('login-mpin').value;
    if (!userId || mpin.length !== 6) return setError('INVALID_OPERATOR_DATA');

    setBtnLoading('btn-login', true);
    try {
        const res = await apiCall('/login', { userId, mpin });
        sessionStorage.setItem("userRole", res.user.role);
        sessionStorage.setItem("userId", res.user.userId);
        setError('ACCESS_GRANTED. INITIALIZING_DASHBOARD...', true);
        setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
    } catch (e) { }
    setBtnLoading('btn-login', false);
};

// Request OTP (Signup)
document.getElementById('btn-send-otp').onclick = async () => {
    const email = document.getElementById('signup-email').value;
    if (!email.includes('@')) return setError('INVALID_EMAIL_FORMAT');

    setBtnLoading('btn-send-otp', true);
    try {
        await apiCall('/send-otp', { email, role: state.role });
        state.email = email;
        showScreen('screen-otp');
    } catch (e) { }
    setBtnLoading('btn-send-otp', false);
};

// Verify User OTP
document.getElementById('btn-verify-otp').onclick = async () => {
    const otp = document.getElementById('otp-code').value;
    if (otp.length !== 6) return setError('INVALID_TOKEN_LENGTH');

    setBtnLoading('btn-verify-otp', true);
    try {
        await apiCall('/verify-otp', { email: state.email, otp });
        state.otp = otp;
        if (state.role === 'premium') {
            setError('PRIMARY_VERIFIED. AWAITING_ADMIN_ACKNOWLEDGEMENT...', true);
            showScreen('screen-admin-notice');
        } else {
            showScreen('screen-credentials');
        }
    } catch (e) { }
    setBtnLoading('btn-verify-otp', false);
};

// Admin Notice Confirm
document.getElementById('btn-admin-notice-confirm').onclick = async () => {
    setBtnLoading('btn-admin-notice-confirm', true);
    try {
        await apiCall('/send-master-otp', {});
        showScreen('screen-master-otp');
    } catch (e) { }
    setBtnLoading('btn-admin-notice-confirm', false);
};

// Verify Master OTP (L3 Admin Tier)
document.getElementById('btn-verify-master-otp').onclick = async () => {
    const otp = document.getElementById('master-otp-code').value;
    if (otp.length !== 6) return setError('INVALID_MASTER_TOKEN');

    setBtnLoading('btn-verify-master-otp', true);
    try {
        await apiCall('/verify-master-otp', { otp });
        state.masterOtp = otp;
        showScreen('screen-credentials');
    } catch (e) { }
    setBtnLoading('btn-verify-master-otp', false);
};

// Register
document.getElementById('btn-register').onclick = async () => {
    const userId = document.getElementById('signup-userid').value;
    const mpin = document.getElementById('signup-mpin').value;
    if (!userId || mpin.length !== 6) return setError('CREDENTIAL_CRITERIA_NOT_MET');

    setBtnLoading('btn-register', true);
    try {
        await apiCall('/register', {
            userId,
            email: state.email,
            role: state.role,
            mpin,
            otp: state.otp,
            masterOtp: state.masterOtp
        });
        showScreen('screen-login');
        setError('ENTITY_REGISTERED. INITIALIZE_LOGIN.', true);
    } catch (e) { }
    setBtnLoading('btn-register', false);
};

// --- Recovery Flow ---
document.getElementById('go-to-recovery').onclick = () => showScreen('screen-recover-1');

document.getElementById('btn-recover-send-otp').onclick = async () => {
    const userId = document.getElementById('recover-userid').value;
    const email = document.getElementById('recover-email').value;
    if (!userId || !email.includes('@')) return setError('MISSING_REFERENCE_DATA');

    setBtnLoading('btn-recover-send-otp', true);
    try {
        await apiCall('/recover/send-otp', { userId, email });
        state.userId = userId;
        showScreen('screen-recover-2');
    } catch (e) { }
    setBtnLoading('btn-recover-send-otp', false);
};

document.getElementById('btn-recover-reset').onclick = async () => {
    const otp = document.getElementById('recover-otp').value;
    const mpin = document.getElementById('recover-new-mpin').value;
    if (otp.length !== 6 || mpin.length !== 6) return setError('AUTHENTICATION_MISMATCH');

    setBtnLoading('btn-recover-reset', true);
    try {
        await apiCall('/recover/reset-mpin', { userId: state.userId, mpin, otp });
        showScreen('screen-login');
        setError('SECURITY_KEYS_OVERWRITTEN.', true);
    } catch (e) { }
    setBtnLoading('btn-recover-reset', false);
};

// --- Navigation ---
document.getElementById('go-to-signup').onclick = () => showScreen('screen-signup-1');
document.querySelectorAll('.go-to-login').forEach(el => el.onclick = () => {
    // Reset toggle to User if we go back to login
    const toggle = document.getElementById('login-mode-toggle');
    if (toggle && toggle.classList.contains('admin-mode')) {
        toggle.click();
    }
    showScreen('screen-login');
});

document.querySelectorAll('.role-opt').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.role-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.role = btn.getAttribute('data-role');
    };
});

// --- Admin Pattern Lock & Toggle Logic ---

const loginModeToggle = document.getElementById('login-mode-toggle');
const userFields = document.getElementById('user-login-fields');
const adminFields = document.getElementById('admin-pattern-fields');
const toggleLabels = document.querySelectorAll('.toggle-label');

if (loginModeToggle) {
    loginModeToggle.onclick = () => {
        const isAdmin = loginModeToggle.classList.toggle('admin-mode');
        userFields.style.display = isAdmin ? 'none' : 'block';
        adminFields.style.display = isAdmin ? 'block' : 'none';

        toggleLabels.forEach(label => {
            label.classList.toggle('active', label.getAttribute('data-mode') === (isAdmin ? 'admin' : 'user'));
        });

        if (isAdmin) {
            patternLock.init();
        }
    };
}

class PatternLock {
    constructor() {
        this.canvas = document.getElementById('pattern-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.dots = document.querySelectorAll('.dot');
        this.status = document.getElementById('pattern-status');
        this.isDrawing = false;
        this.path = [];
        // Pattern removed for security - verification moved to backend

        if (this.canvas) {
            this.handleEvents();
        }
    }

    init() {
        this.resize();
        this.clear();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    clear() {
        this.path = [];
        this.isDrawing = false;
        this.dots.forEach(dot => dot.classList.remove('active', 'error'));
        this.draw();
        if (this.status) this.status.innerText = 'CONNECT_NODES_TO_AUTHORIZE';
        if (this.status) this.status.style.color = 'var(--text-dim)';
    }

    handleEvents() {
        const container = this.canvas.parentElement;

        const startDrawing = (e) => {
            if (loginModeToggle && !loginModeToggle.classList.contains('admin-mode')) return;
            this.clear();
            this.isDrawing = true;
            this.handleMove(e);
        };

        const stopDrawing = () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;
            this.verify();
        };

        container.addEventListener('mousedown', startDrawing);
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrawing(e.touches[0]);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.handleMove(e);
        });
        window.addEventListener('touchmove', (e) => {
            if (this.isDrawing) {
                e.preventDefault();
                this.handleMove(e.touches[0]);
            }
        });

        window.addEventListener('mouseup', stopDrawing);
        window.addEventListener('touchend', stopDrawing);
    }

    handleMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.dots.forEach((dot, index) => {
            const dotRect = dot.getBoundingClientRect();
            const dotX = dotRect.left + dotRect.width / 2 - rect.left;
            const dotY = dotRect.top + dotRect.height / 2 - rect.top;

            const dist = Math.hypot(x - dotX, y - dotY);
            if (dist < 25 && !this.path.includes(index)) {
                this.path.push(index);
                dot.classList.add('active');
            }
        });

        this.currentMousePos = { x, y };
        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.path.length === 0) return;

        this.ctx.beginPath();
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#6495ED';
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        const rect = this.canvas.getBoundingClientRect();

        this.path.forEach((dotIndex, i) => {
            const dot = this.dots[dotIndex];
            const dotRect = dot.getBoundingClientRect();
            const dx = dotRect.left + dotRect.width / 2 - rect.left;
            const dy = dotRect.top + dotRect.height / 2 - rect.top;

            if (i === 0) this.ctx.moveTo(dx, dy);
            else this.ctx.lineTo(dx, dy);
        });

        if (this.isDrawing && this.currentMousePos) {
            this.ctx.lineTo(this.currentMousePos.x, this.currentMousePos.y);
        }

        this.ctx.stroke();
    }

    async verify() {
        const patternStr = this.path.join('');
        if (patternStr.length === 0) return;

        try {
            const res = await apiCall('/admin-login-pattern', { pattern: patternStr });
            if (res.success) {
                this.status.innerText = 'ADMIN_ACCESS_GRANTED. REDIRECTING...';
                this.status.style.color = 'var(--success)';
                sessionStorage.setItem("userRole", "premium");
                sessionStorage.setItem("userId", "SYSTEM_ADMIN");
                setTimeout(() => {
                    window.location.href = "admin.html";
                }, 1000);
            }
        } catch (err) {
            this.status.innerText = 'INVALID_PATTERN_SEQUENCE';
            this.status.style.color = 'var(--error)';
            this.dots.forEach(dot => {
                if (dot.classList.contains('active')) dot.classList.add('error');
            });
            setTimeout(() => this.clear(), 1000);
        }
    }
}

const patternLock = new PatternLock();
window.addEventListener('resize', () => patternLock.resize());
