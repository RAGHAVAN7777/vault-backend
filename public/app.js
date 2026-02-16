const state = {
    currentScreen: 'screen-login',
    email: '',
    role: 'normal',
    otp: '',
    masterOtp: '',
    userId: ''
};

const screens = ['screen-login', 'screen-signup-1', 'screen-otp', 'screen-master-otp', 'screen-credentials', 'screen-dashboard', 'screen-recover-1', 'screen-recover-2'];

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
        setTimeout(() => { window.location.replace("dashboard.html"); }, 800);
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
        if (state.role === 'admin') {
            setError('PRIMARY_VERIFIED. REQUESTING_MASTER_AUTH...', true);
            await apiCall('/send-master-otp', {});
            showScreen('screen-master-otp');
        } else {
            showScreen('screen-credentials');
        }
    } catch (e) { }
    setBtnLoading('btn-verify-otp', false);
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
document.querySelectorAll('.go-to-login').forEach(el => el.onclick = () => showScreen('screen-login'));

document.querySelectorAll('.role-opt').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.role-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.role = btn.getAttribute('data-role');
    };
});
