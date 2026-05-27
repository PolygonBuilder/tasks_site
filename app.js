/**
 * CHRONOS: WEEKLY PRODUCTIVITY PLANNER
 * Core Client-side Script
 * TODO: 
 */

// ==========================================================================
// STATE MANAGEMENT & LOCALSTORAGE
// ==========================================================================
let tasks = [];
let habits = [];
let history = [];
let notes = '';
let settings = {
    soundEnabled: true,
    theme: 'dark'
};
let skippedDays = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false
};

// Default Habits to populate if storage is empty
const defaultHabits = [];

// Initialize Data
function initData() {
    const savedTasks = localStorage.getItem('chronos_tasks');
    const savedHabits = localStorage.getItem('chronos_habits');
    const savedHistory = localStorage.getItem('chronos_history');
    const savedNotes = localStorage.getItem('chronos_notes');
    const savedSettings = localStorage.getItem('chronos_settings');
    const savedSkippedDays = localStorage.getItem('chronos_skipped_days');

    // Tasks load
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    } else {
        tasks = [];
        saveToStorage();
    }

    // Habits load
    if (savedHabits) {
        habits = JSON.parse(savedHabits);
    } else {
        habits = defaultHabits;
        saveHabitsToStorage();
    }

    // History load
    if (savedHistory) {
        history = JSON.parse(savedHistory);
    } else {
        history = [];
        saveHistoryToStorage();
    }

    // Notes load
    if (savedNotes !== null) {
        notes = savedNotes;
    } else {
        notes = '';
    }

    // Settings load
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        // Match system dark/light preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            settings.theme = 'light';
        }
        saveSettingsToStorage();
    }

    // Skipped days load
    if (savedSkippedDays) {
        skippedDays = JSON.parse(savedSkippedDays);
    } else {
        saveSkippedDaysToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem('chronos_tasks', JSON.stringify(tasks));
}

function saveHabitsToStorage() {
    localStorage.setItem('chronos_habits', JSON.stringify(habits));
}

function saveHistoryToStorage() {
    localStorage.setItem('chronos_history', JSON.stringify(history));
}

function saveNotesToStorage() {
    localStorage.setItem('chronos_notes', notes);
}

function saveSettingsToStorage() {
    localStorage.setItem('chronos_settings', JSON.stringify(settings));
}

function saveSkippedDaysToStorage() {
    localStorage.setItem('chronos_skipped_days', JSON.stringify(skippedDays));
}


// ==========================================================================
// AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Synthesizes a beautiful chime using simple oscillators
 */
function playSound(type) {
    if (!settings.soundEnabled) return;

    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        if (type === 'success') {
            // Ascending major chord highlight (C5 -> E5 -> G5 -> C6)
            const notesList = [523.25, 659.25, 783.99, 1046.50];
            notesList.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.4);
            });
        } else if (type === 'click') {
            // Soft wood-click sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'delete') {
            // Light swoosh/descending chime
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.18);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        }
    } catch (e) {
        console.warn('Audio Synthesis failed:', e);
    }
}


// ==========================================================================
// INTERACTIVE DOM RENDERING & DRAG-AND-DROP
// ==========================================================================

// Get actual calendar dates for the week
function renderDates() {
    const today = new Date();
    const currentDayNum = today.getDay(); // 0: Sun, 1: Mon, etc.
    const dayIndex = currentDayNum === 0 ? 6 : currentDayNum - 1; // Mon: 0, Sun: 6

    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach((day, index) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + index);

        // Format date string (e.g. "May 26")
        const formatted = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const column = document.querySelector(`.day-column[data-day="${day}"]`);
        const label = column.querySelector('.day-date-label');
        if (label) label.textContent = formatted;

        // Visual indicator of current day
        if (index === dayIndex) {
            column.classList.add('current-day');
        } else {
            column.classList.remove('current-day');
        }
    });
}

function getWeekRangeString() {
    const today = new Date();
    const currentDayNum = today.getDay();
    const dayIndex = currentDayNum === 0 ? 6 : currentDayNum - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - dayIndex);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatOption = { month: 'short', day: 'numeric' };
    const monStr = monday.toLocaleDateString('en-US', formatOption);
    const sunStr = sunday.toLocaleDateString('en-US', formatOption);
    const yearStr = sunday.getFullYear();

    return `${monStr} – ${sunStr}, ${yearStr}`;
}

/**
 * Creates dynamic particles when checkbox is triggered
 */
function createExplosion(x, y) {
    const colors = ['#00f2fe', '#8f43ff', '#ff007f', '#ff9f43', '#00d2fc'];
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';

        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.backgroundColor = color;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        // Calculate random destination angles & distances
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        particle.style.setProperty('--dx', `${dx}px`);
        particle.style.setProperty('--dy', `${dy}px`);

        document.body.appendChild(particle);

        // Remove element from DOM after animation completes
        setTimeout(() => {
            particle.remove();
        }, 800);
    }
}

// Global Filter values
let searchFilter = '';
let priorityFilter = 'all';
let statusFilter = 'all';

/**
 * Renders tasks to their corresponding day lists
 */
function renderBoard() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
        const listContainer = document.getElementById(`list-${day}`);
        if (!listContainer) return;

        // Apply visual skipped column state & button text/classes
        const column = document.querySelector(`.day-column[data-day="${day}"]`);
        if (column) {
            if (skippedDays[day]) {
                column.classList.add('skipped');
            } else {
                column.classList.remove('skipped');
            }

            const skipBtn = column.querySelector('.skip-day-btn');
            if (skipBtn) {
                if (skippedDays[day]) {
                    skipBtn.classList.add('active');
                    skipBtn.innerHTML = '<i data-lucide="coffee"></i> <span>Resume Day</span>';
                } else {
                    skipBtn.classList.remove('active');
                    skipBtn.innerHTML = '<i data-lucide="coffee"></i> <span>Skip Day</span>';
                }
            }
        }

        // Filter tasks for this specific day
        const dayTasks = tasks.filter(task => {
            if (task.day !== day) return false;

            // Search Filter
            if (searchFilter && !task.title.toLowerCase().includes(searchFilter) && !task.notes.toLowerCase().includes(searchFilter)) {
                return false;
            }

            // Priority Filter
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
                return false;
            }

            // Status Filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'completed' && !task.completed) return false;
                if (statusFilter === 'active' && task.completed) return false;
            }

            return true;
        });

        // Update column badge counter
        const totalDayTasks = tasks.filter(t => t.day === day);
        const doneDayTasks = totalDayTasks.filter(t => t.completed);
        const badge = document.getElementById(`badge-${day}`);
        if (badge) {
            if (skippedDays[day]) {
                badge.textContent = 'Skipped';
            } else {
                badge.textContent = `${doneDayTasks.length}/${totalDayTasks.length}`;
            }
        }

        // Clear existing list elements
        listContainer.innerHTML = '';

        if (skippedDays[day]) {
            listContainer.innerHTML = `
                <div class="skipped-overlay">
                    <i data-lucide="coffee"></i>
                    <span>Rest Day</span>
                    <p>Tasks are bypassed and do not count for your stats.</p>
                </div>
            `;
            return;
        }

        if (dayTasks.length === 0) {
            // Render beautiful empty state
            const emptyEl = document.createElement('div');
            emptyEl.className = 'column-empty-state';
            emptyEl.innerHTML = `
                <i data-lucide="inbox"></i>
                <p>No tasks scheduled</p>
            `;
            listContainer.appendChild(emptyEl);
        } else {
            // Render Task Cards
            dayTasks.forEach(task => {
                const card = document.createElement('div');
                card.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
                card.setAttribute('draggable', 'true');
                card.setAttribute('data-id', task.id);

                card.innerHTML = `
                    <div class="task-card-header">
                        <div class="custom-checkbox tooltip" data-tooltip="${task.completed ? 'Mark Active' : 'Mark Complete'}" onclick="toggleTaskCompletion('${task.id}', event)">
                            <i data-lucide="check"></i>
                        </div>
                        <span class="task-title">${escapeHTML(task.title)}</span>
                        <div class="task-actions">
                            <button class="card-action-btn tooltip" data-tooltip="Edit Task" onclick="openEditModal('${task.id}', event)">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="card-action-btn btn-delete tooltip" data-tooltip="Delete Task" onclick="deleteTask('${task.id}', event)">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    ${task.notes ? `<p class="task-details">${escapeHTML(task.notes)}</p>` : ''}
                    ${task.reward ? `
                    <div class="task-card-reward-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #ff007f; background: rgba(255, 0, 127, 0.08); border: 1px solid rgba(255, 0, 127, 0.15); padding: 3px 8px; border-radius: 4px; margin-top: 4px; align-self: flex-start; max-width: 100%;">
                        <i data-lucide="gift" style="width: 11px; height: 11px; flex-shrink: 0;"></i>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(task.reward)}</span>
                    </div>
                    ` : ''}
                    ${task.link ? `
                    <a href="${escapeHTML(task.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="task-card-link-badge" style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #00f2fe; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.15); padding: 3px 8px; border-radius: 4px; margin-top: 4px; align-self: flex-start; max-width: 100%; text-decoration: none; transition: var(--transition-quick);">
                        <i data-lucide="link" style="width: 11px; height: 11px; flex-shrink: 0;"></i>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Open Link</span>
                    </a>
                    ` : ''}
                    <div class="task-card-footer">
                        <span class="priority-badge ${task.priority}">${task.priority}</span>
                    </div>
                `;

                // Wire up drag events
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);

                listContainer.appendChild(card);
            });
        }
    });

    // Refresh lucide icons for dynamically added cards
    lucide.createIcons();

    // Recalculate metrics
    renderAnalytics();

    // Render the Today's Focus Objectives section
    renderTodayFocus();
}

/**
 * Renders the large "Today's Focus Objectives" panel at the top of the board
 */
function renderTodayFocus() {
    const list = document.getElementById('today-focus-list');
    const badge = document.getElementById('today-progress-badge');
    if (!list) return;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayName = dayNames[new Date().getDay()];

    if (skippedDays[todayDayName]) {
        if (badge) {
            badge.textContent = 'Skipped';
        }
        list.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; color: var(--priority-medium); font-size: 14px; font-weight: 700; text-align: center; border: 1px dashed rgba(255, 159, 67, 0.25); border-radius: var(--radius-md); background: rgba(255, 159, 67, 0.03); width: 100%;">
                <i data-lucide="coffee" style="width: 28px; height: 28px; color: var(--priority-medium); filter: drop-shadow(0 0 6px rgba(255, 159, 67, 0.4)); animation: pulseGlow 3s infinite ease-in-out;"></i>
                <span style="max-width: 500px; text-transform: uppercase; letter-spacing: 0.5px;">Today is marked as a rest day!</span>
                <p style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px;">Your tasks for today are skipped and will not count towards your metrics.</p>
                <button class="primary-btn tooltip" data-tooltip="Resume focus on today's tasks" onclick="toggleSkipDay('${todayDayName}', event)" style="margin-top: 4px; padding: 8px 16px; font-size: 11px; height: 32px; background: rgba(255, 159, 67, 0.15); border: 1px solid rgba(255, 159, 67, 0.3); color: var(--priority-medium); box-shadow: none;">
                    <i data-lucide="play" style="width: 13px; height: 13px;"></i> Resume Today
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Filter tasks scheduled for today
    const todayTasks = tasks.filter(t => t.day === todayDayName);

    // Apply standard search and status filters to maintain real-time sync with user controls
    const filteredTodayTasks = todayTasks.filter(task => {
        // Search Filter
        if (searchFilter && !task.title.toLowerCase().includes(searchFilter) && !task.notes.toLowerCase().includes(searchFilter)) {
            return false;
        }

        // Priority Filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
            return false;
        }

        // Status Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'completed' && !task.completed) return false;
            if (statusFilter === 'active' && task.completed) return false;
        }

        return true;
    });

    const completedToday = todayTasks.filter(t => t.completed).length;

    if (badge) {
        badge.textContent = `${completedToday}/${todayTasks.length} Complete`;
    }

    list.innerHTML = '';

    if (filteredTodayTasks.length === 0) {
        let msg = '';
        let showAddBtn = false;
        if (todayTasks.length === 0) {
            msg = 'Your schedule is clear for today! Take a break, check your habits, or plan ahead.';
            showAddBtn = true;
        } else {
            msg = 'No matching tasks for today found under the current filters.';
        }
        list.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 30px; color: var(--text-muted); font-size: 13px; font-weight: 600; text-align: center; border: 1px dashed rgba(255,255,255,0.04); border-radius: var(--radius-md); background: rgba(0,0,0,0.05); width: 100%;">
                <i data-lucide="smile" style="width: 22px; height: 22px; opacity: 0.8; color: var(--accent-secondary);"></i>
                <span style="max-width: 500px; line-height: 1.5;">${msg}</span>
                ${showAddBtn ? `
                <button class="primary-btn tooltip" data-tooltip="Add task for today" onclick="openAddModal('${todayDayName}')" style="margin-top: 8px; padding: 8px 16px; font-size: 11px; height: 32px; background: rgba(0, 242, 254, 0.12); border: 1px solid rgba(0, 242, 254, 0.25); color: var(--accent-secondary); box-shadow: none;">
                    <i data-lucide="plus" style="width: 13px; height: 13px;"></i> Add Task for Today
                </button>
                ` : ''}
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filteredTodayTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `today-focus-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        card.setAttribute('data-id', task.id);

        card.innerHTML = `
            <div class="task-card-header">
                <div class="custom-checkbox tooltip" data-tooltip="${task.completed ? 'Mark Active' : 'Mark Complete'}" onclick="toggleTaskCompletion('${task.id}', event)">
                    <i data-lucide="check"></i>
                </div>
                <span class="task-title">${escapeHTML(task.title)}</span>
                <div class="task-actions">
                    <button class="card-action-btn tooltip" data-tooltip="Edit Task" onclick="openEditModal('${task.id}', event)">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="card-action-btn btn-delete tooltip" data-tooltip="Delete Task" onclick="deleteTask('${task.id}', event)">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            ${task.notes ? `<p class="task-details">${escapeHTML(task.notes)}</p>` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-left: 28px; margin-top: 2px;">
                ${task.reward ? `
                <div class="today-focus-reward-badge">
                    <i data-lucide="gift" style="width: 12px; height: 12px; flex-shrink: 0;"></i>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">${escapeHTML(task.reward)}</span>
                </div>
                ` : ''}
                ${task.link ? `
                <a href="${escapeHTML(task.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="today-focus-link-badge">
                    <i data-lucide="link" style="width: 12px; height: 12px; flex-shrink: 0;"></i>
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Open Link</span>
                </a>
                ` : ''}
            </div>
            <div class="task-card-footer">
                <span class="priority-badge ${task.priority}">${task.priority}</span>
            </div>
        `;

        list.appendChild(card);
    });

    lucide.createIcons();
}

// Safe escape HTML function
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ==========================================================================
// DRAG AND DROP EVENTS
// ==========================================================================
let draggedTaskId = null;

function handleDragStart(e) {
    draggedTaskId = this.getAttribute('data-id');
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTaskId);
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggedTaskId = null;

    // Clean up any remaining drop indicators
    document.querySelectorAll('.task-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

function setupDragAndDrop() {
    const columns = document.querySelectorAll('.task-list');

    columns.forEach(column => {
        column.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.add('drag-over');
        });

        column.addEventListener('dragleave', function () {
            this.classList.remove('drag-over');
        });

        column.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
            const targetDay = this.getAttribute('data-day');

            if (id && targetDay) {
                const taskIndex = tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1 && tasks[taskIndex].day !== targetDay) {
                    tasks[taskIndex].day = targetDay;
                    saveToStorage();
                    playSound('click');
                    renderBoard();
                }
            }
        });
    });
}


// ==========================================================================
// TASK OPERATIONS (CRUD)
// ==========================================================================

window.toggleSkipDay = function (day, event) {
    if (event) event.stopPropagation();
    skippedDays[day] = !skippedDays[day];
    saveSkippedDaysToStorage();
    playSound('click');

    // Play particle fireworks if unskipping (so it feels great to resume)
    if (!skippedDays[day] && event && event.clientX && event.clientY) {
        createExplosion(event.clientX, event.clientY);
    }

    renderBoard();
};

window.toggleTaskCompletion = function (id, event) {
    event.stopPropagation();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveToStorage();

        if (tasks[taskIndex].completed) {
            playSound('success');
            // Core coordinate for particle explosion
            if (event.clientX && event.clientY) {
                createExplosion(event.clientX, event.clientY);
            }

            // Reward Unlocked modal trigger
            const task = tasks[taskIndex];
            if (task.reward && task.reward.trim()) {
                setTimeout(() => {
                    const rewardModal = document.getElementById('reward-modal');
                    const rewardModalTaskTitle = document.getElementById('reward-modal-task-title');
                    const rewardModalText = document.getElementById('reward-modal-text');

                    if (rewardModal && rewardModalTaskTitle && rewardModalText) {
                        rewardModalTaskTitle.textContent = `For completing: "${task.title}"`;
                        rewardModalText.textContent = task.reward;
                        rewardModal.classList.add('active');
                        playSound('success');

                        // Burst particles right over the unlocked reward popup
                        const rect = rewardModal.getBoundingClientRect();
                        createExplosion(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }
                }, 350);
            }
        } else {
            playSound('click');
        }

        renderBoard();
    }
};

window.deleteTask = function (id, event) {
    event.stopPropagation();
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
        const hasGroup = taskToDelete.groupId && tasks.some(t => t.groupId === taskToDelete.groupId && t.id !== id);
        const hasSameTitle = tasks.some(t => t.title.toLowerCase() === taskToDelete.title.toLowerCase() && t.id !== id);

        if (hasGroup || hasSameTitle) {
            const deleteConfirm = confirm(`Would you like to delete "${taskToDelete.title}" from ALL days?\n\nClick "OK" to delete from all days.\nClick "Cancel" to delete only for today.`);
            if (deleteConfirm) {
                const titleLower = taskToDelete.title.toLowerCase();
                const groupId = taskToDelete.groupId;
                tasks = tasks.filter(t => {
                    if (groupId && t.groupId === groupId) return false;
                    if (t.title.toLowerCase() === titleLower) return false;
                    return true;
                });
            } else {
                tasks = tasks.filter(t => t.id !== id);
            }
        } else {
            tasks = tasks.filter(t => t.id !== id);
        }
    } else {
        tasks = tasks.filter(t => t.id !== id);
    }
    saveToStorage();
    playSound('delete');
    renderBoard();
};

// Modal Elements
const modal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const taskDayInput = document.getElementById('task-day');
const taskDaySelectContainer = document.getElementById('modal-day-select-container');
const taskDaySelect = document.getElementById('task-day-select');
const taskTitleInput = document.getElementById('task-title-input');
const taskPriorityInput = document.getElementById('task-priority-input');
const taskDescriptionInput = document.getElementById('task-description-input');
const taskRewardInput = document.getElementById('task-reward-input');
const taskLinkInput = document.getElementById('task-link-input');
const modalSubmitBtnText = document.getElementById('submit-text');
const taskAllDaysInput = document.getElementById('task-all-days-input');
const modalAllDaysContainer = document.getElementById('modal-all-days-container');
const taskEditAllDaysInput = document.getElementById('task-edit-all-days-input');
const modalEditAllDaysContainer = document.getElementById('modal-edit-all-days-container');

// Open modal in creation mode for a specific day
function openAddModal(day, isWeekly = false) {
    playSound('click');
    if (isWeekly) {
        modalTitle.textContent = "Add Weekly Task (All Days)";
    } else {
        modalTitle.textContent = `Add Task to ${day.charAt(0).toUpperCase() + day.slice(1)}`;
    }
    modalForm.reset();

    taskIdInput.value = '';
    taskDayInput.value = day;
    taskDaySelect.value = day;
    taskDaySelectContainer.style.display = 'none'; // Hide day select since column button implies day

    if (modalAllDaysContainer) {
        modalAllDaysContainer.style.display = 'block'; // Show checkbox for adding to all days
    }
    if (modalEditAllDaysContainer) {
        modalEditAllDaysContainer.style.display = 'none'; // Hide checkbox for editing all days
    }
    if (taskAllDaysInput) {
        taskAllDaysInput.checked = isWeekly; // Auto-check checkbox if button is clicked
    }
    if (taskRewardInput) {
        taskRewardInput.value = ''; // Reset reward field
    }
    if (taskLinkInput) {
        taskLinkInput.value = ''; // Reset link field
    }
    modalSubmitBtnText.textContent = 'Add Task';

    modal.classList.add('active');
    taskTitleInput.focus();
}

// Open modal in edit mode
window.openEditModal = function (id, event) {
    event.stopPropagation();
    playSound('click');
    const task = tasks.find(t => t.id === id);
    if (task) {
        modalTitle.textContent = 'Edit Task Details';
        modalForm.reset();

        taskIdInput.value = task.id;
        taskDayInput.value = task.day;
        taskDaySelect.value = task.day;
        taskDaySelectContainer.style.display = 'flex'; // Allow changing day during editing

        if (modalAllDaysContainer) {
            modalAllDaysContainer.style.display = 'none'; // Hide checkbox during editing
        }

        if (modalEditAllDaysContainer) {
            modalEditAllDaysContainer.style.display = 'block'; // Show checkbox for editing all days
            
            // Check if there are other tasks in the same group or with the same title on other days
            const hasGroup = task.groupId && tasks.some(t => t.groupId === task.groupId && t.id !== id);
            const hasSameTitle = tasks.some(t => t.title.toLowerCase() === task.title.toLowerCase() && t.id !== id);
            
            if (taskEditAllDaysInput) {
                taskEditAllDaysInput.checked = !!(hasGroup || hasSameTitle);
            }
        }

        modalSubmitBtnText.textContent = 'Save Changes';

        taskTitleInput.value = task.title;
        taskPriorityInput.value = task.priority;
        taskDescriptionInput.value = task.notes;

        if (taskRewardInput) {
            taskRewardInput.value = task.reward || ''; // Populate reward details
        }
        if (taskLinkInput) {
            taskLinkInput.value = task.link || ''; // Populate link details
        }

        modal.classList.add('active');
        taskTitleInput.focus();
    }
};

function closeModal() {
    modal.classList.remove('active');
}

// Save or Update Form Submission
modalForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = taskIdInput.value;
    const title = taskTitleInput.value.trim();
    const priority = taskPriorityInput.value;
    const notes = taskDescriptionInput.value.trim();
    const reward = taskRewardInput ? taskRewardInput.value.trim() : '';
    const link = taskLinkInput ? taskLinkInput.value.trim() : '';

    // Determine target day depending on editing vs creation
    const day = id ? taskDaySelect.value : taskDayInput.value;

    if (!title) return;

    if (id) {
        // Edit Mode
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            const originalTask = tasks[taskIndex];
            const editAllDaysChecked = taskEditAllDaysInput && taskEditAllDaysInput.checked;

            if (editAllDaysChecked) {
                // Determine or generate a group ID
                let groupId = originalTask.groupId;
                if (!groupId) {
                    groupId = 'group_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                    originalTask.groupId = groupId;
                }

                // Find all existing linked tasks or tasks with the same original title to sync
                const matchingTasks = tasks.filter(t => 
                    (t.groupId && t.groupId === groupId) || 
                    (t.title.toLowerCase() === originalTask.title.toLowerCase())
                );

                // Update existing instances (maintaining their days)
                matchingTasks.forEach(t => {
                    t.groupId = groupId;
                    t.title = title;
                    t.priority = priority;
                    t.notes = notes;
                    t.reward = reward;
                    t.link = link;
                });

                // Ensure it exists on all 7 days since they checked "apply to all days"
                const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const existingDays = matchingTasks.map(t => t.day);
                
                daysOfWeek.forEach(d => {
                    if (!existingDays.includes(d)) {
                        const newTask = {
                            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                            groupId: groupId,
                            title,
                            day: d,
                            priority,
                            completed: false,
                            notes,
                            reward,
                            link
                        };
                        tasks.push(newTask);
                    }
                });
            } else {
                // Unique daily task: sever the link with any group and edit it in isolation
                originalTask.groupId = undefined;
                originalTask.title = title;
                originalTask.priority = priority;
                originalTask.notes = notes;
                originalTask.reward = reward;
                originalTask.link = link;
                originalTask.day = day;
            }
        }
    } else {
        // Create Mode
        const allDaysChecked = taskAllDaysInput && taskAllDaysInput.checked;
        if (allDaysChecked) {
            // Add to every day of the week
            const groupId = 'group_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            daysOfWeek.forEach(d => {
                const newTask = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    groupId: groupId,
                    title,
                    day: d,
                    priority,
                    completed: false,
                    notes,
                    reward,
                    link
                };
                tasks.push(newTask);
            });
        } else {
            // Add to single day
            const newTask = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                title,
                day,
                priority,
                completed: false,
                notes,
                reward,
                link
            };
            tasks.push(newTask);
        }
    }

    saveToStorage();
    playSound('click');
    closeModal();
    renderBoard();
});


// ==========================================================================
// HABIT TRACKER OPERATIONS
// ==========================================================================
function renderHabits() {
    const container = document.getElementById('habit-rows-container');
    if (!container) return;

    container.innerHTML = '';

    if (habits.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 40px; font-weight: 500;">
                No habits tracked yet. Click "Add Habit" to build a positive routine!
            </td>
        `;
        container.appendChild(emptyRow);
        return;
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    habits.forEach(habit => {
        const row = document.createElement('tr');
        row.className = 'habit-row';

        let rowHTML = `<td class="habit-cell-title">${escapeHTML(habit.name)}</td>`;

        days.forEach(day => {
            const isChecked = habit.history[day];
            rowHTML += `
                <td class="habit-cell-check">
                    <div class="habit-checkbox ${isChecked ? 'checked' : ''} tooltip" 
                         data-tooltip="Toggle ${day.charAt(0).toUpperCase() + day.slice(1)}" 
                         onclick="toggleHabit('${habit.id}', '${day}', event)">
                        <i data-lucide="check"></i>
                    </div>
                </td>
            `;
        });

        rowHTML += `
            <td class="habit-cell-check">
                <button class="card-action-btn btn-delete tooltip" data-tooltip="Delete Habit" onclick="deleteHabit('${habit.id}', event)">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;

        row.innerHTML = rowHTML;
        container.appendChild(row);
    });

    // Refresh dynamically loaded Lucide vector icons
    lucide.createIcons();
}

window.toggleHabit = function (habitId, day, event) {
    event.stopPropagation();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex !== -1) {
        const habit = habits[habitIndex];
        habit.history[day] = !habit.history[day];
        saveHabitsToStorage();

        if (habit.history[day]) {
            playSound('success');
            if (event.clientX && event.clientY) {
                createExplosion(event.clientX, event.clientY);
            }
        } else {
            playSound('click');
        }

        renderHabits();
    }
};

window.deleteHabit = function (habitId, event) {
    event.stopPropagation();
    habits = habits.filter(h => h.id !== habitId);
    saveHabitsToStorage();
    playSound('delete');
    renderHabits();
};


// ==========================================================================
// HISTORY ARCHIVE OPERATIONS
// ==========================================================================
function renderHistory() {
    const badge = document.getElementById('history-count-badge');
    if (badge) {
        badge.textContent = `${history.length} Weeks Saved`;
    }

    const container = document.getElementById('history-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px; font-weight: 500;">
                No archived weeks found. Click "Archive Week" on the board when you complete your plans!
            </div>
        `;
        return;
    }

    history.forEach(item => {
        const total = item.tasks.length;
        const completed = item.tasks.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.padding = '18px 24px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '14px';
        card.style.borderRadius = 'var(--radius-md)';
        card.style.border = '1px solid var(--border-color)';

        card.innerHTML = `
            <div class="history-week-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleWeekExpand('${item.id}', event)">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <i data-lucide="${item.isExpanded ? 'chevron-down' : 'chevron-right'}" style="width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0;"></i>
                    <div style="display: flex; flex-direction: column;">
                        <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHTML(item.dateRange)}</h3>
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600; margin-top: 1px;">
                            Archived on ${new Date(item.archivedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--accent-secondary);">${completed}/${total} Tasks done (${percent}%)</span>
                        <div style="width: 100px; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: var(--accent-secondary);"></div>
                        </div>
                    </div>
                    
                    <button class="card-action-btn btn-delete tooltip" data-tooltip="Delete Week" onclick="deleteHistoryWeek('${item.id}', event)" style="margin-left: 8px;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            
            <!-- Collapse task listing -->
            <div class="history-week-tasks" style="display: ${item.isExpanded ? 'flex' : 'none'}; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 4px;">
                ${renderHistoryTasks(item.tasks)}
            </div>
        `;

        container.appendChild(card);
    });

    lucide.createIcons();
}

function renderHistoryTasks(taskList) {
    if (taskList.length === 0) {
        return `<p style="font-size: 12px; color: var(--text-muted); font-style: italic;">No tasks logged this week.</p>`;
    }

    return taskList.map(task => `
        <div style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.02); border-radius: 6px;">
            <i data-lucide="${task.completed ? 'check-circle' : 'circle'}" style="width: 14px; height: 14px; color: ${task.completed ? 'var(--accent-secondary)' : 'var(--text-muted)'}; flex-shrink: 0;"></i>
            <span style="font-size: 12px; font-weight: 600; color: ${task.completed ? 'var(--text-muted)' : 'var(--text-primary)'}; text-decoration: ${task.completed ? 'line-through' : 'none'}; flex: 1;">
                ${escapeHTML(task.title)}
            </span>
            <span style="font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                ${task.day.substr(0, 3)}
            </span>
            <span class="priority-badge ${task.priority}" style="font-size: 8px; padding: 2px 6px;">
                ${task.priority}
            </span>
        </div>
    `).join('');
}

window.toggleWeekExpand = function (itemId, event) {
    event.stopPropagation();
    const itemIndex = history.findIndex(h => h.id === itemId);
    if (itemIndex !== -1) {
        history[itemIndex].isExpanded = !history[itemIndex].isExpanded;
        saveHistoryToStorage();
        playSound('click');
        renderHistory();
    }
};

window.deleteHistoryWeek = function (itemId, event) {
    event.stopPropagation();
    history = history.filter(h => h.id !== itemId);
    saveHistoryToStorage();
    playSound('delete');
    renderHistory();
};


// ==========================================================================
// ANALYTICS & INSIGHT PANEL CALCULATIONS
// ==========================================================================
function renderAnalytics() {
    // Exclude tasks belonging to skipped days from calculations
    const activeTasks = tasks.filter(t => !skippedDays[t.day]);
    const totalCount = activeTasks.length;
    const completedTasks = activeTasks.filter(t => t.completed);
    const completedCount = completedTasks.length;

    // 1. Weekly completion bar in Header
    const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const weeklyFill = document.getElementById('weekly-progress-fill');
    const weeklyPercentage = document.getElementById('weekly-percentage');
    if (weeklyFill) weeklyFill.style.width = `${completionPercent}%`;
    if (weeklyPercentage) weeklyPercentage.textContent = `${completionPercent}%`;

    // 2. Chip metrics
    const totalChip = document.getElementById('stat-total-tasks');
    const doneChip = document.getElementById('stat-done-tasks');
    const streakChip = document.getElementById('stat-streak');
    if (totalChip) totalChip.textContent = totalCount;
    if (doneChip) doneChip.textContent = completedCount;

    // Streak logic: contiguous days with all tasks completed (minimum 1 task)
    // Skipped days are bypassed and do not break the streak!
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let streakCount = 0;
    for (let i = 0; i < days.length; i++) {
        if (skippedDays[days[i]]) continue; // Bypassed
        const dayTasks = tasks.filter(t => t.day === days[i]);
        if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) {
            streakCount++;
        } else if (dayTasks.length > 0) {
            break;
        }
    }
    if (streakChip) streakChip.textContent = streakCount;

    // 3. Analytics Widget complete rate
    const statsCompleteRate = document.getElementById('stats-complete-rate');
    const statsCompleteBar = document.getElementById('stats-complete-bar');
    if (statsCompleteRate) statsCompleteRate.textContent = `${completionPercent}%`;
    if (statsCompleteBar) statsCompleteBar.style.width = `${completionPercent}%`;

    // 4. Analytics: Most productive day (only non-skipped days)
    let bestDay = '—';
    let maxDone = 0;
    days.forEach(day => {
        if (skippedDays[day]) return; // Bypassed
        const completedDayTasks = tasks.filter(t => t.day === day && t.completed).length;
        if (completedDayTasks > maxDone) {
            maxDone = completedDayTasks;
            bestDay = day.charAt(0).toUpperCase() + day.slice(1);
        }
    });
    const statsBestDay = document.getElementById('stats-best-day');
    if (statsBestDay) statsBestDay.textContent = maxDone > 0 ? bestDay : '—';

    // 5. Analytics Focus Score
    const focusScore = completedCount * 10;
    const statsFocusScore = document.getElementById('stats-focus-score');
    if (statsFocusScore) statsFocusScore.textContent = focusScore;

    // 6. Priority distribution chart (using activeTasks)
    const highCount = activeTasks.filter(t => t.priority === 'high').length;
    const medCount = activeTasks.filter(t => t.priority === 'medium').length;
    const lowCount = activeTasks.filter(t => t.priority === 'low').length;

    const highSeg = document.getElementById('dist-high');
    const medSeg = document.getElementById('dist-med');
    const lowSeg = document.getElementById('dist-low');

    const countHighLabel = document.getElementById('count-high');
    const countMedLabel = document.getElementById('count-med');
    const countLowLabel = document.getElementById('count-low');

    if (countHighLabel) countHighLabel.textContent = highCount;
    if (countMedLabel) countMedLabel.textContent = medCount;
    if (countLowLabel) countLowLabel.textContent = lowCount;

    if (totalCount > 0) {
        if (highSeg) highSeg.style.width = `${(highCount / totalCount) * 100}%`;
        if (medSeg) medSeg.style.width = `${(medCount / totalCount) * 100}%`;
        if (lowSeg) lowSeg.style.width = `${(lowCount / totalCount) * 100}%`;
    } else {
        if (highSeg) highSeg.style.width = '0%';
        if (medSeg) medSeg.style.width = '0%';
        if (lowSeg) lowSeg.style.width = '0%';
    }
}


// ==========================================================================
// INTERFACE CONTROLS / FILTER HANDLERS
// ==========================================================================
function setupUIHandlers() {
    // Search input keyup
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            searchFilter = this.value.toLowerCase().trim();
            renderBoard();
        });
    }

    // Priority filter change
    const pFilter = document.getElementById('priority-filter');
    if (pFilter) {
        pFilter.addEventListener('change', function () {
            priorityFilter = this.value;
            renderBoard();
        });
    }

    // Status filter change
    const sFilter = document.getElementById('status-filter');
    if (sFilter) {
        sFilter.addEventListener('change', function () {
            statusFilter = this.value;
            renderBoard();
        });
    }

    // Add task button click (column add triggers)
    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const day = this.getAttribute('data-day');
            openAddModal(day);
        });
    });

    // Add task to all days button click
    const addWeeklyBtn = document.getElementById('add-weekly-task-btn');
    if (addWeeklyBtn) {
        addWeeklyBtn.addEventListener('click', function () {
            openAddModal('monday', true);
        });
    }

    // Modal cancellations
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

    // Click outside modal card to close
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
    }

    // Collapsible Sidebar logic
    const sidebar = document.getElementById('app-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
            playSound('click');

            const icon = this.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.setAttribute('data-lucide', 'chevron-right');
                this.setAttribute('data-tooltip', 'Expand Sidebar');
            } else {
                icon.setAttribute('data-lucide', 'chevron-left');
                this.setAttribute('data-tooltip', 'Collapse Sidebar');
            }
            lucide.createIcons();
        });
    }

    // Expand sidebar button inside sidebar nav under History Archive tab
    const expandSidebarBtn = document.getElementById('expand-sidebar-nav-btn');
    if (expandSidebarBtn && sidebar) {
        expandSidebarBtn.addEventListener('click', function () {
            sidebar.classList.remove('collapsed');
            playSound('click');

            const toggleIcon = document.querySelector('#sidebar-toggle-btn i');
            if (toggleIcon) {
                toggleIcon.setAttribute('data-lucide', 'chevron-left');
            }
            const toggleBtn = document.getElementById('sidebar-toggle-btn');
            if (toggleBtn) {
                toggleBtn.setAttribute('data-tooltip', 'Collapse Sidebar');
            }
            lucide.createIcons();
        });
    }

    // Sidebar Tab Switching Navigation
    const tabs = document.querySelectorAll('.sidebar-tab:not(#expand-sidebar-nav-btn)');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const target = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            panels.forEach(panel => {
                if (panel.id === `panel-${target}`) {
                    panel.classList.add('active');
                    panel.style.display = 'flex';
                } else {
                    panel.classList.remove('active');
                    panel.style.display = 'none';
                }
            });

            playSound('click');
            lucide.createIcons();
        });
    });

    // Sidebar Sound toggle
    const soundToggle = document.getElementById('sidebar-sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', function () {
            settings.soundEnabled = !settings.soundEnabled;
            saveSettingsToStorage();

            const icon = this.querySelector('i');
            if (settings.soundEnabled) {
                icon.setAttribute('data-lucide', 'volume-2');
                this.setAttribute('data-tooltip', 'Mute Sound');
                playSound('click');
            } else {
                icon.setAttribute('data-lucide', 'volume-x');
                this.setAttribute('data-tooltip', 'Unmute Sound');
            }
            lucide.createIcons();
        });
    }

    // Sidebar Theme toggle
    const themeToggle = document.getElementById('sidebar-theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
            saveSettingsToStorage();
            applyTheme();
            playSound('click');
        });
    }

    // Clear entire week
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            tasks = [];
            saveToStorage();
            playSound('delete');
            renderBoard();
        });
    }

    // Archive current week button click
    const archiveWeekBtn = document.getElementById('archive-week-btn');
    if (archiveWeekBtn) {
        archiveWeekBtn.addEventListener('click', function (e) {
            if (tasks.length === 0) {
                alert('Add and plan tasks before archiving your week!');
                return;
            }

            const rangeStr = getWeekRangeString();
            const newArchive = {
                id: 'w_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                dateRange: rangeStr,
                tasks: JSON.parse(JSON.stringify(tasks)),
                archivedAt: Date.now(),
                isExpanded: false
            };
            history.unshift(newArchive);
            saveHistoryToStorage();

            tasks = [];
            saveToStorage();

            // Reset skipped days for the new week
            skippedDays = { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false };
            saveSkippedDaysToStorage();

            playSound('success');
            renderBoard();
            renderHistory();

            // Fireworks burst visual feedback
            if (e.clientX && e.clientY) {
                createExplosion(e.clientX, e.clientY);
            }
        });
    }

    // Add Habit Button Handler
    const addHabitBtn = document.getElementById('add-habit-btn');
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', function () {
            const name = prompt('Enter habit name (e.g. Meditate for 10 minutes):');
            if (name && name.trim()) {
                const newHabit = {
                    id: 'h_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                    name: name.trim(),
                    history: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false }
                };
                habits.push(newHabit);
                saveHabitsToStorage();
                playSound('click');
                renderHabits();
            }
        });
    }

    // Notepad text area auto-save handler
    const notesTextarea = document.getElementById('notes-textarea');
    if (notesTextarea) {
        notesTextarea.value = notes;
        notesTextarea.addEventListener('input', function () {
            notes = this.value;
            saveNotesToStorage();
        });
    }

    // Reward Claim button click
    const rewardClaimBtn = document.getElementById('reward-claim-btn');
    const rewardModal = document.getElementById('reward-modal');
    if (rewardClaimBtn && rewardModal) {
        rewardClaimBtn.addEventListener('click', function () {
            rewardModal.classList.remove('active');
            playSound('click');
        });
    }
}

function applyTheme() {
    const root = document.documentElement;
    const themeToggle = document.getElementById('sidebar-theme-toggle');
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;

    if (settings.theme === 'light') {
        root.setAttribute('data-theme', 'light');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', 'sun');
            themeToggle.setAttribute('data-tooltip', 'Toggle Dark Theme');
        }
    } else {
        root.setAttribute('data-theme', 'dark');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', 'moon');
            themeToggle.setAttribute('data-tooltip', 'Toggle Light Theme');
        }
    }
    lucide.createIcons();
}


function checkWeeklyAutoArchive() {
    const currentWeekRange = getWeekRangeString();
    const activeWeekRange = localStorage.getItem('chronos_active_week_range');

    if (!activeWeekRange) {
        // First install or reset: initialize range to current week
        localStorage.setItem('chronos_active_week_range', currentWeekRange);
        return;
    }

    if (activeWeekRange !== currentWeekRange) {
        // Week has rolled over!
        if (tasks.length > 0) {
            const newArchive = {
                id: 'w_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                dateRange: activeWeekRange, // Archive with the original week label!
                tasks: JSON.parse(JSON.stringify(tasks)),
                archivedAt: Date.now(),
                isExpanded: false
            };
            history.unshift(newArchive);
            saveHistoryToStorage();

            tasks = [];
            saveToStorage();

            // Reset skipped days for the new week
            skippedDays = { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false };
            saveSkippedDaysToStorage();

            console.log(`Auto-archived week: ${activeWeekRange}`);
            alert(`📅 A new week has started! Chronos has automatically archived your tasks from last week ("${activeWeekRange}") to your History Archive. Starting a fresh week!`);
        }

        // Update to the new active week
        localStorage.setItem('chronos_active_week_range', currentWeekRange);
    }
}


// ==========================================================================
// BOOTSTRAP INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load localStorage data
    initData();

    // 2. Check and perform auto-archiving if week rolled over
    checkWeeklyAutoArchive();

    // 3. Set dates dynamically
    renderDates();

    // 4. Setup drag & drop columns
    setupDragAndDrop();

    // 5. Setup general UI click/change event bindings
    setupUIHandlers();

    // 6. Apply the stored dark/light theme
    applyTheme();

    // 7. Draw the complete board layout with task cards
    renderBoard();

    // 8. Draw the Habit rows in Tracker tab
    renderHabits();

    // 9. Draw History elements in Archive tab
    renderHistory();

    // Initial render of lucide elements
    lucide.createIcons();
});
