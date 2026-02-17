// ============================================
// Streaks Module - Daily login streak tracking
// ============================================

// Update streak on login
async function updateStreak() {
    const user = getCurrentUser();
    if (!user) return;

    const streakRef = db.collection('users').doc(user.uid).collection('streaks').doc('current');
    const doc = await streakRef.get();
    const today = new Date().toISOString().split('T')[0];

    if (doc.exists) {
        const data = doc.data();
        const lastLogin = data.lastLoginDate || '';

        if (lastLogin === today) {
            return data; // Already logged in today
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastLogin === yesterdayStr) {
            newStreak = (data.currentStreak || 0) + 1;
        }

        const longestStreak = Math.max(newStreak, data.longestStreak || 0);

        const updateData = {
            currentStreak: newStreak,
            longestStreak: longestStreak,
            lastLoginDate: today,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await streakRef.update(updateData);
        return { ...data, ...updateData };
    } else {
        const newData = {
            currentStreak: 1,
            longestStreak: 1,
            lastLoginDate: today,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await streakRef.set(newData);
        return newData;
    }
}

// Get streak data
async function getStreakData() {
    const user = getCurrentUser();
    if (!user) return { currentStreak: 0, longestStreak: 0, lastLoginDate: null };

    const doc = await db.collection('users').doc(user.uid).collection('streaks').doc('current').get();
    if (doc.exists) {
        return doc.data();
    }
    return { currentStreak: 0, longestStreak: 0, lastLoginDate: null };
}

// Get earned badges
function getStreakBadges(currentStreak) {
    const badges = [];
    if (currentStreak >= 7) badges.push({ name: '7-Day Streak', icon: '🔥', tier: 'bronze' });
    if (currentStreak >= 30) badges.push({ name: '30-Day Streak', icon: '⚡', tier: 'silver' });
    if (currentStreak >= 60) badges.push({ name: '60-Day Streak', icon: '💎', tier: 'gold' });
    if (currentStreak >= 100) badges.push({ name: '100-Day Streak', icon: '🏆', tier: 'platinum' });
    return badges;
}

// Render streak widget
function renderStreakWidget(containerId, streakData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const badges = getStreakBadges(streakData.currentStreak || 0);
    const badgeHTML = badges.length > 0
        ? badges.map(b => `<span class="streak-badge ${b.tier}" title="${b.name}">${b.icon}</span>`).join('')
        : '<span class="streak-no-badge">Keep going to earn badges!</span>';

    container.innerHTML = `
        <div class="widget-card streak-widget">
            <div class="widget-header">
                <div class="widget-icon streak-icon"><i class="fas fa-fire"></i></div>
                <h3>Study Streak</h3>
            </div>
            <div class="streak-body">
                <div class="streak-counter">
                    <span class="streak-number">${streakData.currentStreak || 0}</span>
                    <span class="streak-label">day${(streakData.currentStreak || 0) !== 1 ? 's' : ''}</span>
                </div>
                <div class="streak-meta">
                    <span><i class="fas fa-trophy"></i> Best: ${streakData.longestStreak || 0} days</span>
                </div>
                <div class="streak-badges">${badgeHTML}</div>
            </div>
        </div>
    `;
}
