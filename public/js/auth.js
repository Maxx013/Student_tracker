// ============================================
// Auth Module - Handles all authentication logic
// ============================================

// Check if user is authenticated (used on protected pages)
function requireAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = '/login';
                reject('Not authenticated');
            }
        });
    });
}

// Check if user is already logged in (used on auth pages to redirect)
function redirectIfAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = '/dashboard';
        }
    });
}

// Register new user
async function registerUser(name, email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update display name
        await user.updateProfile({ displayName: name });

        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Account created successfully!', 'success');
        if (typeof updateStreak === 'function') await updateStreak();
        window.location.href = '/dashboard';
    } catch (error) {
        throw error;
    }
}

// Login user
async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Welcome back!', 'success');
        if (typeof updateStreak === 'function') await updateStreak();
        window.location.href = '/dashboard';
    } catch (error) {
        throw error;
    }
}

// Google Sign In
async function googleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Check if user doc exists, if not create one
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (typeof updateStreak === 'function') await updateStreak();
        window.location.href = '/dashboard';
    } catch (error) {
        throw error;
    }
}

// Forgot Password
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        throw error;
    }
}

// Logout
function logoutUser() {
    // Remove existing modal if any
    const existing = document.getElementById('logoutConfirmModal');
    if (existing) existing.remove();

    // Create modal HTML
    const modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
    modal.innerHTML = `
        <div class="logout-modal-overlay" id="logoutOverlay">
            <div class="logout-modal-box">
                <div class="logout-modal-icon">
                    <i class="fas fa-sign-out-alt"></i>
                </div>
                <h3 class="logout-modal-title">Logout Confirmation</h3>
                <p class="logout-modal-text">Are you sure you want to logout? You will need to sign in again to access your dashboard.</p>
                <div class="logout-modal-actions">
                    <button class="btn logout-modal-btn-cancel" id="logoutCancelBtn">Cancel</button>
                    <button class="btn logout-modal-btn-confirm" id="logoutConfirmBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Trigger animation
    requestAnimationFrame(() => {
        document.getElementById('logoutOverlay').classList.add('active');
    });

    // Cancel button
    document.getElementById('logoutCancelBtn').addEventListener('click', () => {
        closeLogoutModal();
    });

    // Confirm button
    document.getElementById('logoutConfirmBtn').addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            showToast('Error signing out', 'error');
            closeLogoutModal();
        }
    });

    // Close on overlay click
    document.getElementById('logoutOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('logoutOverlay')) {
            closeLogoutModal();
        }
    });

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeLogoutModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function closeLogoutModal() {
    const overlay = document.getElementById('logoutOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            const modal = document.getElementById('logoutConfirmModal');
            if (modal) modal.remove();
        }, 300);
    }
}

// Get current user info
function getCurrentUser() {
    return auth.currentUser;
}

// Get user display name
function getUserDisplayName() {
    const user = auth.currentUser;
    return user ? (user.displayName || user.email.split('@')[0]) : 'User';
}

// Get user initials
function getUserInitials() {
    const name = getUserDisplayName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}
