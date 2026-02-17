// ============================================
// Insights Module - Smart performance analysis
// ============================================

// Detect weak subjects (avgScore < 50)
function detectWeakSubjects(subjects) {
    return subjects.filter(s => s.avgScore > 0 && s.avgScore < 50);
}

// Detect if performance trend is decreasing
function detectDecreasingTrend(allTopics) {
    const scored = allTopics
        .filter(t => t.score !== null && t.score !== undefined && t.createdAt)
        .sort((a, b) => {
            const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dA - dB;
        });

    if (scored.length < 3) return { decreasing: false, message: '' };

    const last3 = scored.slice(-3).map(t => t.score);
    const isDecreasing = last3[0] > last3[1] && last3[1] > last3[2];
    const avgRecent = Math.round(last3.reduce((a, b) => a + b, 0) / 3);

    return {
        decreasing: isDecreasing,
        recentScores: last3,
        avgRecent,
        message: isDecreasing
            ? `Your last 3 scores (${last3.join(', ')}) show a declining trend.`
            : ''
    };
}

// Get subjects with >70% pending topics
function getHighPendingSubjects(subjects) {
    return subjects.filter(s => {
        if (s.totalTopics === 0) return false;
        const pendingPct = ((s.totalTopics - s.completedTopics) / s.totalTopics) * 100;
        return pendingPct > 70;
    });
}

// Get improvement suggestions
function getImprovementSuggestions(subjects, allTopics) {
    const suggestions = [];
    const weak = detectWeakSubjects(subjects);
    const highPending = getHighPendingSubjects(subjects);
    const trend = detectDecreasingTrend(allTopics);

    if (weak.length > 0) {
        suggestions.push({
            icon: 'fas fa-book-reader',
            text: `Focus more on ${weak.map(s => s.name).join(', ')} — scores are below 50%.`,
            type: 'warning'
        });
    }
    if (highPending.length > 0) {
        suggestions.push({
            icon: 'fas fa-tasks',
            text: `${highPending.map(s => s.name).join(', ')} ${highPending.length > 1 ? 'have' : 'has'} over 70% pending topics.`,
            type: 'warning'
        });
    }
    if (trend.decreasing) {
        suggestions.push({
            icon: 'fas fa-chart-line',
            text: trend.message + ' Consider revising recent topics.',
            type: 'danger'
        });
    }

    const allScores = allTopics.filter(t => t.score != null).map(t => t.score);
    if (allScores.length > 0) {
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        if (avg >= 80) {
            suggestions.push({
                icon: 'fas fa-star',
                text: 'Excellent work! Your average score is above 80%. Keep it up!',
                type: 'success'
            });
        }
    }

    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fas fa-check-circle',
            text: 'You\'re on track! Keep adding topics and recording scores.',
            type: 'info'
        });
    }

    return suggestions;
}

// Predict performance based on last 3 test scores
function predictPerformance(allTopics) {
    const scored = allTopics
        .filter(t => t.score !== null && t.score !== undefined && t.createdAt)
        .sort((a, b) => {
            const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dA - dB;
        });

    if (scored.length < 3) return null;

    const last3 = scored.slice(-3).map(t => t.score);
    // Simple linear extrapolation
    const avg = last3.reduce((a, b) => a + b, 0) / 3;
    const trend = (last3[2] - last3[0]) / 2;
    const predicted = Math.max(0, Math.min(100, Math.round(avg + trend)));

    return {
        predicted,
        trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
        last3,
        avg: Math.round(avg)
    };
}

// Render insights widget
function renderInsightsWidget(containerId, subjects, allTopics) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const suggestions = getImprovementSuggestions(subjects, allTopics);
    const prediction = predictPerformance(allTopics);

    let predictionHTML = '';
    if (prediction) {
        const trendIcon = prediction.trend === 'up' ? 'fa-arrow-up text-success'
            : prediction.trend === 'down' ? 'fa-arrow-down text-danger'
                : 'fa-minus text-muted';
        predictionHTML = `
            <div class="prediction-card">
                <div class="prediction-label">Predicted Next Score</div>
                <div class="prediction-value">
                    <span class="prediction-number">${prediction.predicted}</span>
                    <i class="fas ${trendIcon}"></i>
                </div>
                <div class="prediction-meta">Based on last 3 scores: ${prediction.last3.join(', ')}</div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="widget-card insights-widget">
            <div class="widget-header">
                <div class="widget-icon insights-icon"><i class="fas fa-lightbulb"></i></div>
                <h3>Smart Insights</h3>
            </div>
            <div class="insights-body">
                ${predictionHTML}
                <div class="suggestions-list">
                    ${suggestions.map(s => `
                        <div class="suggestion-item ${s.type}">
                            <i class="${s.icon}"></i>
                            <span>${s.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}
