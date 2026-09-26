/**
 * Study & Life Planner - Main Application Logic
 * Vanilla JavaScript (Zero build dependencies, works seamlessly on GitHub Pages & GitLab Pages)
 */

// --- 1. STATE & STORAGE MANAGEMENT ---
const STORAGE_KEY = 'study_planner_tasks_v1';

let state = {
  currentView: 'day', // 'day' | 'week' | 'month' | 'year'
  currentDate: new Date(), // Selected date
  tasks: []
};

// Khởi tạo dữ liệu mẫu nếu lần đầu truy cập để người dùng dễ hình dung
function initSampleDataIfEmpty() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sampleTasks = [
      {
        id: 'sample-1',
        title: 'Đọc 1 bài báo nghiên cứu / Chapter 1',
        date: formatDate(yesterday),
        priority: 'high',
        category: 'Học tập',
        note: 'Task này giả lập bị trễ hạn từ hôm qua để test tính năng Warning & Replan!',
        completed: false,
        replanCount: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-2',
        title: 'Luyện 30 từ vựng chuyên ngành',
        date: formatDate(today),
        priority: 'high',
        category: 'Ngoại ngữ',
        note: 'Dùng Anki hoặc Quizlet 20 phút',
        completed: false,
        replanCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-3',
        title: 'Lập dàn ý bài luận / Dự án mới',
        date: formatDate(today),
        priority: 'medium',
        category: 'Dự án',
        note: 'Xác định các milestone chính',
        completed: true,
        replanCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-4',
        title: 'Tổng kết tuần & lên lịch tuần mới',
        date: formatDate(tomorrow),
        priority: 'medium',
        category: 'Kế hoạch',
        note: '',
        completed: false,
        replanCount: 0,
        createdAt: new Date().toISOString()
      }
    ];
    saveTasksToStorage(sampleTasks);
    return sampleTasks;
  }
  try {
    return JSON.parse(existing) || [];
  } catch (e) {
    return [];
  }
}

function loadTasks() {
  state.tasks = initSampleDataIfEmpty();
}

function saveTasksToStorage(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveCurrentTasks() {
  saveTasksToStorage(state.tasks);
}

// --- 2. DATE HELPERS ---
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayStr() {
  return formatDate(new Date());
}

function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isOverdue(task) {
  return task.date < getTodayStr() && !task.completed;
}

// --- 3. REPLAN & WARNING ENGINE ---
function getOverdueTasks() {
  const todayStr = getTodayStr();
  return state.tasks.filter(t => t.date < todayStr && !t.completed);
}

function updateReplanAlerts() {
  const overdueTasks = getOverdueTasks();
  const count = overdueTasks.length;

  const banner = document.getElementById('overdueAlertBanner');
  const bannerCount = document.getElementById('bannerOverdueCount');
  const btnReplanCenter = document.getElementById('btnReplanCenter');
  const replanBadge = document.getElementById('replanCountBadge');

  if (count > 0) {
    banner.classList.remove('hidden');
    bannerCount.textContent = count;
    btnReplanCenter.classList.remove('hidden');
    btnReplanCenter.classList.add('flex');
    replanBadge.textContent = count;
  } else {
    banner.classList.add('hidden');
    btnReplanCenter.classList.add('hidden');
    btnReplanCenter.classList.remove('flex');
  }
}

function replanTask(taskId, targetDateStr) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.date = targetDateStr;
  task.replanCount = (task.replanCount || 0) + 1;
  saveCurrentTasks();
  renderApp();
  renderReplanModalContent();
}

function replanAllOverdueToToday() {
  const todayStr = getTodayStr();
  const overdueTasks = getOverdueTasks();
  overdueTasks.forEach(task => {
    task.date = todayStr;
    task.replanCount = (task.replanCount || 0) + 1;
  });
  saveCurrentTasks();
  renderApp();
  closeReplanModal();
}

// --- 4. TASK CRUD ---
function toggleTaskComplete(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveCurrentTasks();
    renderApp();
  }
}

function deleteTask(taskId) {
  if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveCurrentTasks();
    renderApp();
    renderReplanModalContent();
  }
}

function saveTaskFromForm(formData) {
  const { id, title, date, priority, category, note } = formData;
  if (id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.date = date;
      task.priority = priority;
      task.category = category;
      task.note = note;
    }
  } else {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      date,
      priority,
      category,
      note,
      completed: false,
      replanCount: 0,
      createdAt: new Date().toISOString()
    };
    state.tasks.push(newTask);
  }
  saveCurrentTasks();
  renderApp();
}

// --- 5. RENDER VIEWS ---

// A. Header Navigation Display
function updateHeaderDisplay() {
  const display = document.getElementById('currentDateDisplay');
  const d = state.currentDate;
  const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
  
  if (state.currentView === 'day') {
    display.textContent = d.toLocaleDateString('vi-VN', options);
  } else if (state.currentView === 'week') {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    display.textContent = `${monday.getDate()}/${monday.getMonth()+1} - ${sunday.getDate()}/${sunday.getMonth()+1}/${sunday.getFullYear()}`;
  } else if (state.currentView === 'month') {
    display.textContent = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  } else if (state.currentView === 'year') {
    display.textContent = `Năm ${d.getFullYear()}`;
  }

  // Cập nhật thanh tiến độ ngày hôm nay
  const todayTasks = state.tasks.filter(t => t.date === getTodayStr());
  const completedToday = todayTasks.filter(t => t.completed).length;
  const pct = todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100);
  document.getElementById('todayProgressBar').style.width = `${pct}%`;
  document.getElementById('todayProgressText').textContent = `${pct}% (${completedToday}/${todayTasks.length})`;
}

// B. Render Day View
function renderDayView() {
  const listContainer = document.getElementById('dayTaskList');
  const emptyState = document.getElementById('dayEmptyState');
  const targetDateStr = formatDate(state.currentDate);

  const tasksForDay = state.tasks.filter(t => t.date === targetDateStr);

  document.getElementById('dayViewHeader').textContent = `Nhiệm vụ (${targetDateStr === getTodayStr() ? 'Hôm nay - ' : ''}${state.currentDate.toLocaleDateString('vi-VN')})`;

  if (tasksForDay.length === 0) {
    listContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Sắp xếp: chưa hoàn thành trước, sau đó theo mức độ ưu tiên
  const priorityScore = { high: 3, medium: 2, low: 1 };
  tasksForDay.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
  });

  listContainer.innerHTML = tasksForDay.map(task => {
    const taskIsOverdue = isOverdue(task);
    const priorityBadge = {
      high: '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-red-600 border border-red-200">🔥 Ưu tiên cao</span>',
      medium: '<span class="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-600">Bình thường</span>',
      low: '<span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-50 text-slate-400">Thấp</span>'
    }[task.priority] || '';

    const replanBadge = (task.replanCount && task.replanCount > 0)
      ? `<span class="px-2 py-0.5 text-[10px] font-semibold rounded-md ${task.replanCount >= 3 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}" title="Đã bị dời ${task.replanCount} lần">
          <i data-lucide="rotate-ccw" class="w-3 h-3 inline"></i> Đã dời ${task.replanCount} lần
        </span>`
      : '';

    return `
      <div class="bg-white rounded-xl p-4 border transition-all duration-200 hover:shadow-xs flex items-start justify-between gap-3 ${taskIsOverdue ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'} ${task.completed ? 'opacity-65' : ''}">
        <div class="flex items-start gap-3 flex-1">
          <!-- Checkbox -->
          <button onclick="toggleTaskComplete('${task.id}')" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition ${task.completed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 hover:border-blue-500 bg-white'}">
            ${task.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
          </button>
          
          <!-- Content -->
          <div class="space-y-1 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}">${escapeHtml(task.title)}</span>
              ${priorityBadge}
              ${task.category ? `<span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-100">${escapeHtml(task.category)}</span>` : ''}
              ${replanBadge}
            </div>
            ${task.note ? `<p class="text-xs text-slate-500">${escapeHtml(task.note)}</p>` : ''}
          </div>
        </div>

        <!-- Action tools -->
        <div class="flex items-center gap-1">
          ${taskIsOverdue ? `
            <button onclick="replanTask('${task.id}', '${getTodayStr()}')" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs">
              <i data-lucide="calendar-plus" class="w-3.5 h-3.5"></i> Dời về hôm nay
            </button>
          ` : ''}
          <button onclick="openEditTaskModal('${task.id}')" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// C. Render Week View
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function renderWeekView() {
  const container = document.getElementById('weekGridContainer');
  const monday = getMonday(state.currentDate);
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  container.innerHTML = days.map((dayDate, idx) => {
    const dateStr = formatDate(dayDate);
    const isToday = dateStr === getTodayStr();
    const tasks = state.tasks.filter(t => t.date === dateStr);
    const completedCount = tasks.filter(t => t.completed).length;

    return `
      <div class="bg-white rounded-xl border ${isToday ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'} shadow-2xs flex flex-col min-h-[300px]">
        <!-- Day Column Header -->
        <div class="p-3 border-b border-slate-100 flex items-center justify-between ${isToday ? 'bg-blue-50/50' : 'bg-slate-50/50'}">
          <div>
            <span class="text-xs font-bold ${idx >= 5 ? 'text-red-500' : 'text-slate-600'}">${dayNames[idx]}</span>
            <div class="text-sm font-extrabold text-slate-900">${dayDate.getDate()}/${dayDate.getMonth() + 1}</div>
          </div>
          <span class="text-[11px] font-semibold text-slate-400">${completedCount}/${tasks.length}</span>
        </div>

        <!-- Task List inside day -->
        <div class="p-2 space-y-1.5 flex-1 overflow-y-auto max-h-[350px]">
          ${tasks.length === 0 ? '<div class="text-[11px] text-slate-400 text-center py-6">Không có task</div>' : ''}
          ${tasks.map(t => `
            <div onclick="openDayFromGrid('${dateStr}')" class="p-2 rounded-lg text-xs border cursor-pointer hover:bg-slate-50 transition ${isOverdue(t) ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'} ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}">
              <div class="font-medium truncate">${escapeHtml(t.title)}</div>
              ${t.category ? `<span class="text-[9px] text-blue-600 font-medium">${escapeHtml(t.category)}</span>` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Add Button for this day -->
        <div class="p-2 border-t border-slate-100">
          <button onclick="openAddTaskModalForDate('${dateStr}')" class="w-full py-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1 transition">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Thêm
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// D. Render Month View
function renderMonthView() {
  const container = document.getElementById('monthGridContainer');
  const d = state.currentDate;
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startingDay = firstDay.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  const totalDays = lastDay.getDate();
  const totalSlots = Math.ceil((startingDay + totalDays) / 7) * 7;

  let html = '';

  for (let i = 0; i < totalSlots; i++) {
    const dayNum = i - startingDay + 1;
    if (dayNum > 0 && dayNum <= totalDays) {
      const cellDate = new Date(year, month, dayNum);
      const dateStr = formatDate(cellDate);
      const isToday = dateStr === getTodayStr();
      const tasks = state.tasks.filter(t => t.date === dateStr);
      const overdueTasks = tasks.filter(t => isOverdue(t));

      html += `
        <div onclick="openDayFromGrid('${dateStr}')" class="min-h-[90px] p-1.5 rounded-xl border cursor-pointer hover:border-blue-400 transition bg-white flex flex-col justify-between ${isToday ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-700'}">${dayNum}</span>
            ${overdueTasks.length > 0 ? `<span class="w-2 h-2 rounded-full bg-amber-500" title="Có task trễ hạn"></span>` : ''}
          </div>
          
          <div class="space-y-1 my-1 overflow-hidden">
            ${tasks.slice(0, 2).map(t => `
              <div class="text-[10px] px-1.5 py-0.5 rounded truncate ${t.completed ? 'bg-slate-100 text-slate-400 line-through' : 'bg-blue-50 text-blue-700 font-medium'}">
                ${escapeHtml(t.title)}
              </div>
            `).join('')}
            ${tasks.length > 2 ? `<div class="text-[9px] text-slate-400 font-medium pl-1">+${tasks.length - 2} task khác</div>` : ''}
          </div>

          <div class="text-[10px] text-slate-400 text-right">
            ${tasks.length > 0 ? `${tasks.filter(t => t.completed).length}/${tasks.length}` : ''}
          </div>
        </div>
      `;
    } else {
      html += `<div class="min-h-[90px] p-2 bg-slate-50/50 rounded-xl border border-slate-100"></div>`;
    }
  }

  container.innerHTML = html;
}

// E. Render Year Heatmap View (GitHub-style Contribution)
function renderYearView() {
  const container = document.getElementById('yearHeatmapContainer');
  const year = state.currentDate.getFullYear();

  let html = `<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">`;

  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1);
    const monthName = monthDate.toLocaleDateString('vi-VN', { month: 'long' });
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    html += `
      <div class="p-3 bg-slate-50/60 rounded-xl border border-slate-200">
        <h4 class="text-xs font-bold text-slate-800 capitalize mb-2.5">${monthName}</h4>
        <div class="grid grid-cols-7 gap-1">
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, m, d);
      const dateStr = formatDate(cellDate);
      const tasks = state.tasks.filter(t => t.date === dateStr);
      const completed = tasks.filter(t => t.completed).length;

      let colorClass = 'bg-white border-slate-200';
      if (completed > 0) {
        if (completed === 1) colorClass = 'bg-emerald-200 border-emerald-300';
        else if (completed === 2) colorClass = 'bg-emerald-400 border-emerald-500';
        else colorClass = 'bg-emerald-600 border-emerald-700 text-white';
      }

      html += `
        <div onclick="openDayFromGrid('${dateStr}')" title="${dateStr}: ${completed}/${tasks.length} hoàn thành" class="w-4 h-4 sm:w-5 sm:h-5 rounded-xs border text-[9px] flex items-center justify-center cursor-pointer transition hover:scale-110 ${colorClass}">
        </div>
      `;
    }

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// --- 6. SWITCH & NAVIGATE ---
function switchView(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.view-btn').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.className = 'view-btn px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition bg-white text-blue-600 shadow-xs';
    } else {
      btn.className = 'view-btn px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition text-slate-600 hover:text-slate-900';
    }
  });

  document.getElementById('viewDay').classList.toggle('hidden', viewName !== 'day');
  document.getElementById('viewWeek').classList.toggle('hidden', viewName !== 'week');
  document.getElementById('viewMonth').classList.toggle('hidden', viewName !== 'month');
  document.getElementById('viewYear').classList.toggle('hidden', viewName !== 'year');

  renderApp();
}

function navigateDate(delta) {
  const d = state.currentDate;
  if (state.currentView === 'day') {
    d.setDate(d.getDate() + delta);
  } else if (state.currentView === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else if (state.currentView === 'month') {
    d.setMonth(d.getMonth() + delta);
  } else if (state.currentView === 'year') {
    d.setFullYear(d.getFullYear() + delta);
  }
  renderApp();
}

function openDayFromGrid(dateStr) {
  state.currentDate = parseDateStr(dateStr);
  switchView('day');
}

// --- 7. MODALS ---
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const replanModal = document.getElementById('replanModal');

function openAddTaskModal(initialDate = null) {
  taskForm.reset();
  document.getElementById('taskId').value = '';
  document.getElementById('modalTitle').textContent = 'Thêm nhiệm vụ mới';
  document.getElementById('taskDate').value = initialDate || formatDate(state.currentDate);
  taskModal.classList.remove('hidden');
}

function openAddTaskModalForDate(dateStr) {
  openAddTaskModal(dateStr);
}

function openEditTaskModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDate').value = task.date;
  document.getElementById('taskPriority').value = task.priority || 'medium';
  document.getElementById('taskCategory').value = task.category || '';
  document.getElementById('taskNote').value = task.note || '';
  document.getElementById('modalTitle').textContent = 'Chỉnh sửa nhiệm vụ';

  taskModal.classList.remove('hidden');
}

function closeTaskModal() {
  taskModal.classList.add('hidden');
}

function openReplanModal() {
  renderReplanModalContent();
  replanModal.classList.remove('hidden');
}

function closeReplanModal() {
  replanModal.classList.add('hidden');
}

function renderReplanModalContent() {
  const listContainer = document.getElementById('replanTaskList');
  const overdueTasks = getOverdueTasks();

  if (overdueTasks.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-10 text-slate-500">
        <i data-lucide="check-circle-2" class="w-10 h-10 text-emerald-500 mx-auto mb-2"></i>
        <p class="font-medium text-slate-700">Tuyệt vời! Bạn không còn nhiệm vụ nào bị quá hạn.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const todayStr = getTodayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  listContainer.innerHTML = overdueTasks.map(task => {
    return `
      <div class="bg-amber-50/50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-800 text-sm">${escapeHtml(task.title)}</span>
            <span class="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Ngày cũ: ${task.date}</span>
            ${task.replanCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Đã dời ${task.replanCount} lần</span>` : ''}
          </div>
          ${task.note ? `<p class="text-xs text-slate-500 mt-0.5">${escapeHtml(task.note)}</p>` : ''}
        </div>

        <div class="flex items-center gap-1.5 self-end sm:self-center">
          <button onclick="replanTask('${task.id}', '${todayStr}')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-2xs">
            Hôm nay
          </button>
          <button onclick="replanTask('${task.id}', '${tomorrowStr}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition border">
            Ngày mai
          </button>
          <button onclick="toggleTaskComplete('${task.id}')" title="Đánh dấu hoàn thành" class="p-1 hover:bg-emerald-100 text-emerald-600 rounded-lg">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa bỏ" class="p-1 hover:bg-rose-100 text-rose-500 rounded-lg">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// --- 8. EXPORT & IMPORT ---
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `study-planner-backup-${getTodayStr()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Tìm thấy ${imported.length} nhiệm vụ từ file sao lưu. Bạn có muốn nhập và ghi đè danh sách hiện tại không?`)) {
          state.tasks = imported;
          saveCurrentTasks();
          renderApp();
          alert('Nhập dữ liệu thành công!');
        }
      } else {
        alert('File JSON không đúng định dạng danh sách task!');
      }
    } catch (err) {
      alert('Lỗi đọc file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Utility Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- 9. INITIALIZATION & EVENT LISTENERS ---
function renderApp() {
  updateHeaderDisplay();
  updateReplanAlerts();

  if (state.currentView === 'day') renderDayView();
  else if (state.currentView === 'week') renderWeekView();
  else if (state.currentView === 'month') renderMonthView();
  else if (state.currentView === 'year') renderYearView();
}

document.addEventListener('DOMContentLoaded', () => {
  loadTasks();

  // Chuyển view
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
  });

  // Điều hướng ngày
  document.getElementById('btnPrevDate').addEventListener('click', () => navigateDate(-1));
  document.getElementById('btnNextDate').addEventListener('click', () => navigateDate(1));
  document.getElementById('btnToday').addEventListener('click', () => {
    state.currentDate = new Date();
    renderApp();
  });

  // Modal thêm task
  document.getElementById('btnOpenAddModal').addEventListener('click', () => openAddTaskModal());
  document.getElementById('btnQuickAddTaskDay').addEventListener('click', () => openAddTaskModal());
  document.getElementById('btnCloseModal').addEventListener('click', closeTaskModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeTaskModal);

  // Form submit
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTaskFromForm({
      id: document.getElementById('taskId').value,
      title: document.getElementById('taskTitle').value.trim(),
      date: document.getElementById('taskDate').value,
      priority: document.getElementById('taskPriority').value,
      category: document.getElementById('taskCategory').value.trim(),
      note: document.getElementById('taskNote').value.trim()
    });
    closeTaskModal();
  });

  // Replan Center Modal
  document.getElementById('btnReplanCenter').addEventListener('click', openReplanModal);
  document.getElementById('btnBannerOpenReplan').addEventListener('click', openReplanModal);
  document.getElementById('btnCloseReplanModal').addEventListener('click', closeReplanModal);
  document.getElementById('btnReplanAllToToday').addEventListener('click', replanAllOverdueToToday);

  // Export / Import
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnImportTrigger').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importData(e.target.files[0]);
    }
  });

  // Render đầu tiên
  renderApp();
  lucide.createIcons();
});
