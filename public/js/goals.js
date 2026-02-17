// ============================================
// Goals Module - Weekly study goals & deadlines
// ============================================

// Add a new goal
async function addGoal(title, targetCount, deadline) {
    const user = getCurrentUser();
    if (!user) return;

    const ref = await db.collection('users').doc(user.uid).collection('goals').add({
        title: title,
        targetCount: parseInt(targetCount),
        completedCount: 0,
        deadline: deadline, // ISO date string
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
}

// Get all goals (real-time)
function getGoals(callback) {
    const user = getCurrentUser();
    if (!user) return;

    return db.collection('users').doc(user.uid).collection('goals')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const goals = [];
            snapshot.forEach((doc) => {
                goals.push({ id: doc.id, ...doc.data() });
            });
            callback(goals);
        });
}

// Get all goals once
async function getGoalsOnce() {
    const user = getCurrentUser();
    if (!user) return [];

    const snap = await db.collection('users').doc(user.uid).collection('goals').orderBy('createdAt', 'desc').get();
    const goals = [];
    snap.forEach(doc => goals.push({ id: doc.id, ...doc.data() }));
    return goals;
}

// Update goal progress
async function updateGoalProgress(goalId, completedCount) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid).collection('goals').doc(goalId).update({
        completedCount: parseInt(completedCount)
    });
}

// Delete a goal
async function deleteGoal(goalId) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid).collection('goals').doc(goalId).delete();
}

// Get goal completion percentage
function getGoalCompletionPercent(goal) {
    if (!goal.targetCount || goal.targetCount === 0) return 0;
    return Math.min(100, Math.round((goal.completedCount / goal.targetCount) * 100));
}

// Get countdown string
function getCountdownString(deadline) {
    if (!deadline) return 'No deadline';
    const now = new Date();
    const end = new Date(deadline + 'T23:59:59');
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Less than 1h';
}

// Render goals widget (mini version for dashboard)
function renderGoalsWidget(containerId, goals) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

    const goalsHTML = activeGoals.length > 0
        ? activeGoals.map(goal => {
            const pct = getGoalCompletionPercent(goal);
            const countdown = getCountdownString(goal.deadline);
            const isExpired = countdown === 'Expired';
            return `
                <div class="goal-mini-card ${isExpired ? 'expired' : ''}">
                    <div class="goal-mini-header">
                        <span class="goal-mini-title">${goal.title}</span>
                        <span class="goal-mini-countdown ${isExpired ? 'text-danger' : ''}">${countdown}</span>
                    </div>
                    <div class="progress-bar-wrapper" style="height:6px;">
                        <div class="progress-bar-fill ${pct >= 100 ? 'complete' : ''}" style="width:${pct}%"></div>
                    </div>
                    <div class="goal-mini-footer">
                        <span>${goal.completedCount}/${goal.targetCount} topics</span>
                        <span class="goal-pct">${pct}%</span>
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="widget-empty">No active goals. <a href="/goals">Set one now!</a></p>';

    container.innerHTML = `
        <div class="widget-card goals-widget">
            <div class="widget-header">
                <div class="widget-icon goals-icon"><i class="fas fa-bullseye"></i></div>
                <h3>Study Goals</h3>
                <a href="/goals" class="widget-action">View All</a>
            </div>
            <div class="goals-body">${goalsHTML}</div>
        </div>
    `;
}
