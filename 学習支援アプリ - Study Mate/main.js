/**
 * Study Mate - Mobile Optimized Logic
 * v7.0 - Fixed Dashboard, Added Long-term Goals & Scoring
 */

class StudyApp {
    constructor() {
        // App State
        this.state = {
            view: 'dashboard', // dashboard, tasks, goals, history, settings
            timer: {
                minutes: 25,
                seconds: 0,
                isActive: false,
                isBreak: false,
                intervalId: null
            },
            tasks: [],
            longTermTasks: [],
            history: [],
            schedule: [],
            dailyGoalSlots: 4,
            settings: {
                pomodoroTime: 25,
                breakTime: 5,
                youtubeUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk'
            },
            streak: 0
        };

        window.app = this; // Expose for onclick events
        this.init();
    }

    init() {
        this.loadState();
        this.initEvents();
        this.render();
    }

    // --- State Management ---
    loadState() {
        try {
            const saved = localStorage.getItem('study_mate_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
                this.state.timer.isActive = false;
                this.state.timer.intervalId = null;
                this.state.timer.minutes = this.state.settings.pomodoroTime;
                this.state.timer.seconds = 0;
            }
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }

    saveState() {
        try {
            const toSave = {
                tasks: this.state.tasks,
                longTermTasks: this.state.longTermTasks,
                history: this.state.history,
                schedule: this.state.schedule,
                dailyGoalSlots: this.state.dailyGoalSlots,
                settings: this.state.settings,
                streak: this.state.streak
            };
            localStorage.setItem('study_mate_data', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save state', e);
        }
    }

    // --- Event Handling ---
    initEvents() {
        // Navigation
        document.querySelectorAll(".nav-links li").forEach(li => {
            const handleNav = (e) => {
                e.preventDefault();
                const view = li.dataset.view;
                if (view) this.switchView(view);
            };
            li.addEventListener("click", handleNav);
        });

        // 2. Sidebar Toggle (Mobile Only Logic)
        // スマホ用：ハンバーガーメニューの開閉処理
        const toggleBtn = document.getElementById("menu-toggle");
        const sidebar = document.querySelector(".sidebar");
        const overlay = document.getElementById("sidebar-overlay");

        if (toggleBtn && sidebar && overlay) {
            toggleBtn.addEventListener("click", () => {
                sidebar.classList.add("open");
                overlay.classList.add("active");
            });

            overlay.addEventListener("click", () => {
                sidebar.classList.remove("open");
                overlay.classList.remove("active");
            });
        }
    }

    switchView(viewName) {
        this.state.view = viewName;

        document.querySelectorAll(".nav-links li").forEach(li => {
            li.classList.toggle("active", li.dataset.view === viewName);
        });

        if (window.innerWidth < 768) {
            document.querySelector(".sidebar")?.classList.remove("open");
            document.getElementById("sidebar-overlay")?.classList.remove("active");
        }

        this.render();
    }

    // --- Rendering ---
    render() {
        const titleEl = document.getElementById("view-title");
        const titles = {
            dashboard: 'ダッシュボード',
            tasks: 'スケジュール',
            goals: '長期目標',
            history: '学習履歴',
            settings: '設定'
        };
        if (titleEl) titleEl.textContent = titles[this.state.view] || 'Study Mate';

        const streakEl = document.getElementById("streak-badge");
        if (streakEl) streakEl.textContent = `🔥 ${this.state.streak}日連続`;

        const appView = document.getElementById("app-view");
        if (!appView) return;

        // Reset Modal
        document.getElementById('task-modal')?.classList.remove('active');

        switch (this.state.view) {
            case 'dashboard':
                this.renderDashboard(appView);
                break;
            case 'tasks':
                this.renderTasks(appView);
                break;
            case 'goals': // New View
                this.renderGoals(appView);
                break;
            case 'history':
                this.renderHistory(appView);
                break;
            case 'settings':
                this.renderSettings(appView);
                break;
            default:
                this.renderDashboard(appView);
        }
    }

    // --- Dashboard ---
    renderDashboard(container) {
        const completedSlots = this.getTodayCompletedCount();
        const currentTaskObj = this.getCurrentTaskObject();
        const avgScore = this.getTodayAverageScore();

        container.innerHTML = `
            <div class="dashboard-grid">
                <!-- Current Focus -->
                <div class="card current-task-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(88,166,255,0.1), rgba(88,166,255,0.05)); border-color:var(--primary-color);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span class="badge" style="background:var(--primary-color); color:#0d1117;">NOW</span>
                            <h2 style="margin:10px 0; font-size:1.4rem;">${currentTaskObj ? currentTaskObj.content : 'タスクなし'}</h2>
                            <p class="task-meta">${currentTaskObj ? currentTaskObj.subject + ' • ' + currentTaskObj.plannedSlots + 'コマ' : 'スケジュールからタスクを追加してください'}</p>
                        </div>
                        ${currentTaskObj ? `<button class="btn btn-primary" style="width:auto;" onclick="app.showCompleteModal('${currentTaskObj.id}')">完了</button>` : ''}
                    </div>
                </div>

                <!-- Timer -->
                <div class="card timer-preview">
                    <h3 style="font-size:0.9rem;">フォーカス</h3>
                    <div class="timer-display" id="dash-timer-display" style="font-size:2rem; margin:0.5rem 0;">
                        ${this.formatTime(this.state.timer.minutes, this.state.timer.seconds)}
                    </div>
                    <button class="btn btn-primary" onclick="app.toggleTimer()" style="padding:8px;">
                        ${this.state.timer.isActive ? '停止' : '開始'}
                    </button>
                    ${this.state.timer.isBreak ? '<p style="font-size:0.8rem; text-align:center; color:#3fb950;">☕ 休憩</p>' : ''}
                </div>

                <!-- Goal -->
                <div class="card">
                    <h3 style="font-size:0.9rem;">今日の目標</h3>
                    <div style="font-size:1.5rem; font-weight:bold; text-align:center; margin:0.5rem 0;">
                        ${completedSlots} <span style="font-size:1rem; font-weight:normal; color:#8b949e;">/ ${this.state.dailyGoalSlots}</span>
                    </div>
                    <div class="slot-indicator" style="justify-content:center;">
                        ${this.renderGoalDots(completedSlots, this.state.dailyGoalSlots)}
                    </div>
                </div>
                
                <!-- Score -->
                <div class="card">
                    <h3 style="font-size:0.9rem;">今日の平均スコア</h3>
                    <div style="font-size:2rem; font-weight:bold; text-align:center; margin:0.5rem 0; color: #e3b341;">
                        ${avgScore}
                    </div>
                    <p style="text-align:center; font-size:0.8rem; color:#8b949e;">MAX: 4.0 (AA)</p>
                </div>

                <!-- Schedule List -->
                <div class="card">
                    <h3 style="font-size:0.9rem;">次降の予定</h3>
                    <div style="max-height:150px; overflow-y:auto;">
                        ${this.renderSimpleScheduleList()}
                    </div>
                </div>

                 <!-- Chart -->
                <div class="card" style="grid-column: 1 / -1;">
                    <h3 style="font-size:0.9rem;">学習リズム (スコア平均推移)</h3>
                    <div style="height:150px;">
                        <canvas id="progressChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => this.initCharts(), 100);
    }

    renderGoalDots(done, total) {
        let html = '';
        for (let i = 0; i < total; i++) {
            html += `<span class="slot-dot ${i < done ? 'active' : ''}"></span>`;
        }
        return html;
    }

    getTodayCompletedCount() {
        const today = new Date().toDateString();
        return this.state.history.filter(h => new Date(h.completedAt).toDateString() === today).length;
    }

    getTodayAverageScore() {
        const today = new Date().toDateString();
        const todayItems = this.state.history.filter(h => new Date(h.completedAt).toDateString() === today);
        if (todayItems.length === 0) return '-';

        const sum = todayItems.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return (sum / todayItems.length).toFixed(1);
    }

    getCurrentTaskObject() {
        if (!this.state.schedule || this.state.schedule.length === 0) return null;
        return this.state.tasks.find(t => t.id === this.state.schedule[0]) || null;
    }

    renderSimpleScheduleList() {
        if (!this.state.schedule) return '';
        const list = this.state.schedule.slice(1);
        if (list.length === 0) return '<p class="empty-state" style="padding:1rem;">次の予定はありません</p>';
        return list
            .map(id => this.state.tasks.find(t => t.id === id))
            .filter(t => t)
            .map(t => `<div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9rem;">${t.content}</div>`)
            .join('');
    }

    // --- Tasks View ---
    renderTasks(container) {
        container.innerHTML = `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>今日の目標設定</h3>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="number" id="daily-goal-input" value="${this.state.dailyGoalSlots}" 
                               style="width:70px; margin-bottom:0; padding:8px;" onchange="app.saveGoal()">
                        <span>コマ</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>本日のタスク (未完了)</h3>
                <div id="tasks-pool">
                    ${this.renderTaskPool()}
                </div>
                <button class="btn btn-primary" style="margin-top:1rem;" onclick="app.showNewTaskModal(false)">+ タスク追加</button>
            </div>

             <div class="card">
                <h3>今日のスケジュール (ドラッグして並び替え)</h3>
                <div id="daily-schedule" style="min-height:50px; background:rgba(0,0,0,0.1); border-radius:8px; padding:5px;">
                    ${this.renderScheduleList()}
                </div>
            </div>
        `;
        this.initSortable();
    }

    // --- Goals View (New) ---
    renderGoals(container) {
        container.innerHTML = `
            <div class="card">
                <h3>長期スケジュール (期限付き目標)</h3>
                <div id="long-term-pool">
                    ${this.renderLongTermTasks()}
                </div>
                 <button class="btn btn-primary" style="margin-top:0.5rem; background:transparent; border:1px solid var(--primary-color); color:var(--primary-color);" onclick="app.showNewTaskModal(true)">+ 長期目標を追加</button>
            </div>
        `;
    }

    renderLongTermTasks() {
        if (!this.state.longTermTasks) this.state.longTermTasks = [];
        if (this.state.longTermTasks.length === 0) return '<p class="empty-state">長期目標はありません</p>';
        return this.state.longTermTasks.map(t => `
            <div class="task-item">
                <div class="task-info">
                    <span class="badge" style="background:var(--secondary-color); color:#fff;">長期</span>
                    <h4>${t.content}</h4>
                    <div class="task-meta">📅 ${t.deadline} まで</div>
                </div>
                <button class="btn" style="width:auto; padding:5px; font-size:0.8rem;" onclick="app.deleteLongTerm('${t.id}')">削除</button>
            </div>
        `).join('');
    }

    renderTaskPool() {
        const scheduledIds = this.state.schedule;
        const poolTasks = this.state.tasks.filter(t => !t.completed && !scheduledIds.includes(t.id));
        if (poolTasks.length === 0) return '<p class="empty-state">タスクはありません</p>';
        return poolTasks.map(t => this.createTaskHTML(t)).join('');
    }

    renderScheduleList() {
        if (!this.state.schedule || this.state.schedule.length === 0) return '<p class="empty-state">タスクをここに移動</p>';
        return this.state.schedule
            .map(id => this.state.tasks.find(t => t.id === id))
            .filter(t => t && !t.completed)
            .map(t => this.createTaskHTML(t))
            .join('');
    }

    createTaskHTML(t) {
        return `
            <div class="task-item" data-id="${t.id}">
                <div class="task-info">
                    <span class="badge">${t.subject}</span>
                    <h4>${t.content}</h4>
                    <div class="task-meta">予定: ${t.plannedSlots}コマ</div>
                </div>
                <button class="btn btn-primary" style="width:auto; padding:5px 10px;" onclick="app.showCompleteModal('${t.id}')">完了</button>
            </div>
        `;
    }

    // --- History View ---
    renderHistory(container) {
        const list = this.state.history.slice().reverse();
        container.innerHTML = `
            <div class="card">
                <h3>学習履歴</h3>
                ${list.length === 0 ? '<p class="empty-state">履歴はまだありません</p>' : ''}
                ${list.map(h => `
                    <div class="task-item">
                        <div class="task-info">
                            <span class="badge">${h.subject}</span>
                            <h4>${h.content}</h4>
                            <div class="task-meta">
                                ${new Date(h.completedAt).toLocaleString()}
                                <br>
                                <span style="color:#e3b341;">評価: ${h.grade || '-'} (${h.score || 0}点)</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- Settings View ---
    renderSettings(container) {
        container.innerHTML = `
            <div class="card">
                <h3>設定</h3>
                <div class="form-group">
                    <label>集中時間 (分)</label>
                    <input type="number" id="set-pomodoro" value="${this.state.settings.pomodoroTime}">
                </div>
                <div class="form-group">
                    <label>休憩時間 (分)</label>
                    <input type="number" id="set-break" value="${this.state.settings.breakTime}">
                </div>
                <button class="btn btn-primary" onclick="app.saveSettings()">保存</button>
                <button class="btn" style="margin-top:2rem; background:var(--danger-color);" onclick="app.resetAll()">全データ削除</button>
            </div>
        `;
    }

    // --- Timer Logic ---
    toggleTimer() {
        if (this.state.timer.isActive) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
        this.render();
    }

    startTimer() {
        if (this.state.timer.intervalId) clearInterval(this.state.timer.intervalId);
        this.state.timer.isActive = true;
        this.state.timer.intervalId = setInterval(() => this.tick(), 1000);
    }

    stopTimer() {
        this.state.timer.isActive = false;
        if (this.state.timer.intervalId) {
            clearInterval(this.state.timer.intervalId);
            this.state.timer.intervalId = null;
        }
    }

    tick() {
        let { minutes, seconds } = this.state.timer;
        if (seconds === 0) {
            if (minutes === 0) {
                this.onTimerComplete();
                return;
            }
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }
        this.state.timer.minutes = minutes;
        this.state.timer.seconds = seconds;

        const disp = document.getElementById("dash-timer-display");
        if (disp) disp.textContent = this.formatTime(minutes, seconds);
    }

    onTimerComplete() {
        this.stopTimer();
        if (!this.state.timer.isBreak) {
            alert("お疲れ様です！休憩しましょう。");
            this.state.timer.isBreak = true;
            this.state.timer.minutes = this.state.settings.breakTime;
        } else {
            alert("休憩終了！学習に戻りましょう。");
            this.state.timer.isBreak = false;
            this.state.timer.minutes = this.state.settings.pomodoroTime;
        }
        this.state.timer.seconds = 0;
        this.render();
    }

    formatTime(m, s) {
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // --- Task Actions ---
    showNewTaskModal(isLongTerm = false) {
        const modal = document.getElementById('task-modal');
        const today = new Date().toISOString().split('T')[0];
        modal.innerHTML = `
            <h3>${isLongTerm ? '長期目標' : 'タスク'}作成</h3>
            <div class="form-group"><label>科目/カテゴリ</label><input type="text" id="new-subject" placeholder="例: 数学"></div>
            <div class="form-group"><label>内容</label><input type="text" id="new-content" placeholder="例: 問題集 P.10-20"></div>
            ${isLongTerm ? `<div class="form-group"><label>期限</label><input type="date" id="new-deadline" value="${today}"></div>` : `<div class="form-group"><label>予定コマ数</label><input type="number" id="new-slots" value="1" min="1"></div>`}
            <button class="btn btn-primary" onclick="app.addTask(${isLongTerm})">追加</button>
            <button class="btn" style="margin-top:10px; background:transparent;" onclick="document.getElementById('task-modal').classList.remove('active')">キャンセル</button>
        `;
        modal.classList.add('active');
    }

    addTask(isLongTerm) {
        const sub = document.getElementById('new-subject').value;
        const con = document.getElementById('new-content').value;

        if (!con) return alert('内容を入力してください');

        const newTask = {
            id: Date.now().toString(),
            subject: sub || 'その他',
            content: con,
            createdAt: new Date().toISOString(),
            completed: false
        };

        if (isLongTerm) {
            newTask.deadline = document.getElementById('new-deadline').value;
            if (!this.state.longTermTasks) this.state.longTermTasks = [];
            this.state.longTermTasks.push(newTask);
        } else {
            newTask.plannedSlots = parseInt(document.getElementById('new-slots').value) || 1;
            this.state.tasks.push(newTask);
        }

        this.saveState();
        document.getElementById('task-modal').classList.remove('active');
        this.render(); // Will render current view
    }

    // --- Completion & Scoring Logic ---
    showCompleteModal(id) {
        const modal = document.getElementById('task-modal');
        modal.innerHTML = `
            <h3>タスク完了: 振り返り</h3>
            <p>お疲れ様でした！自己評価をつけてください。</p>
            <div class="rating-group" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:5px; margin: 1rem 0;">
                <button class="rating-btn" onclick="app.selectGrade(this, 'AA', 4)">AA<br><small>4点</small></button>
                <button class="rating-btn" onclick="app.selectGrade(this, 'A', 3)">A<br><small>3点</small></button>
                <button class="rating-btn" onclick="app.selectGrade(this, 'B', 2)">B<br><small>2点</small></button>
                <button class="rating-btn" onclick="app.selectGrade(this, 'C', 1)">C<br><small>1点</small></button>
                <button class="rating-btn" onclick="app.selectGrade(this, 'D', 0)">D<br><small>0点</small></button>
            </div>
            <input type="hidden" id="selected-grade" value="">
            <input type="hidden" id="selected-score" value="">

            <button class="btn btn-primary" onclick="app.completeTask('${id}')">完了として記録</button>
            <button class="btn" style="margin-top:10px; background:transparent;" onclick="document.getElementById('task-modal').classList.remove('active')">キャンセル</button>
        `;
        modal.classList.add('active');
    }

    selectGrade(btn, grade, score) {
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('selected-grade').value = grade;
        document.getElementById('selected-score').value = score;
    }

    completeTask(id) {
        const grade = document.getElementById('selected-grade').value;
        const score = document.getElementById('selected-score').value;

        if (!grade) return alert("評価を選択してください");

        const task = this.state.tasks.find(t => t.id === id);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            task.grade = grade;
            task.score = parseInt(score);

            this.state.history.push(task);
            this.state.schedule = this.state.schedule.filter(sid => sid !== id);
            this.state.streak += 1;
        }
        document.getElementById('task-modal').classList.remove('active');
        this.saveState();
        this.render();
    }

    deleteLongTerm(id) {
        if (confirm('削除しますか？')) {
            this.state.longTermTasks = this.state.longTermTasks.filter(t => t.id !== id);
            this.saveState();
            this.render();
        }
    }

    initSortable() {
        if (typeof Sortable === 'undefined') return;
        const pool = document.getElementById('tasks-pool');
        const sch = document.getElementById('daily-schedule');

        const opts = {
            group: 'tasks',
            animation: 150,
            delay: 100,
            delayOnTouchOnly: true,
            onEnd: () => {
                const els = document.querySelectorAll('#daily-schedule .task-item');
                this.state.schedule = Array.from(els).map(el => el.dataset.id);
                this.saveState();
            }
        };

        if (pool) Sortable.create(pool, opts);
        if (sch) Sortable.create(sch, opts);
    }

    saveGoal() {
        const val = document.getElementById('daily-goal-input').value;
        const num = parseInt(val);
        if (num > 0) {
            this.state.dailyGoalSlots = num;
            this.saveState();
        }
    }

    initCharts() {
        const ctx = document.getElementById('progressChart');
        if (!ctx || typeof Chart === 'undefined') return;

        // Calculate Data for last 7 days
        const labels = [];
        const dataCount = [];
        const dataScore = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('ja-JP', { weekday: 'short' }));
            const dateStr = d.toDateString();

            const dayItems = this.state.history.filter(h => new Date(h.completedAt).toDateString() === dateStr);

            // Task Count
            dataCount.push(dayItems.length);

            // Avg Score
            if (dayItems.length > 0) {
                const sum = dayItems.reduce((acc, curr) => acc + (curr.score || 0), 0);
                dataScore.push((sum / dayItems.length).toFixed(1));
            } else {
                dataScore.push(null);
            }
        }

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '完了タスク数',
                        data: dataCount,
                        backgroundColor: 'rgba(88, 166, 255, 0.5)',
                        borderColor: '#58a6ff',
                        borderWidth: 1,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        label: '平均スコア',
                        data: dataScore,
                        type: 'line',
                        borderColor: '#e3b341',
                        backgroundColor: 'rgba(227, 179, 65, 0.2)',
                        borderWidth: 2,
                        pointBackgroundColor: '#e3b341',
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: { display: true, text: 'タスク数' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 4,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: '評価スコア' },
                        ticks: {
                            stepSize: 1, callback: function (value) {
                                if (value === 4) return 'AA';
                                if (value === 3) return 'A';
                                if (value === 2) return 'B';
                                if (value === 1) return 'C';
                                if (value === 0) return 'D';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }

    saveSettings() {
        this.state.settings.pomodoroTime = parseInt(document.getElementById('set-pomodoro').value) || 25;
        this.state.settings.breakTime = parseInt(document.getElementById('set-break').value) || 5;
        this.saveState();
        alert('設定を保存しました');
    }

    resetAll() {
        if (confirm('本当に全てのデータを削除しますか？')) {
            localStorage.removeItem('study_mate_data');
            location.reload();
        }
    }
}

// Start
window.addEventListener("DOMContentLoaded", () => {
    new StudyApp();
});
