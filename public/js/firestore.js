// ============================================
// Firestore Module - CRUD operations
// ============================================

// ---- SUBJECTS ----

// Add a new subject
async function addSubject(name, description = '') {
    const user = getCurrentUser();
    if (!user) return;

    const subjectRef = await db.collection('users').doc(user.uid)
        .collection('subjects').add({
            name: name,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    return subjectRef.id;
}

// Get all subjects for current user
function getSubjects(callback) {
    const user = getCurrentUser();
    if (!user) return;

    return db.collection('users').doc(user.uid)
        .collection('subjects')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const subjects = [];
            snapshot.forEach((doc) => {
                subjects.push({ id: doc.id, ...doc.data() });
            });
            callback(subjects);
        });
}

// Get a single subject
async function getSubject(subjectId) {
    const user = getCurrentUser();
    if (!user) return null;

    const doc = await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId).get();

    if (doc.exists) {
        return { id: doc.id, ...doc.data() };
    }
    return null;
}

// Update a subject
async function updateSubject(subjectId, data) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
}

// Delete a subject and all its topics
async function deleteSubject(subjectId) {
    const user = getCurrentUser();
    if (!user) return;

    // Delete all topics first
    const topicsSnapshot = await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').get();

    const batch = db.batch();
    topicsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete the subject
    batch.delete(
        db.collection('users').doc(user.uid)
            .collection('subjects').doc(subjectId)
    );

    await batch.commit();
}


// ---- TOPICS ----

// Add a new topic
async function addTopic(subjectId, name, score = null, unit = 1, notesContent = '', notesUrl = '') {
    const user = getCurrentUser();
    if (!user) return;

    // Get current count for topicOrder
    const existingSnap = await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics')
        .where('unit', '==', parseInt(unit) || 1)
        .get();

    const topicRef = await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').add({
            name: name,
            completed: false,
            score: score,
            unit: parseInt(unit) || 1,
            topicOrder: existingSnap.size + 1,
            notesContent: notesContent,
            notesUrl: notesUrl,
            completedAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    return topicRef.id;
}

// Get all topics for a subject (real-time)
function getTopics(subjectId, callback) {
    const user = getCurrentUser();
    if (!user) return;

    return db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics')
        .orderBy('createdAt', 'asc')
        .onSnapshot((snapshot) => {
            const topics = [];
            snapshot.forEach((doc) => {
                topics.push({ id: doc.id, ...doc.data() });
            });
            callback(topics);
        });
}

// Toggle topic completion
async function toggleTopic(subjectId, topicId, completed) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').doc(topicId).update({
            completed: completed,
            completedAt: completed ? firebase.firestore.FieldValue.serverTimestamp() : null
        });
}

// Update topic
async function updateTopic(subjectId, topicId, data) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').doc(topicId).update(data);
}

// Delete a topic
async function deleteTopic(subjectId, topicId) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').doc(topicId).delete();
}

// ---- UNIT NOTES ----

// Get notes for a specific unit
async function getUnitNotes(subjectId, unitNumber) {
    const user = getCurrentUser();
    if (!user) return '';

    try {
        const doc = await db.collection('users').doc(user.uid)
            .collection('subjects').doc(subjectId)
            .collection('unitNotes').doc(`unit_${unitNumber}`).get();
        return doc.exists ? (doc.data().content || '') : '';
    } catch (err) {
        console.error('Error fetching unit notes:', err);
        return '';
    }
}

// Save notes for a specific unit
async function saveUnitNotes(subjectId, unitNumber, content) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('unitNotes').doc(`unit_${unitNumber}`).set({
            content: content,
            unitNumber: parseInt(unitNumber),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
}

// ---- PER-TOPIC NOTES ----

// Save notes for a specific topic
async function saveTopicNotes(subjectId, topicId, content, url = '') {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').doc(topicId).update({
            notesContent: content || '',
            notesUrl: url || ''
        });
}

// Get notes for a specific topic (checks completion)
async function getTopicNotes(subjectId, topicId) {
    const user = getCurrentUser();
    if (!user) return { locked: true };

    const doc = await db.collection('users').doc(user.uid)
        .collection('subjects').doc(subjectId)
        .collection('topics').doc(topicId).get();

    if (!doc.exists) return { locked: true };

    const data = doc.data();
    if (!data.completed) {
        return { locked: true, message: 'Complete this topic to unlock notes' };
    }

    return {
        locked: false,
        notesContent: data.notesContent || '',
        notesUrl: data.notesUrl || ''
    };
}


// ---- PROGRESS HISTORY ----

// Log a progress event
async function addProgressEntry(entry) {
    const user = getCurrentUser();
    if (!user) return;

    await db.collection('users').doc(user.uid)
        .collection('progressHistory').add({
            ...entry,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
}

// Get recent progress history
async function getProgressHistory(limit = 20) {
    const user = getCurrentUser();
    if (!user) return [];

    const snap = await db.collection('users').doc(user.uid)
        .collection('progressHistory')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

    const entries = [];
    snap.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
    return entries;
}


// ---- BADGES & GAMIFICATION ----

// Award a badge to the user
async function awardBadge(badgeName, details = {}) {
    const user = getCurrentUser();
    if (!user) return;

    const badgeId = badgeName.toLowerCase().replace(/\s+/g, '_');

    // Don't award duplicate badges (unless they can be earned multiple times)
    const existing = await db.collection('users').doc(user.uid)
        .collection('badges').doc(badgeId).get();

    if (existing.exists && !details.allowDuplicate) return false;

    await db.collection('users').doc(user.uid)
        .collection('badges').doc(badgeId).set({
            name: badgeName,
            icon: details.icon || '🏅',
            description: details.description || '',
            earnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            subjectId: details.subjectId || null,
            unitNumber: details.unitNumber || null,
            count: existing.exists ? ((existing.data().count || 1) + 1) : 1
        }, { merge: true });

    return true;
}

// Get all earned badges
async function getEarnedBadges() {
    const user = getCurrentUser();
    if (!user) return [];

    const snap = await db.collection('users').doc(user.uid)
        .collection('badges')
        .orderBy('earnedAt', 'desc')
        .get();

    const badges = [];
    snap.forEach(doc => badges.push({ id: doc.id, ...doc.data() }));
    return badges;
}


// ---- ANALYTICS HELPERS ----

// Get all user data for analytics
async function getAllUserData() {
    const user = getCurrentUser();
    if (!user) return { subjects: [], allTopics: [] };

    const subjectsSnap = await db.collection('users').doc(user.uid)
        .collection('subjects').get();

    const subjects = [];
    const allTopics = [];

    for (const subjectDoc of subjectsSnap.docs) {
        const subject = { id: subjectDoc.id, ...subjectDoc.data() };

        const topicsSnap = await db.collection('users').doc(user.uid)
            .collection('subjects').doc(subjectDoc.id)
            .collection('topics').get();

        const topics = [];
        topicsSnap.forEach((topicDoc) => {
            const topic = { id: topicDoc.id, subjectId: subjectDoc.id, subjectName: subject.name, ...topicDoc.data() };
            topics.push(topic);
            allTopics.push(topic);
        });

        subject.topics = topics;
        subject.totalTopics = topics.length;
        subject.completedTopics = topics.filter(t => t.completed).length;
        subject.completionPercent = subject.totalTopics > 0
            ? Math.round((subject.completedTopics / subject.totalTopics) * 100)
            : 0;

        const scores = topics.filter(t => t.score !== null && t.score !== undefined).map(t => t.score);
        subject.avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        subjects.push(subject);
    }

    return { subjects, allTopics };
}

// Get dashboard statistics
async function getDashboardStats() {
    const { subjects, allTopics } = await getAllUserData();

    const totalSubjects = subjects.length;
    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter(t => t.completed).length;
    const completionPercent = totalTopics > 0
        ? Math.round((completedTopics / totalTopics) * 100)
        : 0;

    const scores = allTopics.filter(t => t.score !== null && t.score !== undefined).map(t => t.score);
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return {
        totalSubjects,
        totalTopics,
        completedTopics,
        completionPercent,
        avgScore,
        subjects,
        allTopics
    };
}
