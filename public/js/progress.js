// ============================================
// Progress & Gamification Module
// ============================================

// Badge definitions
const BADGE_DEFINITIONS = {
    first_steps: {
        name: 'First Steps',
        icon: '🎯',
        description: 'Complete your first topic ever',
        condition: 'first_topic'
    },
    unit_champion: {
        name: 'Unit Champion',
        icon: '🏅',
        description: 'Complete all topics in a unit',
        condition: 'unit_complete',
        allowDuplicate: true
    },
    subject_master: {
        name: 'Subject Master',
        icon: '⭐',
        description: 'Complete all topics in a subject',
        condition: 'subject_complete'
    },
    streak_warrior: {
        name: 'Streak Warrior',
        icon: '🔥',
        description: 'Complete 5+ topics in one day',
        condition: 'daily_streak'
    },
    half_way: {
        name: 'Half Way There',
        icon: '🚀',
        description: 'Reach 50% completion on any subject',
        condition: 'half_complete'
    },
    note_taker: {
        name: 'Note Taker',
        icon: '📝',
        description: 'Write notes for 10 completed topics',
        condition: 'notes_count'
    }
};

// Check and award badges after topic completion
async function checkAndAwardBadges(subjectId, subjectName, unitNumber, allTopics) {
    const awarded = [];

    // --- First Steps: first-ever topic completed ---
    const completedTopics = allTopics.filter(t => t.completed);
    if (completedTopics.length === 1) {
        const result = await awardBadge('First Steps', {
            icon: '🎯',
            description: BADGE_DEFINITIONS.first_steps.description,
            subjectId
        });
        if (result) awarded.push(BADGE_DEFINITIONS.first_steps);
    }

    // --- Unit Champion: all topics in one unit completed ---
    const unitTopics = allTopics.filter(t => (t.unit || 1) === parseInt(unitNumber));
    const unitCompleted = unitTopics.filter(t => t.completed);
    if (unitTopics.length > 0 && unitCompleted.length === unitTopics.length) {
        const result = await awardBadge('Unit Champion', {
            icon: '🏅',
            description: `Completed all topics in Unit ${unitNumber} of ${subjectName}`,
            subjectId,
            unitNumber: parseInt(unitNumber),
            allowDuplicate: true
        });
        if (result) awarded.push({ ...BADGE_DEFINITIONS.unit_champion, unitNumber });
    }

    // --- Subject Master: all topics in subject completed ---
    const allCompleted = allTopics.filter(t => t.completed);
    if (allTopics.length > 0 && allCompleted.length === allTopics.length) {
        const result = await awardBadge('Subject Master', {
            icon: '⭐',
            description: `Mastered all topics in ${subjectName}`,
            subjectId
        });
        if (result) awarded.push(BADGE_DEFINITIONS.subject_master);
    }

    // --- Half Way There: 50% of subject completed ---
    if (allTopics.length > 0) {
        const halfPercent = Math.round((allCompleted.length / allTopics.length) * 100);
        if (halfPercent >= 50 && halfPercent < 100) {
            const result = await awardBadge('Half Way There', {
                icon: '🚀',
                description: `Reached ${halfPercent}% in ${subjectName}`,
                subjectId
            });
            if (result) awarded.push(BADGE_DEFINITIONS.half_way);
        }
    }

    // --- Streak Warrior: 5+ completions today ---
    try {
        const history = await getProgressHistory(50);
        const today = new Date().toDateString();
        const todayCount = history.filter(e => {
            if (!e.timestamp) return false;
            const d = e.timestamp.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
            return d.toDateString() === today && e.type === 'topic_completed';
        }).length;
        if (todayCount >= 5) {
            const result = await awardBadge('Streak Warrior', {
                icon: '🔥',
                description: BADGE_DEFINITIONS.streak_warrior.description
            });
            if (result) awarded.push(BADGE_DEFINITIONS.streak_warrior);
        }
    } catch (e) {
        console.log('Streak check skipped:', e.message);
    }

    return awarded;
}

// Log topic completion and check badges  
async function logTopicCompletion(subjectId, subjectName, topicName, unitNumber, allTopics) {
    // Log progress entry
    await addProgressEntry({
        type: 'topic_completed',
        subjectId,
        subjectName,
        topicName,
        unitNumber: parseInt(unitNumber)
    });

    // Check for unit completion
    const unitTopics = allTopics.filter(t => (t.unit || 1) === parseInt(unitNumber));
    const unitCompleted = unitTopics.filter(t => t.completed);
    if (unitTopics.length > 0 && unitCompleted.length === unitTopics.length) {
        await addProgressEntry({
            type: 'unit_completed',
            subjectId,
            subjectName,
            unitNumber: parseInt(unitNumber)
        });
    }

    // Check and award badges
    const newBadges = await checkAndAwardBadges(subjectId, subjectName, unitNumber, allTopics);
    return newBadges;
}

// Render badges showcase 
function renderBadgesShowcase(containerId, badges) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!badges || badges.length === 0) {
        container.innerHTML = `
            <div class="widget-card animate-in">
                <div class="widget-header">
                    <h3><i class="fas fa-trophy" style="color: var(--warning);margin-right:0.5rem;"></i>Badges</h3>
                </div>
                <div class="empty-state" style="padding: var(--space-lg);">
                    <div class="empty-state-icon" style="font-size:2rem;">🏅</div>
                    <p style="color:var(--gray-400);font-size:0.85rem;">Complete topics to earn badges!</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="widget-card animate-in">
            <div class="widget-header">
                <h3><i class="fas fa-trophy" style="color: var(--warning);margin-right:0.5rem;"></i>Badges Earned</h3>
                <span class="badge badge-primary">${badges.length}</span>
            </div>
            <div class="badge-showcase">
                ${badges.map(b => `
                    <div class="badge-showcase-item" title="${b.description || b.name}">
                        <div class="badge-showcase-icon">${b.icon || '🏅'}</div>
                        <div class="badge-showcase-info">
                            <span class="badge-showcase-name">${b.name}</span>
                            <span class="badge-showcase-desc">${b.description || ''}</span>
                        </div>
                        ${b.count > 1 ? `<span class="badge badge-warning" style="font-size:0.65rem;">×${b.count}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render progress timeline
function renderProgressTimeline(containerId, entries) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!entries || entries.length === 0) {
        container.innerHTML = `
            <div class="widget-card animate-in">
                <div class="widget-header">
                    <h3><i class="fas fa-history" style="color: var(--primary-500);margin-right:0.5rem;"></i>Recent Activity</h3>
                </div>
                <div class="empty-state" style="padding: var(--space-lg);">
                    <p style="color:var(--gray-400);font-size:0.85rem;">No activity yet. Start completing topics!</p>
                </div>
            </div>
        `;
        return;
    }

    const typeIcons = {
        'topic_completed': '✅',
        'unit_completed': '🎉',
        'badge_earned': '🏅'
    };

    container.innerHTML = `
        <div class="widget-card animate-in">
            <div class="widget-header">
                <h3><i class="fas fa-history" style="color: var(--primary-500);margin-right:0.5rem;"></i>Recent Activity</h3>
            </div>
            <div class="progress-timeline">
                ${entries.slice(0, 10).map(entry => {
        const icon = typeIcons[entry.type] || '📌';
        const time = entry.timestamp
            ? (entry.timestamp.toDate ? formatTimeAgo(entry.timestamp.toDate()) : formatTimeAgo(new Date(entry.timestamp)))
            : '';
        let text = '';
        if (entry.type === 'topic_completed') {
            text = `Completed <strong>${entry.topicName || 'topic'}</strong> in ${entry.subjectName || 'subject'}`;
        } else if (entry.type === 'unit_completed') {
            text = `Finished <strong>Unit ${entry.unitNumber}</strong> in ${entry.subjectName || 'subject'} 🎉`;
        } else if (entry.type === 'badge_earned') {
            text = `Earned badge: <strong>${entry.badgeName || 'badge'}</strong>`;
        } else {
            text = entry.description || 'Activity';
        }
        return `
                        <div class="timeline-item">
                            <div class="timeline-icon">${icon}</div>
                            <div class="timeline-content">
                                <p>${text}</p>
                                <span class="timeline-time">${time}</span>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

// Format time ago helper
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}
