// ============================================
// Topic Generator Module
// Template checking, auto-generation, PDF upload, AI extraction
// ============================================

// ---- Predefined Subject Templates ----
const SUBJECT_TEMPLATES = {
    'computer networks': ['OSI Model', 'TCP/IP Protocol Suite', 'Routing Algorithms', 'Subnetting & Supernetting', 'Data Link Layer', 'Network Security', 'DNS & DHCP', 'HTTP & HTTPS', 'Socket Programming', 'Wireless Networks'],
    'data structures': ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees & Binary Trees', 'Binary Search Trees', 'AVL Trees', 'Graphs', 'Hashing', 'Sorting Algorithms', 'Searching Algorithms', 'Heaps & Priority Queues'],
    'operating systems': ['Process Management', 'CPU Scheduling', 'Threads & Concurrency', 'Process Synchronization', 'Deadlocks', 'Memory Management', 'Virtual Memory', 'File Systems', 'I/O Systems', 'Disk Scheduling'],
    'database management system': ['ER Model', 'Relational Model', 'SQL Basics', 'Normalization', 'Transactions & Concurrency', 'Indexing', 'Query Optimization', 'NoSQL Databases', 'Database Security', 'Stored Procedures & Triggers'],
    'dbms': ['ER Model', 'Relational Model', 'SQL Basics', 'Normalization', 'Transactions & Concurrency', 'Indexing', 'Query Optimization', 'NoSQL Databases', 'Database Security', 'Stored Procedures & Triggers'],
    'web technology': ['HTML5 & Semantics', 'CSS3 & Flexbox/Grid', 'JavaScript Fundamentals', 'DOM Manipulation', 'AJAX & Fetch API', 'Node.js & Express', 'React/Angular Basics', 'REST APIs', 'Authentication & JWT', 'Deployment & Hosting'],
    'web technologies': ['HTML5 & Semantics', 'CSS3 & Flexbox/Grid', 'JavaScript Fundamentals', 'DOM Manipulation', 'AJAX & Fetch API', 'Node.js & Express', 'React/Angular Basics', 'REST APIs', 'Authentication & JWT', 'Deployment & Hosting'],
    'java programming': ['OOP Concepts', 'Classes & Objects', 'Inheritance', 'Polymorphism', 'Abstraction & Interfaces', 'Exception Handling', 'Collections Framework', 'Multithreading', 'File I/O', 'JDBC'],
    'python programming': ['Python Basics', 'Data Types & Variables', 'Control Flow', 'Functions & Modules', 'OOP in Python', 'File Handling', 'Exception Handling', 'Libraries: NumPy & Pandas', 'Regular Expressions', 'Web Scraping'],
    'software engineering': ['SDLC Models', 'Requirements Engineering', 'System Design', 'UML Diagrams', 'Software Testing', 'Agile Methodology', 'Project Management', 'Configuration Management', 'Software Metrics', 'Quality Assurance'],
    'mathematics': ['Sets & Logic', 'Relations & Functions', 'Permutations & Combinations', 'Probability', 'Matrices & Determinants', 'Calculus', 'Linear Algebra', 'Graph Theory', 'Boolean Algebra', 'Statistics'],
    'discrete mathematics': ['Propositional Logic', 'Predicate Logic', 'Sets & Relations', 'Functions', 'Graph Theory', 'Trees', 'Counting Techniques', 'Recurrence Relations', 'Boolean Algebra', 'Lattices & Groups'],
    'artificial intelligence': ['Introduction to AI', 'Search Algorithms', 'Knowledge Representation', 'Expert Systems', 'Machine Learning Basics', 'Neural Networks', 'Natural Language Processing', 'Genetic Algorithms', 'Fuzzy Logic', 'AI Ethics'],
    'computer organization': ['Number Systems', 'Boolean Algebra & Logic Gates', 'Combinational Circuits', 'Sequential Circuits', 'Memory Organization', 'CPU Architecture', 'Instruction Set Architecture', 'Pipelining', 'I/O Organization', 'Parallel Processing'],
    'cloud computing': ['Cloud Concepts', 'Cloud Service Models (IaaS, PaaS, SaaS)', 'Virtualization', 'AWS/Azure/GCP Basics', 'Cloud Storage', 'Cloud Security', 'Containerization & Docker', 'Serverless Computing', 'Cloud Deployment', 'DevOps Basics']
};

// Also seed Firestore templates (runs once per user session)
let templatesSeeded = false;

async function seedFirestoreTemplates() {
    if (templatesSeeded) return;
    templatesSeeded = true;

    try {
        // Check if templates exist
        const snap = await db.collection('subjectTemplates').limit(1).get();
        if (!snap.empty) return; // Already seeded

        const batch = db.batch();
        for (const [key, topics] of Object.entries(SUBJECT_TEMPLATES)) {
            const docId = key.replace(/\s+/g, '_');
            const ref = db.collection('subjectTemplates').doc(docId);
            batch.set(ref, { name: key, topics: topics });
        }
        await batch.commit();
        console.log('✅ Subject templates seeded to Firestore');
    } catch (err) {
        console.log('Template seeding skipped:', err.message);
    }
}

// ---- Template Checking ----

function checkTemplateExists(subjectName) {
    const key = subjectName.toLowerCase().trim();
    return SUBJECT_TEMPLATES.hasOwnProperty(key);
}

function getTemplateTopics(subjectName) {
    const key = subjectName.toLowerCase().trim();
    return SUBJECT_TEMPLATES[key] || [];
}

// Also check Firestore for user-added or admin templates
async function checkFirestoreTemplate(subjectName) {
    const key = subjectName.toLowerCase().trim().replace(/\s+/g, '_');
    try {
        const doc = await db.collection('subjectTemplates').doc(key).get();
        if (doc.exists) {
            return doc.data().topics || [];
        }
    } catch (err) {
        console.log('Firestore template check failed:', err.message);
    }
    return null;
}

// ---- Auto Generate Topics ----

async function autoGenerateTopics(subjectId, topicNames, defaultUnit = 1) {
    const user = getCurrentUser();
    if (!user || !subjectId || !topicNames || topicNames.length === 0) return 0;

    const batch = db.batch();
    let count = 0;

    for (const item of topicNames) {
        const name = typeof item === 'string' ? item : item.name;
        const unit = typeof item === 'object' && item.unit ? item.unit : defaultUnit;
        if (!name || name.trim().length === 0) continue;
        const ref = db.collection('users').doc(user.uid)
            .collection('subjects').doc(subjectId)
            .collection('topics').doc();
        batch.set(ref, {
            name: name.trim(),
            completed: false,
            score: null,
            unit: parseInt(unit) || 1,
            completedAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        count++;
    }

    if (count > 0) {
        await batch.commit();
    }
    return count;
}

// ---- PDF Upload & Parsing ----

async function requestPDFParse(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'PDF parsing failed');
    }

    return await response.json();
}

// ---- AI Extraction ----

async function checkAIAvailable() {
    try {
        const res = await fetch('/api/ai-status');
        const data = await res.json();
        return data.available === true;
    } catch {
        return false;
    }
}

async function requestAIExtraction(rawText) {
    const response = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'AI extraction failed');
    }

    return await response.json();
}

// ---- Client-side text parsing fallback ----

function parseExtractedText(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 200);
    const topics = [];
    const seen = new Set();

    for (const line of lines) {
        const numberedMatch = line.match(/^(?:\d+[.)]\s*|[IVXLC]+[.)]\s*|[a-z][.)]\s*)(.*)/i);
        const bulletMatch = line.match(/^[•\-*►▪]\s*(.*)/);
        const unitMatch = line.match(/^(?:unit|chapter|module|topic|lesson|section)\s*[\d:.\-–]+\s*(.*)/i);

        let topicName = null;
        if (unitMatch && unitMatch[1]) topicName = unitMatch[1];
        else if (numberedMatch && numberedMatch[1]) topicName = numberedMatch[1];
        else if (bulletMatch && bulletMatch[1]) topicName = bulletMatch[1];

        if (topicName) {
            topicName = topicName.replace(/[:–\-]+$/, '').trim();
            const key = topicName.toLowerCase();
            if (key.length > 2 && !seen.has(key)) {
                seen.add(key);
                topics.push(topicName);
            }
        }
    }

    return topics.slice(0, 50);
}

// ---- Hybrid Logic ----
// Returns { source: 'template'|'pdf'|'ai'|'none', topics: string[] }

async function hybridTopicGeneration(subjectName) {
    // Step 1: Check local templates
    if (checkTemplateExists(subjectName)) {
        return { source: 'template', topics: getTemplateTopics(subjectName) };
    }

    // Step 2: Check Firestore templates
    const firestoreTopics = await checkFirestoreTemplate(subjectName);
    if (firestoreTopics && firestoreTopics.length > 0) {
        return { source: 'template', topics: firestoreTopics };
    }

    // Step 3: No template found — user needs to upload or skip
    return { source: 'none', topics: [] };
}

// ---- Render Topic Preview Modal ----

function renderTopicPreview(containerId, topics, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { source = 'template', subjectId = '', onSave = null, onCancel = null } = options;
    const sourceLabels = {
        'template': '📚 Predefined Template',
        'pdf': '📄 Extracted from PDF',
        'ai': '🤖 AI Generated',
        'manual': '✏️ Manually Added'
    };

    container.innerHTML = `
    <div class="topic-preview-header">
      <div>
        <h3>Topic Preview</h3>
        <span class="topic-preview-source badge badge-primary">${sourceLabels[source] || source}</span>
      </div>
      <span class="topic-preview-count">${topics.length} topics</span>
    </div>
    <p style="font-size:0.8125rem;color:var(--gray-500);margin-bottom:var(--space-md);">
      Review, edit, or remove topics before saving. Click a topic to edit it.
    </p>
    <div class="topic-preview-list" id="topic-preview-items">
      ${topics.map((t, i) => `
        <div class="topic-preview-item" data-index="${i}">
          <span class="topic-preview-number">${i + 1}</span>
          <input type="text" class="topic-preview-input" value="${escapeAttr(t)}" />
          <button class="topic-preview-remove" onclick="removePreviewTopic(${i})" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('')}
    </div>
    <div class="topic-preview-add">
      <input type="text" class="form-control" id="new-topic-input" placeholder="Add another topic..." />
      <button class="btn btn-outline btn-sm" onclick="addPreviewTopic()">
        <i class="fas fa-plus"></i> Add
      </button>
    </div>
  `;
}

function getPreviewTopics() {
    const inputs = document.querySelectorAll('.topic-preview-input');
    return Array.from(inputs).map(i => i.value.trim()).filter(v => v.length > 0);
}

function removePreviewTopic(index) {
    const items = document.querySelectorAll('.topic-preview-item');
    if (items[index]) {
        items[index].remove();
        // Re-number
        document.querySelectorAll('.topic-preview-item').forEach((el, i) => {
            el.querySelector('.topic-preview-number').textContent = i + 1;
            el.dataset.index = i;
            el.querySelector('.topic-preview-remove').setAttribute('onclick', `removePreviewTopic(${i})`);
        });
        // Update count
        const count = document.querySelectorAll('.topic-preview-item').length;
        const countEl = document.querySelector('.topic-preview-count');
        if (countEl) countEl.textContent = `${count} topics`;
    }
}

function addPreviewTopic() {
    const input = document.getElementById('new-topic-input');
    if (!input || !input.value.trim()) return;

    const list = document.getElementById('topic-preview-items');
    const count = list.querySelectorAll('.topic-preview-item').length;

    const div = document.createElement('div');
    div.className = 'topic-preview-item';
    div.dataset.index = count;
    div.innerHTML = `
    <span class="topic-preview-number">${count + 1}</span>
    <input type="text" class="topic-preview-input" value="${escapeAttr(input.value.trim())}" />
    <button class="topic-preview-remove" onclick="removePreviewTopic(${count})" title="Remove">
      <i class="fas fa-times"></i>
    </button>
  `;
    list.appendChild(div);
    input.value = '';

    // Update count
    const countEl = document.querySelector('.topic-preview-count');
    if (countEl) countEl.textContent = `${count + 1} topics`;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
