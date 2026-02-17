// ============================================
// Notifications Module - In-app alerts system
// ============================================

// Generate notifications based on current data
function generateNotifications(stats, goals, streakData) {
    const notifications = [];

    // Check for missed goals (expired without completion)
    if (goals && goals.length > 0) {
        goals.forEach(goal => {
            if (goal.deadline) {
                const deadline = new Date(goal.deadline + 'T23:59:59');
                const pct = getGoalCompletionPercent(goal);
                if (deadline < new Date() && pct < 100) {
                    notifications.push({
                        type: 'danger',
                        icon: 'fas fa-exclamation-circle',
                        title: 'Missed Goal',
                        message: `"${goal.title}" expired with only ${pct}% completion.`,
                        priority: 1
                    });
                } else if (deadline < new Date(Date.now() + 86400000) && pct < 50) {
                    notifications.push({
                        type: 'warning',
                        icon: 'fas fa-clock',
                        title: 'Goal Deadline Tomorrow',
                        message: `"${goal.title}" is due soon and only ${pct}% complete.`,
                        priority: 2
                    });
                }
            }
        });
    }

    // Low average score alert
    if (stats && stats.avgScore > 0 && stats.avgScore < 50) {
        notifications.push({
            type: 'warning',
            icon: 'fas fa-chart-line',
            title: 'Low Average Score',
            message: `Your overall average is ${stats.avgScore}%. Consider revisiting weak topics.`,
            priority: 2
        });
    }

    // Subjects with many pending topics
    if (stats && stats.subjects) {
        const highPending = stats.subjects.filter(s => {
            if (s.totalTopics === 0) return false;
            return ((s.totalTopics - s.completedTopics) / s.totalTopics) > 0.7;
        });
        if (highPending.length > 0) {
            notifications.push({
                type: 'info',
                icon: 'fas fa-tasks',
                title: 'Pending Topics',
                message: `${highPending.map(s => s.name).join(', ')} ${highPending.length > 1 ? 'have' : 'has'} over 70% topics pending.`,
                priority: 3
            });
        }
    }

    // Weekly summary
    if (stats) {
        notifications.push({
            type: 'info',
            icon: 'fas fa-clipboard-list',
            title: 'Weekly Summary',
            message: `${stats.totalSubjects} subjects, ${stats.completedTopics}/${stats.totalTopics} topics done (${stats.completionPercent}%).`,
            priority: 4
        });
    }

    // Streak notification
    if (streakData && streakData.currentStreak >= 7) {
        notifications.push({
            type: 'success',
            icon: 'fas fa-fire',
            title: 'Streak Achievement!',
            message: `You're on a ${streakData.currentStreak}-day study streak! Amazing!`,
            priority: 5
        });
    }

    return notifications.sort((a, b) => a.priority - b.priority);
}

// Render notification panel
function renderNotificationPanel(containerId, notifications) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="widget-card notifications-widget">
                <div class="widget-header">
                    <div class="widget-icon notif-icon"><i class="fas fa-bell"></i></div>
                    <h3>Notifications</h3>
                </div>
                <p class="widget-empty">All clear! No notifications.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="widget-card notifications-widget">
            <div class="widget-header">
                <div class="widget-icon notif-icon"><i class="fas fa-bell"></i></div>
                <h3>Notifications</h3>
                <span class="notif-count">${notifications.length}</span>
            </div>
            <div class="notif-list">
                ${notifications.map((n, i) => `
                    <div class="notif-item ${n.type}" id="notif-${i}">
                        <i class="${n.icon}"></i>
                        <div class="notif-content">
                            <strong>${n.title}</strong>
                            <p>${n.message}</p>
                        </div>
                        <button class="notif-dismiss" onclick="document.getElementById('notif-${i}').remove()" title="Dismiss">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
