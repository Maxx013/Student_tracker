// ============================================
// UI Utilities - Toast, Modal, Helpers
// ============================================

// ---- TOAST NOTIFICATIONS ----
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ---- MODAL HELPERS ----
function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ---- SIDEBAR TOGGLE ----
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// Close sidebar on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('sidebar-overlay')) {
        toggleSidebar();
    }
});

// ---- USER INFO HELPERS ----
function updateUserUI(user) {
    // Update sidebar user info
    const nameEls = document.querySelectorAll('.user-display-name');
    const emailEls = document.querySelectorAll('.user-display-email');
    const avatarEls = document.querySelectorAll('.sidebar-avatar');
    const navUserEls = document.querySelectorAll('.navbar-user-name');

    const displayName = user.displayName || user.email.split('@')[0];
    const initials = getInitials(displayName);

    nameEls.forEach(el => el.textContent = displayName);
    emailEls.forEach(el => el.textContent = user.email);
    avatarEls.forEach(el => el.textContent = initials);
    navUserEls.forEach(el => el.textContent = displayName);
}

function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// ---- FORMAT HELPERS ----
function formatDate(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ---- CONFIRM DIALOG ----
function confirmAction(message) {
    return new Promise((resolve) => {
        if (confirm(message)) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

// ---- LOADING STATE ----
function setLoading(elementId, loading) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (loading) {
        el.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
    }
}

// ---- FIREBASE ERROR MESSAGES ----
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Google Sign-In is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups.',
        'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
        'auth/unauthorized-domain': 'This domain is not authorized for Google Sign-In. Add it in Firebase Console → Authentication → Settings → Authorized domains.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/internal-error': 'An internal error occurred. Please check your Firebase configuration.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
    };

    return messages[errorCode] || `An unexpected error occurred (${errorCode}). Please try again.`;
}

// ---- THEME TOGGLE ----
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('spt-theme', next);
    updateThemeIcon(next);
}

function loadTheme() {
    const saved = localStorage.getItem('spt-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    const icons = document.querySelectorAll('.theme-toggle-icon');
    icons.forEach(icon => {
        icon.className = theme === 'dark'
            ? 'fas fa-sun theme-toggle-icon'
            : 'fas fa-moon theme-toggle-icon';
    });
}

// Load theme on every page
loadTheme();
