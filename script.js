/* ============================================================
   NFA → DFA Subset Construction Visualizer
   Core Logic, Algorithm, and Visualization Engine
   ============================================================ */

// ==================== GLOBAL STATE ====================
const AppState = {
    nfa: null,
    dfa: null,
    steps: [],
    currentStep: -1,
    autoPlayTimer: null,
    nfaGraph: null,
    dfaGraph: null,
};

// ==================== PARTICLE BACKGROUND ====================
(function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.radius = Math.random() * 1.5 + 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
            const colors = ['99,102,241', '6,182,212', '129,140,248', '244,114,182'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99,102,241, ${0.06 * (1 - dist / 140)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        requestAnimationFrame(animate);
    }
    animate();
})();

// ==================== NEURAL NETWORK BACKGROUND ====================
(function initNeural() {
    const canvas = document.getElementById('neural-canvas');
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        initNodes();
    }

    function initNodes() {
        nodes = [];
        const cols = 6;
        const rows = 5;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                nodes.push({
                    x: (w / (cols + 1)) * (c + 1) + (Math.random() - 0.5) * 60,
                    y: (h / (rows + 1)) * (r + 1) + (Math.random() - 0.5) * 40,
                    col: c,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.002 + Math.random() * 0.003,
                });
            }
        }
    }

    resize();
    window.addEventListener('resize', resize);

    function animate(t) {
        ctx.clearRect(0, 0, w, h);
        // Draw connections between adjacent columns
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (Math.abs(nodes[i].col - nodes[j].col) === 1) {
                    const pulse = (Math.sin(t * nodes[i].speed + nodes[i].phase) + 1) / 2;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.strokeStyle = `rgba(99,102,241, ${0.03 * pulse})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        // Draw nodes
        nodes.forEach(n => {
            const pulse = (Math.sin(t * n.speed + n.phase) + 1) / 2;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 2 + pulse * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(6,182,212, ${0.08 + 0.06 * pulse})`;
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
})();

// ==================== NAVIGATION ====================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`section-${section}`);
        if (target) {
            target.classList.add('active');
            // Re-draw canvases if switching to viz
            if (section === 'visualization') {
                setTimeout(() => {
                    if (AppState.nfa) drawNFA();
                    if (AppState.dfa) drawDFA();
                }, 100);
            }
        }
    });
});

// ==================== STATE INPUT SYNC ====================
const statesInput = document.getElementById('input-states');
const startSelect = document.getElementById('input-start');
const alphabetInput = document.getElementById('input-alphabet');
const epsilonCheckbox = document.getElementById('input-epsilon');

function parseCSV(str) {
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function getStates() { return parseCSV(statesInput.value); }
function getAlphabet() {
    const syms = parseCSV(alphabetInput.value);
    if (epsilonCheckbox.checked) syms.push('ε');
    return syms;
}

function syncStartSelect() {
    const states = getStates();
    const prev = startSelect.value;
    startSelect.innerHTML = '<option value="">— select —</option>';
    states.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        if (s === prev) opt.selected = true;
        startSelect.appendChild(opt);
    });
    if (!startSelect.value && states.length > 0) startSelect.value = states[0];
}

statesInput.addEventListener('input', () => {
    syncStartSelect();
    updateTransitionSelects();
});
alphabetInput.addEventListener('input', updateTransitionSelects);
epsilonCheckbox.addEventListener('change', updateTransitionSelects);
syncStartSelect();

// ==================== TRANSITION TABLE ====================
const transitionTbody = document.getElementById('transition-tbody');
const btnAddTransition = document.getElementById('btn-add-transition');

function updateTransitionSelects() {
    const states = getStates();
    const symbols = getAlphabet();
    transitionTbody.querySelectorAll('.tr-from-select').forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = '';
        states.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            if (s === prev) opt.selected = true;
            sel.appendChild(opt);
        });
    });
    transitionTbody.querySelectorAll('.tr-sym-select').forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = '';
        symbols.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            if (s === prev) opt.selected = true;
            sel.appendChild(opt);
        });
    });
}

function addTransitionRow(from = '', sym = '', to = '') {
    const states = getStates();
    const symbols = getAlphabet();
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <select class="select-input tr-from-select">
                ${states.map(s => `<option value="${s}" ${s === from ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="select-input tr-sym-select">
                ${symbols.map(s => `<option value="${s}" ${s === sym ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </td>
        <td>
            <input type="text" class="text-input tr-to-input" placeholder="e.g. q1, q2" value="${to}">
        </td>
        <td>
            <button class="btn-delete-row" title="Remove">✕</button>
        </td>
    `;
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr.style.animation = 'toastSlideOut 0.2s ease forwards';
        setTimeout(() => tr.remove(), 200);
    });
    transitionTbody.appendChild(tr);
}

btnAddTransition.addEventListener('click', () => addTransitionRow());

// Add a couple default rows
addTransitionRow('q0', 'a', 'q0, q1');
addTransitionRow('q0', 'b', 'q0');
addTransitionRow('q1', 'b', 'q2');

// ==================== PRESETS ====================
const presets = {
    simple: {
        states: 'q0, q1, q2',
        alphabet: 'a, b',
        epsilon: false,
        start: 'q0',
        accept: 'q2',
        transitions: [
            ['q0', 'a', 'q0, q1'],
            ['q0', 'b', 'q0'],
            ['q1', 'b', 'q2'],
        ]
    },
    epsilon: {
        states: 'q0, q1, q2',
        alphabet: 'a, b',
        epsilon: true,
        start: 'q0',
        accept: 'q2',
        transitions: [
            ['q0', 'ε', 'q1'],
            ['q0', 'a', 'q0'],
            ['q1', 'b', 'q1, q2'],
            ['q1', 'a', 'q2'],
        ]
    },
    complex: {
        states: 'q0, q1, q2, q3',
        alphabet: 'a, b',
        epsilon: false,
        start: 'q0',
        accept: 'q3',
        transitions: [
            ['q0', 'a', 'q0, q1'],
            ['q0', 'b', 'q0'],
            ['q1', 'a', 'q2'],
            ['q1', 'b', 'q2'],
            ['q2', 'a', 'q3'],
            ['q2', 'b', 'q3'],
        ]
    }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const p = presets[btn.dataset.preset];
        if (!p) return;
        statesInput.value = p.states;
        alphabetInput.value = p.alphabet;
        epsilonCheckbox.checked = p.epsilon;
        document.getElementById('input-accept').value = p.accept;
        syncStartSelect();
        startSelect.value = p.start;
        transitionTbody.innerHTML = '';
        updateTransitionSelects();
        p.transitions.forEach(t => addTransitionRow(t[0], t[1], t[2]));
        showToast('Preset loaded!', 'success');
    });
});

// ==================== NFA PARSER ====================
function parseNFA() {
    const states = getStates();
    const rawAlphabet = parseCSV(alphabetInput.value);
    const start = startSelect.value;
    const accept = parseCSV(document.getElementById('input-accept').value);
    const hasEpsilon = epsilonCheckbox.checked;
    const alphabet = [...rawAlphabet];

    if (states.length === 0) throw new Error('Please define at least one state.');
    if (rawAlphabet.length === 0) throw new Error('Please define at least one alphabet symbol.');
    if (!start) throw new Error('Please select a start state.');
    if (accept.length === 0) throw new Error('Please define at least one accept state.');

    // Build transition map: delta[state][symbol] = Set of states
    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        rawAlphabet.forEach(a => delta[s][a] = new Set());
        if (hasEpsilon) delta[s]['ε'] = new Set();
    });

    const rows = transitionTbody.querySelectorAll('tr');
    rows.forEach(row => {
        const from = row.querySelector('.tr-from-select')?.value;
        const sym = row.querySelector('.tr-sym-select')?.value;
        const toStr = row.querySelector('.tr-to-input')?.value || '';
        const targets = parseCSV(toStr);
        if (from && sym && targets.length > 0) {
            if (!delta[from]) throw new Error(`Unknown state "${from}" in transitions.`);
            if (!delta[from][sym] && sym !== 'ε') throw new Error(`Unknown symbol "${sym}" for state "${from}".`);
            if (!delta[from][sym]) delta[from][sym] = new Set();
            targets.forEach(t => {
                if (!states.includes(t)) throw new Error(`Unknown target state "${t}" in transition from ${from} on ${sym}.`);
                delta[from][sym].add(t);
            });
        }
    });

    return { states, alphabet, start, accept, delta, hasEpsilon };
}

// ==================== SUBSET CONSTRUCTION ====================

/**
 * Compute epsilon-closure of a set of states
 */
function epsilonClosure(nfa, stateSet) {
    const stack = [...stateSet];
    const closure = new Set(stateSet);
    while (stack.length > 0) {
        const s = stack.pop();
        if (nfa.delta[s] && nfa.delta[s]['ε']) {
            for (const t of nfa.delta[s]['ε']) {
                if (!closure.has(t)) {
                    closure.add(t);
                    stack.push(t);
                }
            }
        }
    }
    return closure;
}

/**
 * Compute move(stateSet, symbol) – set of states reachable from
 * stateSet on symbol (without epsilon), then apply epsilon-closure.
 */
function move(nfa, stateSet, symbol) {
    const result = new Set();
    for (const s of stateSet) {
        if (nfa.delta[s] && nfa.delta[s][symbol]) {
            for (const t of nfa.delta[s][symbol]) {
                result.add(t);
            }
        }
    }
    return result;
}

function setToKey(s) {
    return [...s].sort().join(',');
}

function keyToLabel(key) {
    if (key === '') return '∅';
    return '{' + key + '}';
}

function subsetConstruction(nfa) {
    const steps = [];
    const alphabet = nfa.alphabet; // without epsilon
    const dfaStates = {};       // key -> { nfaStates: Set, isAccept, label }
    const dfaDelta = {};        // key -> { symbol: key }
    const unmarked = [];

    // Step 0: epsilon-closure of start
    const startClosure = nfa.hasEpsilon
        ? epsilonClosure(nfa, new Set([nfa.start]))
        : new Set([nfa.start]);
    const startKey = setToKey(startClosure);
    const isStartAccept = [...startClosure].some(s => nfa.accept.includes(s));

    dfaStates[startKey] = {
        nfaStates: startClosure,
        isAccept: isStartAccept,
        label: keyToLabel(startKey),
    };
    dfaDelta[startKey] = {};
    unmarked.push(startKey);

    steps.push({
        type: 'init',
        title: 'Initial State (ε-closure)',
        detail: `ε-closure({${nfa.start}}) = ${keyToLabel(startKey)}`,
        dfaState: startKey,
        nfaSubset: startClosure,
    });

    while (unmarked.length > 0) {
        const currentKey = unmarked.shift();
        const currentSet = dfaStates[currentKey].nfaStates;

        for (const sym of alphabet) {
            // move then epsilon-closure
            const moveResult = move(nfa, currentSet, sym);
            const newSet = nfa.hasEpsilon ? epsilonClosure(nfa, moveResult) : moveResult;
            const newKey = setToKey(newSet);

            dfaDelta[currentKey][sym] = newKey;

            if (newSet.size === 0) {
                // Dead state / trap state
                if (!dfaStates['']) {
                    dfaStates[''] = { nfaStates: new Set(), isAccept: false, label: '∅' };
                    dfaDelta[''] = {};
                    alphabet.forEach(a => dfaDelta[''][a] = '');
                    steps.push({
                        type: 'dead',
                        title: 'Dead State Created',
                        detail: `${keyToLabel(currentKey)} on "${sym}" → ∅ (dead state)`,
                        dfaState: '',
                        nfaSubset: new Set(),
                        from: currentKey,
                        symbol: sym,
                    });
                }
                dfaDelta[currentKey][sym] = '';
                steps.push({
                    type: 'transition',
                    title: `Transition on "${sym}"`,
                    detail: `δ(${keyToLabel(currentKey)}, ${sym}) = move → ${moveResult.size > 0 ? keyToLabel(setToKey(moveResult)) : '∅'}${nfa.hasEpsilon ? ' → ε-closure = ∅' : ''}`,
                    from: currentKey,
                    symbol: sym,
                    to: '',
                    nfaSubset: new Set(),
                });
            } else if (!dfaStates[newKey]) {
                // New DFA state discovered
                const isAccept = [...newSet].some(s => nfa.accept.includes(s));
                dfaStates[newKey] = {
                    nfaStates: newSet,
                    isAccept,
                    label: keyToLabel(newKey),
                };
                dfaDelta[newKey] = {};
                unmarked.push(newKey);

                steps.push({
                    type: 'new-state',
                    title: `New DFA State on "${sym}"`,
                    detail: `δ(${keyToLabel(currentKey)}, ${sym}) = ${nfa.hasEpsilon ? 'ε-closure(' : ''}${keyToLabel(setToKey(moveResult))}${nfa.hasEpsilon ? ')' : ''} = ${keyToLabel(newKey)}${isAccept ? ' ★ Accept' : ''}`,
                    from: currentKey,
                    symbol: sym,
                    to: newKey,
                    nfaSubset: newSet,
                    dfaState: newKey,
                });
            } else {
                // Existing state
                steps.push({
                    type: 'transition',
                    title: `Transition on "${sym}"`,
                    detail: `δ(${keyToLabel(currentKey)}, ${sym}) = ${keyToLabel(newKey)} (existing)`,
                    from: currentKey,
                    symbol: sym,
                    to: newKey,
                    nfaSubset: newSet,
                });
            }
        }
    }

    return {
        states: dfaStates,
        delta: dfaDelta,
        startKey,
        alphabet,
        steps,
    };
}

// ==================== CONVERT BUTTON ====================
document.getElementById('btn-convert').addEventListener('click', () => {
    try {
        const nfa = parseNFA();
        AppState.nfa = nfa;

        const result = subsetConstruction(nfa);
        AppState.dfa = result;
        AppState.steps = result.steps;
        AppState.currentStep = -1;

        // Build step UI
        buildStepsUI(result.steps);
        buildDFATable(result);

        // Navigate to algorithm tab
        document.querySelector('[data-section="algorithm"]').click();

        showToast('NFA converted successfully! Walk through the steps.', 'success');
    } catch (e) {
        showToast(e.message, 'error');
    }
});

// ==================== STEPS UI ====================
function buildStepsUI(steps) {
    const list = document.getElementById('steps-list');
    list.innerHTML = '';
    steps.forEach((step, i) => {
        const div = document.createElement('div');
        div.className = 'step-item';
        div.dataset.index = i;

        // Build detail with styled spans
        let detailHtml = step.detail
            .replace(/\{([^}]*)\}/g, '<span class="state-set">{$1}</span>')
            .replace(/∅/g, '<span class="state-set">∅</span>')
            .replace(/→/g, '<span class="arrow">→</span>')
            .replace(/★/g, '⭐');

        div.innerHTML = `
            <div class="step-number">STEP ${i + 1}</div>
            <div class="step-title">${step.title}</div>
            <div class="step-detail">${detailHtml}</div>
        `;
        div.addEventListener('click', () => goToStep(i));
        list.appendChild(div);
    });

    updateStepCounter();
}

function goToStep(index) {
    if (index < 0 || index >= AppState.steps.length) return;
    AppState.currentStep = index;

    // Update step items
    document.querySelectorAll('.step-item').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i < index) el.classList.add('completed');
        if (i === index) el.classList.add('active');
    });

    // Scroll into view
    const activeStep = document.querySelector('.step-item.active');
    if (activeStep) activeStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Highlight DFA table row
    highlightDFATableRow(index);

    updateStepCounter();
}

function updateStepCounter() {
    const counter = document.getElementById('step-counter');
    counter.textContent = `${AppState.currentStep + 1} / ${AppState.steps.length}`;

    document.getElementById('btn-prev-step').disabled = AppState.currentStep <= 0;
    document.getElementById('btn-next-step').disabled = AppState.currentStep >= AppState.steps.length - 1;
}

document.getElementById('btn-prev-step').addEventListener('click', () => {
    goToStep(AppState.currentStep - 1);
});

document.getElementById('btn-next-step').addEventListener('click', () => {
    goToStep(AppState.currentStep + 1);
});

document.getElementById('btn-auto-play').addEventListener('click', () => {
    if (AppState.autoPlayTimer) {
        clearInterval(AppState.autoPlayTimer);
        AppState.autoPlayTimer = null;
        document.getElementById('btn-auto-play').textContent = '▶▶';
        return;
    }
    document.getElementById('btn-auto-play').textContent = '⏸';
    if (AppState.currentStep < 0) AppState.currentStep = -1;
    AppState.autoPlayTimer = setInterval(() => {
        if (AppState.currentStep >= AppState.steps.length - 1) {
            clearInterval(AppState.autoPlayTimer);
            AppState.autoPlayTimer = null;
            document.getElementById('btn-auto-play').textContent = '▶▶';
            return;
        }
        goToStep(AppState.currentStep + 1);
    }, 1200);
});

// ==================== DFA TABLE ====================
function buildDFATable(dfa) {
    const thead = document.getElementById('dfa-thead');
    const tbody = document.getElementById('dfa-tbody');
    const alphabet = dfa.alphabet;

    thead.innerHTML = `<tr>
        <th>DFA State</th>
        <th>NFA Subset</th>
        ${alphabet.map(a => `<th>δ(_, ${a})</th>`).join('')}
        <th>Type</th>
    </tr>`;

    tbody.innerHTML = '';

    // Order: start first, then others, dead last
    const keys = Object.keys(dfa.states);
    keys.sort((a, b) => {
        if (a === dfa.startKey) return -1;
        if (b === dfa.startKey) return 1;
        if (a === '') return 1;
        if (b === '') return -1;
        return a.localeCompare(b);
    });

    keys.forEach((key, idx) => {
        const state = dfa.states[key];
        const tr = document.createElement('tr');
        tr.dataset.dfaKey = key;

        const isStart = key === dfa.startKey;
        const isDead = key === '';
        const badges = [];
        if (isStart) badges.push('<span class="state-badge start">→</span>');
        if (state.isAccept) badges.push('<span class="state-badge accept">★</span>');
        if (isDead) badges.push('<span class="state-badge dead">⊘</span>');
        const nameLabel = isDead ? '∅' : `D${idx}`;

        let cells = `<td><div class="dfa-state-cell">${badges.join('')} ${nameLabel}</div></td>`;
        cells += `<td>${state.label}</td>`;
        alphabet.forEach(sym => {
            const target = dfa.delta[key] ? dfa.delta[key][sym] : '';
            const targetState = dfa.states[target];
            const targetLabel = target === '' ? '∅' : targetState?.label || '∅';
            cells += `<td>${targetLabel}</td>`;
        });
        // Type
        let typeStr = '';
        if (isStart && state.isAccept) typeStr = 'Start, Accept';
        else if (isStart) typeStr = 'Start';
        else if (state.isAccept) typeStr = 'Accept';
        else if (isDead) typeStr = 'Dead';
        else typeStr = '—';
        cells += `<td>${typeStr}</td>`;

        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });
}

function highlightDFATableRow(stepIndex) {
    document.querySelectorAll('#dfa-tbody tr').forEach(tr => tr.classList.remove('highlight'));
    const step = AppState.steps[stepIndex];
    if (!step) return;
    const key = step.dfaState || step.from || step.to;
    if (key !== undefined) {
        const row = document.querySelector(`#dfa-tbody tr[data-dfa-key="${key}"]`);
        if (row) row.classList.add('highlight');
    }
}

// ==================== GRAPH VISUALIZATION ENGINE ====================
class AutomatonGraph {
    constructor(canvas, type) {
        if (canvas.graphInstance) {
            canvas.graphInstance.destroy();
        }
        canvas.graphInstance = this;
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type; // 'nfa' or 'dfa'
        this.nodes = [];
        this.edges = [];
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.dragging = false; // Panning
        this.draggedNode = null; // Node dragging
        this.dragStart = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        this.dpr = window.devicePixelRatio || 1;
        this.animFrame = null;
        
        this.setupCanvas();
        this.setupEvents();
    }

    destroy() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
        }
    }

    setupCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const w = rect.width || 600;
        const h = 450;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.w = w;
        this.h = h;
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', e => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            // Transform mouse to world coordinates
            const wx = (mx - (this.w / 2 + this.pan.x)) / this.zoom + this.w / 2;
            const wy = (my - (this.h / 2 + this.pan.y)) / this.zoom + this.h / 2;
            
            // Hit test nodes
            const r = 28;
            this.draggedNode = this.nodes.find(n => {
                const dx = n.x - wx;
                const dy = n.y - wy;
                return Math.sqrt(dx*dx + dy*dy) <= r;
            });

            if (this.draggedNode) {
                this.draggedNode.vx = 0;
                this.draggedNode.vy = 0;
            } else {
                this.dragging = true;
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.panStart = { ...this.pan };
            }
        });

        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (this.draggedNode) {
                // Update node to follow mouse
                const wx = (mx - (this.w / 2 + this.pan.x)) / this.zoom + this.w / 2;
                const wy = (my - (this.h / 2 + this.pan.y)) / this.zoom + this.h / 2;
                this.draggedNode.x = wx;
                this.draggedNode.y = wy;
            } else if (this.dragging) {
                // Pan canvas
                this.pan.x = this.panStart.x + (e.clientX - this.dragStart.x);
                this.pan.y = this.panStart.y + (e.clientY - this.dragStart.y);
            }
        });

        this.canvas.addEventListener('mouseup', () => { 
            this.dragging = false; 
            this.draggedNode = null;
        });
        this.canvas.addEventListener('mouseleave', () => { 
            this.dragging = false; 
            this.draggedNode = null;
        });
        
        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            this.zoom *= e.deltaY > 0 ? 0.92 : 1.08;
            this.zoom = Math.max(0.3, Math.min(3, this.zoom));
        });
    }

    zoomIn() { this.zoom = Math.min(3, this.zoom * 1.2); }
    zoomOut() { this.zoom = Math.max(0.3, this.zoom / 1.2); }
    resetView() { this.zoom = 1; this.pan = { x: 0, y: 0 }; }

    layoutNodes() {
        if (this.nodes.length === 0) return;
        const cx = this.w / 2;
        const cy = this.h / 2;
        const radius = Math.min(this.w, this.h) * 0.32;

        // Initialize positions in a circle and velocities to 0
        this.nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / this.nodes.length - Math.PI / 2;
            node.x = cx + radius * Math.cos(angle);
            node.y = cy + radius * Math.sin(angle);
            node.vx = 0;
            node.vy = 0;
        });

        this.startLoop();
    }

    startLoop() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        const loop = () => {
            this.updatePhysics();
            this.draw();
            this.animFrame = requestAnimationFrame(loop);
        };
        loop();
    }

    updatePhysics() {
        if (this.nodes.length <= 1) return;
        const center = { x: this.w / 2, y: this.h / 2 };
        
        // 1. Repulsion between all pairs of nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[j];
                let dx = n2.x - n1.x;
                let dy = n2.y - n1.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist === 0) { dx = Math.random()-0.5; dy = Math.random()-0.5; dist = 1; }
                
                // Repulsion constant
                const force = 12000 / (dist * dist); 
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                n1.vx -= fx; n1.vy -= fy;
                n2.vx += fx; n2.vy += fy;
            }
        }
        
        // 2. Attraction along edges
        this.edges.forEach(edge => {
            const n1 = this.nodes.find(n => n.id === edge.from);
            const n2 = this.nodes.find(n => n.id === edge.to);
            if (!n1 || !n2 || n1 === n2) return;
            
            let dx = n2.x - n1.x;
            let dy = n2.y - n1.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist === 0) return;
            
            // Ideal edge length
            const idealLen = 140; 
            const force = (dist - idealLen) * 0.03; // Spring constant
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx += fx; n1.vy += fy;
            n2.vx -= fx; n2.vy -= fy;
        });
        
        // 3. Center gravity and update positions with damping
        this.nodes.forEach(n => {
            n.vx += (center.x - n.x) * 0.005;
            n.vy += (center.y - n.y) * 0.005;
            
            if (n === this.draggedNode) {
                // If dragging, don't move by physics
                n.vx = 0;
                n.vy = 0;
            } else {
                n.vx *= 0.85; // Damping/Friction
                n.vy *= 0.85;
                n.x += n.vx;
                n.y += n.vy;
            }
        });
    }

    draw() {
        const ctx = this.ctx;
        ctx.save();
        ctx.clearRect(0, 0, this.w, this.h);

        // Apply transforms
        ctx.translate(this.w / 2 + this.pan.x, this.h / 2 + this.pan.y);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.w / 2, -this.h / 2);

        // Draw edges first
        this.edges.forEach(edge => this.drawEdge(ctx, edge));

        // Draw nodes
        this.nodes.forEach(node => this.drawNode(ctx, node));

        ctx.restore();
    }

    drawNode(ctx, node) {
        const r = 28;

        // Glow when node is hovered or dragged
        if (node.isAccept || node === this.draggedNode) {
            ctx.save();
            ctx.shadowColor = node === this.draggedNode ? 'rgba(244,114,182,0.6)' : 'rgba(34,197,94,0.4)';
            ctx.shadowBlur = node === this.draggedNode ? 24 : 16;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = node === this.draggedNode ? 'rgba(244,114,182,0.8)' : 'rgba(34,197,94,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

        // Gradient fill
        const grad = ctx.createRadialGradient(node.x - 6, node.y - 6, 2, node.x, node.y, r);
        if (node.isDead) {
            grad.addColorStop(0, 'rgba(100,20,20,0.9)');
            grad.addColorStop(1, 'rgba(60,10,10,0.9)');
        } else if (node.isAccept && node.isStart) {
            grad.addColorStop(0, 'rgba(50,70,140,0.9)');
            grad.addColorStop(1, 'rgba(25,45,100,0.9)');
        } else if (node.isStart) {
            grad.addColorStop(0, 'rgba(50,55,140,0.9)');
            grad.addColorStop(1, 'rgba(30,30,90,0.9)');
        } else if (node.isAccept) {
            grad.addColorStop(0, 'rgba(20,80,50,0.9)');
            grad.addColorStop(1, 'rgba(10,50,30,0.9)');
        } else {
            grad.addColorStop(0, 'rgba(30,30,60,0.9)');
            grad.addColorStop(1, 'rgba(18,18,40,0.9)');
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.lineWidth = node === this.draggedNode ? 3 : 2;
        ctx.strokeStyle = node === this.draggedNode ? '#f472b6' : node.isStart ? '#818cf8' : node.isAccept ? '#4ade80' : node.isDead ? '#f87171' : 'rgba(99,102,241,0.4)';
        ctx.stroke();

        // Accept double circle
        if (node.isAccept) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r - 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#e8e8f0';
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = node.label;
        if (label.length > 8) {
            ctx.font = '600 9px "JetBrains Mono", monospace';
        } else if (label.length > 5) {
            ctx.font = '600 10px "JetBrains Mono", monospace';
        }
        ctx.fillText(label, node.x, node.y);

        // Start arrow
        if (node.isStart) {
            const ax = node.x - r - 30;
            const ay = node.y;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(node.x - r - 2, ay);
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(node.x - r - 2, ay);
            ctx.lineTo(node.x - r - 10, ay - 5);
            ctx.lineTo(node.x - r - 10, ay + 5);
            ctx.closePath();
            ctx.fillStyle = '#818cf8';
            ctx.fill();
        }
    }

    drawEdge(ctx, edge) {
        const fromNode = this.nodes.find(n => n.id === edge.from);
        const toNode = this.nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const r = 28;

        if (edge.from === edge.to) {
            // Self-loop
            const loopR = 20;
            const cx = fromNode.x;
            const cy = fromNode.y - r - loopR;

            ctx.beginPath();
            ctx.arc(cx, cy, loopR, 0.3 * Math.PI, 0.7 * Math.PI, false);
            ctx.strokeStyle = 'rgba(129,140,248,0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Arrow
            const arrowX = cx + loopR * Math.cos(0.7 * Math.PI);
            const arrowY = cy + loopR * Math.sin(0.7 * Math.PI);
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 3, arrowY - 8);
            ctx.lineTo(arrowX + 5, arrowY - 4);
            ctx.closePath();
            ctx.fillStyle = 'rgba(129,140,248,0.6)';
            ctx.fill();

            // Label
            ctx.fillStyle = '#22d3ee';
            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(edge.label, cx, cy - loopR - 4);
            return;
        }

        // Check for bidirectional edge
        const reverseEdge = this.edges.find(e => e.from === edge.to && e.to === edge.from && e !== edge);
        const curvature = reverseEdge ? 0.2 : 0;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / dist;
        const ny = dy / dist;

        // Start and end points on circle boundary
        const sx = fromNode.x + nx * r;
        const sy = fromNode.y + ny * r;
        const ex = toNode.x - nx * r;
        const ey = toNode.y - ny * r;

        if (curvature > 0) {
            // Curved edge
            const midX = (sx + ex) / 2 + (-ny) * dist * curvature;
            const midY = (sy + ey) / 2 + nx * dist * curvature;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(midX, midY, ex, ey);
            ctx.strokeStyle = 'rgba(129,140,248,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Arrowhead
            const t = 0.95;
            const tangentX = 2 * (1 - t) * (midX - sx) + 2 * t * (ex - midX);
            const tangentY = 2 * (1 - t) * (midY - sy) + 2 * t * (ey - midY);
            const tLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            const tnx = tangentX / tLen;
            const tny = tangentY / tLen;

            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - tnx * 10 - tny * 5, ey - tny * 10 + tnx * 5);
            ctx.lineTo(ex - tnx * 10 + tny * 5, ey - tny * 10 - tnx * 5);
            ctx.closePath();
            ctx.fillStyle = 'rgba(129,140,248,0.5)';
            ctx.fill();

            // Label
            const labelX = midX;
            const labelY = midY;

            ctx.save();
            ctx.fillStyle = 'rgba(10,10,26,0.85)';
            const metrics = ctx.measureText(edge.label);
            const padX = 5, padY = 3;
            ctx.font = '600 11px "JetBrains Mono", monospace';
            const tw = ctx.measureText(edge.label).width;
            ctx.fillRect(labelX - tw / 2 - padX, labelY - 7 - padY, tw + padX * 2, 14 + padY * 2);
            ctx.fillStyle = '#22d3ee';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.label, labelX, labelY);
            ctx.restore();
        } else {
            // Straight edge
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(129,140,248,0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - nx * 10 - ny * 5, ey - ny * 10 + nx * 5);
            ctx.lineTo(ex - nx * 10 + ny * 5, ey - ny * 10 - nx * 5);
            ctx.closePath();
            ctx.fillStyle = 'rgba(129,140,248,0.5)';
            ctx.fill();

            // Label at midpoint
            const mx = (sx + ex) / 2 + (-ny) * 14;
            const my = (sy + ey) / 2 + nx * 14;

            ctx.save();
            ctx.font = '600 11px "JetBrains Mono", monospace';
            const tw = ctx.measureText(edge.label).width;
            ctx.fillStyle = 'rgba(10,10,26,0.85)';
            ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
            ctx.fillStyle = '#22d3ee';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.label, mx, my);
            ctx.restore();
        }
    }
}

// ==================== BUILD GRAPHS ====================
function drawNFA() {
    const nfa = AppState.nfa;
    if (!nfa) return;

    const canvas = document.getElementById('canvas-nfa');
    const graph = new AutomatonGraph(canvas, 'nfa');
    AppState.nfaGraph = graph;

    // Build nodes
    graph.nodes = nfa.states.map(s => ({
        id: s,
        label: s,
        isStart: s === nfa.start,
        isAccept: nfa.accept.includes(s),
        isDead: false,
    }));
    graph.layoutNodes();

    // Build edges — merge transitions with same from/to
    const edgeMap = {};
    nfa.states.forEach(from => {
        const allSymbols = [...nfa.alphabet];
        if (nfa.hasEpsilon) allSymbols.push('ε');
        allSymbols.forEach(sym => {
            if (nfa.delta[from] && nfa.delta[from][sym]) {
                nfa.delta[from][sym].forEach(to => {
                    const key = `${from}|${to}`;
                    if (!edgeMap[key]) edgeMap[key] = { from, to, symbols: [] };
                    edgeMap[key].symbols.push(sym);
                });
            }
        });
    });
    graph.edges = Object.values(edgeMap).map(e => ({
        from: e.from,
        to: e.to,
        label: e.symbols.join(', '),
    }));

    graph.draw();
}

function drawDFA() {
    const dfa = AppState.dfa;
    if (!dfa) return;

    const canvas = document.getElementById('canvas-dfa');
    const graph = new AutomatonGraph(canvas, 'dfa');
    AppState.dfaGraph = graph;

    const keys = Object.keys(dfa.states);

    graph.nodes = keys.map(key => ({
        id: key,
        label: dfa.states[key].label,
        isStart: key === dfa.startKey,
        isAccept: dfa.states[key].isAccept,
        isDead: key === '',
    }));
    graph.layoutNodes();

    // Build edges
    const edgeMap = {};
    keys.forEach(from => {
        if (!dfa.delta[from]) return;
        dfa.alphabet.forEach(sym => {
            const to = dfa.delta[from][sym];
            if (to === undefined) return;
            const key = `${from}||${to}`;
            if (!edgeMap[key]) edgeMap[key] = { from, to, symbols: [] };
            edgeMap[key].symbols.push(sym);
        });
    });
    graph.edges = Object.values(edgeMap).map(e => ({
        from: e.from,
        to: e.to,
        label: e.symbols.join(', '),
    }));

    graph.draw();
}

// Viz controls
document.getElementById('btn-zoom-in-nfa').addEventListener('click', () => AppState.nfaGraph?.zoomIn());
document.getElementById('btn-zoom-out-nfa').addEventListener('click', () => AppState.nfaGraph?.zoomOut());
document.getElementById('btn-reset-nfa').addEventListener('click', () => AppState.nfaGraph?.resetView());
document.getElementById('btn-zoom-in-dfa').addEventListener('click', () => AppState.dfaGraph?.zoomIn());
document.getElementById('btn-zoom-out-dfa').addEventListener('click', () => AppState.dfaGraph?.zoomOut());
document.getElementById('btn-reset-dfa').addEventListener('click', () => AppState.dfaGraph?.resetView());

// Navigate to visualization tab also triggers draw
document.getElementById('nav-visualization').addEventListener('click', () => {
    setTimeout(() => {
        if (AppState.nfa) drawNFA();
        if (AppState.dfa) drawDFA();
    }, 200);
});

// ==================== STRING TESTING ====================
document.getElementById('btn-test-string').addEventListener('click', () => {
    const dfa = AppState.dfa;
    if (!dfa) {
        showToast('Please convert an NFA first.', 'error');
        return;
    }

    const testStr = document.getElementById('test-string-input').value;
    const resultDiv = document.getElementById('test-result');

    let currentKey = dfa.startKey;
    const path = [{ state: currentKey, label: dfa.states[currentKey].label }];

    for (const ch of testStr) {
        if (!dfa.alphabet.includes(ch)) {
            resultDiv.className = 'test-result rejected';
            resultDiv.innerHTML = `<strong>Error:</strong> Symbol "${ch}" not in alphabet {${dfa.alphabet.join(', ')}}`;
            return;
        }
        if (!dfa.delta[currentKey] || dfa.delta[currentKey][ch] === undefined) {
            currentKey = ''; // dead state
        } else {
            currentKey = dfa.delta[currentKey][ch];
        }
        path.push({ state: currentKey, label: dfa.states[currentKey]?.label || '∅', symbol: ch });
    }

    const accepted = dfa.states[currentKey]?.isAccept || false;
    resultDiv.className = 'test-result ' + (accepted ? 'accepted' : 'rejected');

    let pathHtml = path.map((p, i) => {
        let html = `<span class="path-step">${p.label}</span>`;
        if (i < path.length - 1) {
            html += `<span class="path-arrow"> —${path[i + 1].symbol}→ </span>`;
        }
        return html;
    }).join('');

    const verdict = accepted
        ? '✅ <strong>ACCEPTED</strong>'
        : '❌ <strong>REJECTED</strong>';

    resultDiv.innerHTML = `
        <div style="margin-bottom:8px">${verdict} — String "${testStr || 'ε'}"</div>
        <div>Path: ${pathHtml}</div>
    `;
});

// ==================== LANGUAGE INPUT ENGINE ====================

/**
 * detectPattern(input) — Rule-based parser for natural language descriptions.
 * Returns a pattern object: { type, alphabet, ...params } or null.
 */
function detectPattern(input) {
    const text = input.toLowerCase().trim();
    if (!text) return null;

    // Extract alphabet from "over {0,1}" or "over {a,b}" patterns
    let alphabet = null;
    const alphaMatch = text.match(/over\s*\{([^}]+)\}/);
    if (alphaMatch) {
        alphabet = alphaMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    // Try to infer alphabet from the described pattern symbols
    function inferAlphabet(patternStr) {
        if (alphabet) return alphabet;
        const chars = new Set();
        for (const ch of patternStr) {
            if (/[a-z0-9]/.test(ch)) chars.add(ch);
        }
        if (chars.size > 0) return [...chars].sort();
        return ['0', '1']; // default
    }

    // ---- COMBINED: starts with X and ends with Y ----
    const startEndMatch = text.match(/start(?:s|ing)?\s+with\s+['"]?([a-z0-9]+)['"]?\s+(?:and|&)\s+end(?:s|ing)?\s+with\s+['"]?([a-z0-9]+)['"]?/);
    if (startEndMatch) {
        const prefix = startEndMatch[1];
        const suffix = startEndMatch[2];
        const a = inferAlphabet(prefix + suffix);
        return { type: 'start-end', alphabet: a, prefix, suffix };
    }

    // ---- ENDS WITH ----
    const endsMatch = text.match(/end(?:s|ing)?\s+(?:with|in)\s+['"]?([a-z0-9]+)['"]?/);
    if (endsMatch) {
        const suffix = endsMatch[1];
        const a = inferAlphabet(suffix);
        return { type: 'ends-with', alphabet: a, suffix };
    }

    // ---- STARTS WITH ----
    const startsMatch = text.match(/start(?:s|ing)?\s+(?:with)\s+['"]?([a-z0-9]+)['"]?/);
    if (startsMatch) {
        const prefix = startsMatch[1];
        const a = inferAlphabet(prefix);
        return { type: 'starts-with', alphabet: a, prefix };
    }

    // ---- NOT CONTAINING ----
    const notContainMatch = text.match(/(?:not?\s+contain(?:s|ing)?|without|does\s*n'?t\s+contain)\s+['"]?([a-z0-9]+)['"]?/);
    if (notContainMatch) {
        const substring = notContainMatch[1];
        const a = inferAlphabet(substring);
        return { type: 'not-contains', alphabet: a, substring };
    }

    // ---- CONTAINS ----
    const containsMatch = text.match(/contain(?:s|ing)?\s+['"]?([a-z0-9]+)['"]?/);
    if (containsMatch) {
        const substring = containsMatch[1];
        const a = inferAlphabet(substring);
        return { type: 'contains', alphabet: a, substring };
    }

    // ---- EVEN / ODD COUNT ----
    const countMatch = text.match(/(even|odd)\s+(?:number\s+of\s+)?['"]?([a-z0-9])['"]?(?:s|'s)?/);
    if (countMatch) {
        const parity = countMatch[1]; // 'even' or 'odd'
        const symbol = countMatch[2];
        const a = inferAlphabet(symbol);
        // Make sure the tracked symbol is in the alphabet
        if (!a.includes(symbol)) a.push(symbol);
        return { type: parity + '-count', alphabet: a, symbol, parity };
    }

    // ---- LENGTH DIVISIBLE BY K ----
    const lenDivMatch = text.match(/length\s+(?:divisible|div|mod|%|multiple)\s*(?:by|=)?\s*(\d+)/);
    if (lenDivMatch) {
        const k = parseInt(lenDivMatch[1]);
        const a = alphabet || ['0', '1'];
        return { type: 'length-divisible', alphabet: a, k };
    }

    // ---- EXACTLY LENGTH K ----
    const exactLenMatch = text.match(/(?:exact(?:ly)?|of)\s+length\s+(\d+)/);
    if (exactLenMatch) {
        const k = parseInt(exactLenMatch[1]);
        const a = alphabet || ['0', '1'];
        return { type: 'exact-length', alphabet: a, k };
    }

    return null; // Unsupported
}

/**
 * generateNFA(pattern) — Builds an NFA object from a detected pattern.
 * Returns: { states, alphabet, start, accept, delta, hasEpsilon }
 */
function generateNFA(pattern) {
    switch (pattern.type) {
        case 'ends-with': return buildEndsWithNFA(pattern);
        case 'starts-with': return buildStartsWithNFA(pattern);
        case 'contains': return buildContainsNFA(pattern);
        case 'not-contains': return buildNotContainsNFA(pattern);
        case 'even-count': return buildParityNFA(pattern, 'even');
        case 'odd-count': return buildParityNFA(pattern, 'odd');
        case 'length-divisible': return buildLengthDivNFA(pattern);
        case 'exact-length': return buildExactLengthNFA(pattern);
        case 'start-end': return buildStartEndNFA(pattern);
        default: throw new Error(`Unsupported pattern type: ${pattern.type}`);
    }
}

// ---------- NFA Builders ----------

function buildEndsWithNFA(pattern) {
    const { alphabet, suffix } = pattern;
    const n = suffix.length;
    const states = [];
    for (let i = 0; i <= n; i++) states.push(`q${i}`);
    const start = 'q0';
    const accept = [`q${n}`];

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    // q0 loops on all symbols (nondeterministically stays at q0)
    alphabet.forEach(a => delta['q0'][a].add('q0'));

    // q0 on suffix[0] also goes to q1, q1 on suffix[1] to q2, etc.
    for (let i = 0; i < n; i++) {
        const sym = suffix[i];
        delta[`q${i}`][sym].add(`q${i + 1}`);
    }

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildStartsWithNFA(pattern) {
    const { alphabet, prefix } = pattern;
    const n = prefix.length;
    const states = [];
    for (let i = 0; i <= n; i++) states.push(`q${i}`);
    const start = 'q0';
    const accept = [`q${n}`];

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    // Chain: q0 --prefix[0]--> q1 --prefix[1]--> ... --> qn
    for (let i = 0; i < n; i++) {
        delta[`q${i}`][prefix[i]].add(`q${i + 1}`);
    }

    // qn loops on all symbols (accept anything after prefix)
    alphabet.forEach(a => delta[`q${n}`][a].add(`q${n}`));

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildContainsNFA(pattern) {
    const { alphabet, substring } = pattern;
    const n = substring.length;
    const states = [];
    for (let i = 0; i <= n; i++) states.push(`q${i}`);
    const start = 'q0';
    const accept = [`q${n}`];

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    // q0 loops on everything
    alphabet.forEach(a => delta['q0'][a].add('q0'));

    // Chain through substring
    for (let i = 0; i < n; i++) {
        delta[`q${i}`][substring[i]].add(`q${i + 1}`);
    }

    // qn (accepting) loops on everything
    alphabet.forEach(a => delta[`q${n}`][a].add(`q${n}`));

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildNotContainsNFA(pattern) {
    // Build a DFA (which is also an NFA) that rejects strings containing the substring.
    // Uses the KMP-like failure function approach.
    const { alphabet, substring } = pattern;
    const n = substring.length;
    const states = [];
    for (let i = 0; i <= n; i++) states.push(`q${i}`);
    const start = 'q0';
    // Accept states = all states EXCEPT qn (the state reached after seeing the full substring)
    const accept = states.filter(s => s !== `q${n}`);

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    // Build failure function for KMP
    const fail = new Array(n).fill(0);
    let k = 0;
    for (let i = 1; i < n; i++) {
        while (k > 0 && substring[k] !== substring[i]) k = fail[k - 1];
        if (substring[k] === substring[i]) k++;
        fail[i] = k;
    }

    // Build transitions for states q0..q(n-1)
    for (let state = 0; state < n; state++) {
        for (const sym of alphabet) {
            let next = state;
            while (next > 0 && substring[next] !== sym) next = fail[next - 1];
            if (substring[next] === sym) next++;
            delta[`q${state}`][sym].add(`q${next}`);
        }
    }

    // qn is a trap/dead state — loops on everything
    alphabet.forEach(a => delta[`q${n}`][a].add(`q${n}`));

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildParityNFA(pattern, parity) {
    const { alphabet, symbol } = pattern;
    // Two states: q0 = even count seen, q1 = odd count seen
    const states = ['q0', 'q1'];
    const start = 'q0';
    const accept = parity === 'even' ? ['q0'] : ['q1'];

    const delta = {
        'q0': {},
        'q1': {},
    };
    alphabet.forEach(a => {
        delta['q0'][a] = new Set();
        delta['q1'][a] = new Set();
    });

    // On the tracked symbol, toggle state
    delta['q0'][symbol].add('q1');
    delta['q1'][symbol].add('q0');

    // On other symbols, stay
    alphabet.forEach(a => {
        if (a !== symbol) {
            delta['q0'][a].add('q0');
            delta['q1'][a].add('q1');
        }
    });

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildLengthDivNFA(pattern) {
    const { alphabet, k } = pattern;
    if (k < 1 || k > 20) throw new Error('k must be between 1 and 20');

    const states = [];
    for (let i = 0; i < k; i++) states.push(`q${i}`);
    const start = 'q0';
    const accept = ['q0']; // length ≡ 0 mod k

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    // On any symbol, advance state mod k
    for (let i = 0; i < k; i++) {
        const next = (i + 1) % k;
        alphabet.forEach(a => delta[`q${i}`][a].add(`q${next}`));
    }

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildExactLengthNFA(pattern) {
    const { alphabet, k } = pattern;
    if (k < 0 || k > 30) throw new Error('k must be between 0 and 30');

    const states = [];
    for (let i = 0; i <= k; i++) states.push(`q${i}`);
    const start = 'q0';
    const accept = [`q${k}`];

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
    });

    for (let i = 0; i < k; i++) {
        alphabet.forEach(a => delta[`q${i}`][a].add(`q${i + 1}`));
    }
    // qk is dead — no transitions (strings longer than k rejected)

    return { states, alphabet, start, accept, delta, hasEpsilon: false };
}

function buildStartEndNFA(pattern) {
    // NFA for strings starting with prefix AND ending with suffix
    // Uses epsilon transitions to combine prefix and suffix machines
    const { alphabet, prefix, suffix } = pattern;
    const pLen = prefix.length;
    const sLen = suffix.length;

    // States: p0..p(pLen) for prefix, s0..s(sLen) for suffix
    const states = [];
    for (let i = 0; i <= pLen; i++) states.push(`p${i}`);
    for (let i = 0; i <= sLen; i++) states.push(`s${i}`);
    const start = 'p0';
    const accept = [`s${sLen}`];

    const delta = {};
    states.forEach(s => {
        delta[s] = {};
        alphabet.forEach(a => delta[s][a] = new Set());
        delta[s]['ε'] = new Set();
    });

    // Prefix chain
    for (let i = 0; i < pLen; i++) {
        delta[`p${i}`][prefix[i]].add(`p${i + 1}`);
    }

    // Epsilon from end of prefix to start of suffix tracker
    delta[`p${pLen}`]['ε'].add('s0');

    // p(pLen) also loops on all symbols to consume middle
    alphabet.forEach(a => delta[`p${pLen}`][a].add(`p${pLen}`));

    // Suffix NFA
    alphabet.forEach(a => delta['s0'][a].add('s0'));
    for (let i = 0; i < sLen; i++) {
        delta[`s${i}`][suffix[i]].add(`s${i + 1}`);
    }

    return { states, alphabet, start, accept, delta, hasEpsilon: true };
}


// ==================== REGEX TO NFA (Thompson Construction) ====================

/**
 * Tokenize a regex string.
 * Supported: literal chars, +, *, (, ), ε/e
 */
function tokenizeRegex(regexStr) {
    const tokens = [];
    let i = 0;
    while (i < regexStr.length) {
        const ch = regexStr[i];
        if (ch === '(' || ch === ')' || ch === '+' || ch === '*') {
            tokens.push({ type: ch });
        } else if (ch === 'ε' || (ch === 'e' && (i === 0 || '(+'.includes(regexStr[i-1])) && (i === regexStr.length-1 || ')+*'.includes(regexStr[i+1])))) {
            tokens.push({ type: 'epsilon' });
        } else if (/[a-zA-Z0-9]/.test(ch)) {
            tokens.push({ type: 'literal', value: ch });
        } else if (ch === ' ' || ch === '\t') {
            // skip whitespace
        } else {
            throw new Error(`Unexpected character in regex: "${ch}"`);
        }
        i++;
    }
    return tokens;
}

/**
 * Parse tokens into an AST.
 * Grammar:
 *   expr     → term ('+' term)*
 *   term     → factor factor*
 *   factor   → base '*'*
 *   base     → literal | epsilon | '(' expr ')'
 */
function parseRegexTokens(tokens) {
    let pos = 0;

    function peek() { return pos < tokens.length ? tokens[pos] : null; }
    function advance() { return tokens[pos++]; }

    function parseExpr() {
        let node = parseTerm();
        while (peek() && peek().type === '+') {
            advance(); // consume '+'
            const right = parseTerm();
            node = { type: 'union', left: node, right };
        }
        return node;
    }

    function parseTerm() {
        let node = parseFactor();
        // Concatenation: next is a literal, epsilon, or '('
        while (peek() && (peek().type === 'literal' || peek().type === 'epsilon' || peek().type === '(')) {
            const right = parseFactor();
            node = { type: 'concat', left: node, right };
        }
        return node;
    }

    function parseFactor() {
        let node = parseBase();
        while (peek() && peek().type === '*') {
            advance(); // consume '*'
            node = { type: 'star', child: node };
        }
        return node;
    }

    function parseBase() {
        const t = peek();
        if (!t) throw new Error('Unexpected end of regex');
        if (t.type === 'literal') {
            advance();
            return { type: 'literal', value: t.value };
        }
        if (t.type === 'epsilon') {
            advance();
            return { type: 'epsilon' };
        }
        if (t.type === '(') {
            advance(); // consume '('
            const node = parseExpr();
            if (!peek() || peek().type !== ')') throw new Error('Missing closing parenthesis');
            advance(); // consume ')'
            return node;
        }
        throw new Error(`Unexpected token: "${t.type}"`);
    }

    const ast = parseExpr();
    if (pos < tokens.length) throw new Error(`Unexpected token after regex end: "${tokens[pos].type}"`);
    return ast;
}

/**
 * Thompson's construction: AST → ε-NFA
 * Returns { states, alphabet, start, accept, delta, hasEpsilon }
 */
function thompsonConstruction(ast) {
    let stateCounter = 0;
    const alphabetSet = new Set();

    function newState() { return `q${stateCounter++}`; }

    // Each sub-NFA has: { start, accept } (single accept state)
    // We build delta incrementally
    const allDelta = {};
    function ensureState(s) {
        if (!allDelta[s]) allDelta[s] = {};
    }
    function addTransition(from, sym, to) {
        ensureState(from);
        if (!allDelta[from][sym]) allDelta[from][sym] = new Set();
        allDelta[from][sym].add(to);
    }

    function build(node) {
        switch (node.type) {
            case 'literal': {
                const s = newState();
                const e = newState();
                ensureState(s);
                ensureState(e);
                alphabetSet.add(node.value);
                addTransition(s, node.value, e);
                return { start: s, accept: e };
            }
            case 'epsilon': {
                const s = newState();
                const e = newState();
                ensureState(s);
                ensureState(e);
                addTransition(s, 'ε', e);
                return { start: s, accept: e };
            }
            case 'concat': {
                const left = build(node.left);
                const right = build(node.right);
                addTransition(left.accept, 'ε', right.start);
                return { start: left.start, accept: right.accept };
            }
            case 'union': {
                const s = newState();
                const e = newState();
                ensureState(s);
                ensureState(e);
                const left = build(node.left);
                const right = build(node.right);
                addTransition(s, 'ε', left.start);
                addTransition(s, 'ε', right.start);
                addTransition(left.accept, 'ε', e);
                addTransition(right.accept, 'ε', e);
                return { start: s, accept: e };
            }
            case 'star': {
                const s = newState();
                const e = newState();
                ensureState(s);
                ensureState(e);
                const child = build(node.child);
                addTransition(s, 'ε', child.start);
                addTransition(s, 'ε', e);
                addTransition(child.accept, 'ε', child.start);
                addTransition(child.accept, 'ε', e);
                return { start: s, accept: e };
            }
            default:
                throw new Error(`Unknown AST node type: ${node.type}`);
        }
    }

    const result = build(ast);
    const alphabet = [...alphabetSet].sort();
    const states = Object.keys(allDelta).sort((a, b) => {
        const na = parseInt(a.replace('q', ''));
        const nb = parseInt(b.replace('q', ''));
        return na - nb;
    });

    // Ensure all states have entries for all symbols + ε
    const fullDelta = {};
    states.forEach(s => {
        fullDelta[s] = {};
        alphabet.forEach(a => fullDelta[s][a] = allDelta[s]?.[a] || new Set());
        fullDelta[s]['ε'] = allDelta[s]?.['ε'] || new Set();
    });

    return {
        states,
        alphabet,
        start: result.start,
        accept: [result.accept],
        delta: fullDelta,
        hasEpsilon: true,
    };
}

function regexToNFA(regexStr) {
    const tokens = tokenizeRegex(regexStr);
    const ast = parseRegexTokens(tokens);
    return thompsonConstruction(ast);
}


// ==================== LANGUAGE UI INTEGRATION ====================

// Mode toggle
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        document.getElementById('lang-natural-panel').classList.toggle('hidden', mode !== 'natural');
        document.getElementById('lang-regex-panel').classList.toggle('hidden', mode !== 'regex');
    });
});

// Example chips — natural language
document.querySelectorAll('.lang-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        document.getElementById('lang-input').value = chip.dataset.example;
    });
});

// Example chips — regex
document.querySelectorAll('.regex-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.regex-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        document.getElementById('regex-input').value = chip.dataset.regex;
    });
});

// Display detected pattern info
function displayPatternInfo(pattern) {
    const grid = document.getElementById('lang-result-grid');
    grid.style.display = 'grid';

    const typeEl = document.getElementById('pattern-type');
    const detailsEl = document.getElementById('pattern-details');

    const typeLabels = {
        'ends-with': 'Ends With',
        'starts-with': 'Starts With',
        'contains': 'Contains Substring',
        'not-contains': 'Does Not Contain',
        'even-count': 'Even Count',
        'odd-count': 'Odd Count',
        'length-divisible': 'Length Divisible',
        'exact-length': 'Exact Length',
        'start-end': 'Starts & Ends With',
        'regex': 'Regular Expression',
    };

    typeEl.innerHTML = `<span class="pt-badge">${typeLabels[pattern.type] || pattern.type}</span>`;

    let detailRows = `<div class="pd-row"><span class="pd-label">Alphabet</span><span class="pd-value">{${pattern.alphabet.join(', ')}}</span></div>`;

    if (pattern.suffix) detailRows += `<div class="pd-row"><span class="pd-label">Suffix</span><span class="pd-value">${pattern.suffix}</span></div>`;
    if (pattern.prefix) detailRows += `<div class="pd-row"><span class="pd-label">Prefix</span><span class="pd-value">${pattern.prefix}</span></div>`;
    if (pattern.substring) detailRows += `<div class="pd-row"><span class="pd-label">Substr</span><span class="pd-value">${pattern.substring}</span></div>`;
    if (pattern.symbol) detailRows += `<div class="pd-row"><span class="pd-label">Symbol</span><span class="pd-value">${pattern.symbol}</span></div>`;
    if (pattern.parity) detailRows += `<div class="pd-row"><span class="pd-label">Parity</span><span class="pd-value">${pattern.parity}</span></div>`;
    if (pattern.k) detailRows += `<div class="pd-row"><span class="pd-label">K</span><span class="pd-value">${pattern.k}</span></div>`;
    if (pattern.regex) detailRows += `<div class="pd-row"><span class="pd-label">Regex</span><span class="pd-value">${pattern.regex}</span></div>`;

    detailsEl.innerHTML = detailRows;
}

function displayNFASummary(nfa) {
    const grid = document.getElementById('nfa-summary-grid');
    grid.innerHTML = `
        <div class="nfa-s-item">
            <div class="nfa-s-label">States</div>
            <div class="nfa-s-value">${nfa.states.length} — {${nfa.states.join(', ')}}</div>
        </div>
        <div class="nfa-s-item">
            <div class="nfa-s-label">Alphabet</div>
            <div class="nfa-s-value">{${nfa.alphabet.join(', ')}}</div>
        </div>
        <div class="nfa-s-item">
            <div class="nfa-s-label">Start</div>
            <div class="nfa-s-value">${nfa.start}</div>
        </div>
        <div class="nfa-s-item">
            <div class="nfa-s-label">Accept</div>
            <div class="nfa-s-value">{${nfa.accept.join(', ')}}</div>
        </div>
        <div class="nfa-s-item" style="grid-column: 1 / -1">
            <div class="nfa-s-label">ε-Transitions</div>
            <div class="nfa-s-value">${nfa.hasEpsilon ? 'Yes' : 'No'}</div>
        </div>
    `;
}

/**
 * Populates the manual Define NFA form with a generated NFA object,
 * so the user can also see/edit it in the manual tab.
 */
function populateManualForm(nfa) {
    statesInput.value = nfa.states.join(', ');
    alphabetInput.value = nfa.alphabet.join(', ');
    epsilonCheckbox.checked = nfa.hasEpsilon;
    document.getElementById('input-accept').value = nfa.accept.join(', ');
    syncStartSelect();
    startSelect.value = nfa.start;

    // Rebuild transition rows
    transitionTbody.innerHTML = '';
    updateTransitionSelects();
    nfa.states.forEach(from => {
        const syms = [...nfa.alphabet];
        if (nfa.hasEpsilon) syms.push('ε');
        syms.forEach(sym => {
            if (nfa.delta[from] && nfa.delta[from][sym] && nfa.delta[from][sym].size > 0) {
                addTransitionRow(from, sym, [...nfa.delta[from][sym]].join(', '));
            }
        });
    });
}

// Generate & Convert button
document.getElementById('btn-generate').addEventListener('click', () => {
    try {
        const isRegexMode = document.getElementById('mode-regex').classList.contains('active');
        let nfa;
        let pattern;

        if (isRegexMode) {
            const regexStr = document.getElementById('regex-input').value.trim();
            if (!regexStr) throw new Error('Please enter a regular expression.');
            nfa = regexToNFA(regexStr);
            pattern = { type: 'regex', alphabet: nfa.alphabet, regex: regexStr };
        } else {
            const langInput = document.getElementById('lang-input').value.trim();
            if (!langInput) throw new Error('Please enter a language description.');
            pattern = detectPattern(langInput);
            if (!pattern) throw new Error('Could not understand the language description. Try using patterns like "ending with", "starting with", "containing", "even/odd number of", or "length divisible by".');
            nfa = generateNFA(pattern);
        }

        // Display pattern info and NFA summary
        displayPatternInfo(pattern);
        displayNFASummary(nfa);

        // Set into AppState
        AppState.nfa = nfa;

        // Also populate the manual form so the user can review/edit
        populateManualForm(nfa);

        // Run subset construction
        const result = subsetConstruction(nfa);
        AppState.dfa = result;
        AppState.steps = result.steps;
        AppState.currentStep = -1;

        // Build step UI and DFA table
        buildStepsUI(result.steps);
        buildDFATable(result);

        showToast('NFA generated & converted to DFA! Check Algorithm & Visualize tabs.', 'success');

        // Auto-navigate to algorithm tab after a brief pause
        setTimeout(() => {
            document.querySelector('[data-section="algorithm"]').click();
        }, 800);

    } catch (e) {
        showToast(e.message, 'error');
    }
});


// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
    if (AppState.nfaGraph) {
        AppState.nfaGraph.setupCanvas();
        AppState.nfaGraph.draw();
    }
    if (AppState.dfaGraph) {
        AppState.dfaGraph.setupCanvas();
        AppState.dfaGraph.draw();
    }
});

// ==================== INITIAL SETUP ====================
syncStartSelect();
updateTransitionSelects();

