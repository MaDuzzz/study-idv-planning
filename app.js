/**
 * Study & Life Planner - Main Application Logic
 * Vanilla JavaScript (Zero build dependencies, works seamlessly on GitHub Pages)
 */

// --- 1. STATE, AUTH & STORAGE MANAGEMENT ---
const STORAGE_KEY = 'study_planner_tasks_v1';
const AUTH_TOKEN_KEY = 'study_planner_auth_session';
const ADMIN_PW_KEY = 'study_planner_admin_password';

let state = {
  isAdmin: false,
  currentView: 'week', // Mặc định mở view Tuần
  currentDate: new Date(), // Ngày đang xem
  tasks: []
};

// Kiểm tra trạng thái đăng nhập
function checkAuthStatus() {
  const isAuthLocal = localStorage.getItem(AUTH_TOKEN_KEY) === 'authenticated';
  const isAuthSession = sessionStorage.getItem(AUTH_TOKEN_KEY) === 'authenticated';
  state.isAdmin = isAuthLocal || isAuthSession;
}

function getStoredPassword() {
  return localStorage.getItem(ADMIN_PW_KEY) || 'admin123';
}

function loginAdmin(inputPassword, rememberMe) {
  const currentPassword = getStoredPassword();
  if (inputPassword === currentPassword) {
    state.isAdmin = true;
    if (rememberMe) {
      localStorage.setItem(AUTH_TOKEN_KEY, 'authenticated');
    } else {
      sessionStorage.setItem(AUTH_TOKEN_KEY, 'authenticated');
    }
    return true;
  }
  return false;
}

function logoutAdmin() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  state.isAdmin = false;
  renderApp();
}

function changeAdminPassword(currentPw, newPw) {
  const storedPw = getStoredPassword();
  if (currentPw !== storedPw) {
    return { success: false, message: 'Mật khẩu hiện tại không đúng!' };
  }
  if (!newPw || newPw.length < 4) {
    return { success: false, message: 'Mật khẩu mới phải từ 4 ký tự trở lên!' };
  }
  localStorage.setItem(ADMIN_PW_KEY, newPw);
  return { success: true, message: 'Đổi mật khẩu thành công!' };
}

// Khởi tạo dữ liệu mẫu nếu lần đầu truy cập
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
        note: 'Task này bị trễ hạn từ hôm qua để test thông báo chuông & tính năng Replan!',
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
  if (!state.isAdmin) return;
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

function getTomorrowStr() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function getNextWeekStr() {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return formatDate(nextWeek);
}

function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isOverdue(task) {
  return task.date < getTodayStr() && !task.completed;
}

// --- 3. NOTIFICATION BELL HUB (TRUNG TÂM THÔNG BÁO DUY NHẤT) ---
function getOverdueTasks() {
  const todayStr = getTodayStr();
  return state.tasks.filter(t => t.date < todayStr && !t.completed);
}

// Toàn bộ các thông báo, cảnh báo đều được tổng hợp và đưa vào dropdown Chuông
function updateNotificationBell() {
  const overdueTasks = getOverdueTasks();
  const todayTasks = state.tasks.filter(t => t.date === getTodayStr());
  const pendingToday = todayTasks.filter(t => !t.completed);
  const highlyPostponed = state.tasks.filter(t => (t.replanCount || 0) >= 3 && !t.completed);

  const notifications = [];

  // 1. Thông báo quyền Khách (Chỉ xem)
  if (!state.isAdmin) {
    notifications.push({
      badgeColor: 'bg-blue-50/90 border-blue-200 text-blue-900',
      icon: 'shield-alert',
      iconColor: 'text-blue-600',
      title: 'Chế độ xem (Chỉ đọc)',
      desc: 'Bạn đang xem kế hoạch ở chế độ khách. Hãy đăng nhập Admin để thêm, sửa, xóa hoặc tích hoàn thành.',
      actionHtml: `<button onclick="openLoginModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Đăng nhập ngay</button>`
    });
  }

  // 2. Cảnh báo trễ hạn cần Replan (Rất quan trọng)
  if (overdueTasks.length > 0) {
    notifications.push({
      badgeColor: 'bg-amber-50/90 border-amber-200 text-amber-900',
      icon: 'alert-triangle',
      iconColor: 'text-amber-600',
      title: `Có ${overdueTasks.length} nhiệm vụ trễ hạn!`,
      desc: 'Nhiệm vụ từ những ngày trước chưa hoàn thành. Hãy mở Replan Center để dời sang hôm nay, ngày mai hoặc tuần sau.',
      actionHtml: state.isAdmin
        ? `<button onclick="openReplanModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Mở Replan Center</button>`
        : `<button onclick="openLoginModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Đăng nhập để Replan</button>`
    });
  }

  // 3. Cảnh báo các task bị hoãn quá nhiều lần (>= 3 lần)
  if (highlyPostponed.length > 0 && state.isAdmin) {
    notifications.push({
      badgeColor: 'bg-rose-50/90 border-rose-200 text-rose-900',
      icon: 'alert-octagon',
      iconColor: 'text-rose-600',
      title: `${highlyPostponed.length} task bị dời quá 3 lần`,
      desc: `Task "${escapeHtml(highlyPostponed[0].title)}" đang bị trì hoãn nhiều lần. Bạn nên xem xét chia nhỏ nó ra hoặc giảm độ khó.`,
      actionHtml: `<button onclick="openReplanModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Xem chi tiết</button>`
    });
  }

  // 4. Nhắc nhở tiến độ hôm nay (Nếu là Admin)
  if (state.isAdmin && pendingToday.length > 0) {
    notifications.push({
      badgeColor: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: 'calendar-clock',
      iconColor: 'text-blue-600',
      title: `Hôm nay còn ${pendingToday.length} việc cần làm`,
      desc: `Đã xong ${todayTasks.length - pendingToday.length}/${todayTasks.length} nhiệm vụ (${Math.round(((todayTasks.length - pendingToday.length)/todayTasks.length)*100)}%). Cố gắng hoàn thành nhé!`,
      actionHtml: ''
    });
  } else if (state.isAdmin && todayTasks.length > 0 && pendingToday.length === 0) {
    notifications.push({
      badgeColor: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      icon: 'party-popper',
      iconColor: 'text-emerald-600',
      title: 'Mục tiêu hôm nay hoàn tất!',
      desc: 'Tuyệt vời! Bạn đã hoàn thành 100% nhiệm vụ đặt ra cho hôm nay 🎉',
      actionHtml: ''
    });
  }

  // Cập nhật số đếm trên badge chuông
  const badge = document.getElementById('notifBadge');
  const dropdownBadge = document.getElementById('notifDropdownBadge');
  const listContainer = document.getElementById('notifList');

  // Đếm các thông báo quan trọng (quá hạn hoặc chưa login)
  const alertCount = overdueTasks.length + (state.isAdmin ? 0 : 1);

  if (alertCount > 0) {
    badge.classList.remove('hidden');
    badge.textContent = alertCount;
  } else {
    badge.classList.add('hidden');
  }

  dropdownBadge.textContent = `${notifications.length} mục`;

  if (notifications.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-6 text-slate-400 flex flex-col items-center justify-center gap-1.5">
        <i data-lucide="check-circle-2" class="w-8 h-8 text-emerald-500 opacity-80"></i>
        <p class="text-xs font-bold text-slate-600">Bạn không có thông báo hay cảnh báo nào!</p>
      </div>
    `;
  } else {
    listContainer.innerHTML = notifications.map(n => `
      <div class="p-3 rounded-xl border flex items-start gap-2.5 ${n.badgeColor}">
        <i data-lucide="${n.icon}" class="w-4 h-4 ${n.iconColor} shrink-0 mt-0.5"></i>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-xs leading-snug">${n.title}</div>
          <p class="text-xs mt-0.5 leading-relaxed opacity-90">${n.desc}</p>
          ${n.actionHtml}
        </div>
      </div>
    `).join('');
  }

  lucide.createIcons();
}

function toggleNotifDropdown(forceState = null) {
  const dropdown = document.getElementById('notifDropdown');
  if (forceState !== null) {
    dropdown.classList.toggle('hidden', !forceState);
  } else {
    dropdown.classList.toggle('hidden');
  }
}

function replanTask(taskId, targetDateStr) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  if (!targetDateStr) return;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.date = targetDateStr;
  task.replanCount = (task.replanCount || 0) + 1;
  saveCurrentTasks();
  renderApp();
  renderReplanModalContent();
}

function replanAllOverdueToToday() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
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

function replanAllOverdueToNextWeek() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const nextWeekStr = getNextWeekStr();
  const overdueTasks = getOverdueTasks();
  overdueTasks.forEach(task => {
    task.date = nextWeekStr;
    task.replanCount = (task.replanCount || 0) + 1;
  });
  saveCurrentTasks();
  renderApp();
  closeReplanModal();
}

// --- 4. TASK CRUD (Chỉ Admin) ---
function toggleTaskComplete(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveCurrentTasks();
    renderApp();
  }
}

function deleteTask(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveCurrentTasks();
    renderApp();
    renderReplanModalContent();
  }
}

function saveTaskFromForm(formData) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
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

// --- 5. RENDER VIEWS & UI UPDATE ---

function updateAuthUI() {
  const adminGroup = document.getElementById('adminActionGroup');
  const guestGroup = document.getElementById('guestActionGroup');
  const btnQuickAdd = document.getElementById('btnQuickAddTaskDay');
  const emptyHint = document.getElementById('emptyStateAdminHint');

  if (state.isAdmin) {
    adminGroup.classList.remove('hidden');
    adminGroup.classList.add('flex');
    guestGroup.classList.add('hidden');
    guestGroup.classList.remove('flex');
    btnQuickAdd.classList.remove('hidden');
    btnQuickAdd.classList.add('flex');
    if (emptyHint) emptyHint.textContent = 'Bấm "Thêm Task" ở góc trên để bắt đầu lên kế hoạch!';
  } else {
    adminGroup.classList.add('hidden');
    adminGroup.classList.remove('flex');
    guestGroup.classList.remove('hidden');
    guestGroup.classList.add('flex');
    btnQuickAdd.classList.add('hidden');
    btnQuickAdd.classList.remove('flex');
    if (emptyHint) emptyHint.textContent = 'Đăng nhập Admin để bắt đầu lên kế hoạch!';
  }
}

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

  const priorityScore = { high: 3, medium: 2, low: 1 };
  tasksForDay.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
  });

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const nextWeekStr = getNextWeekStr();

  listContainer.innerHTML = tasksForDay.map(task => {
    const taskIsOverdue = isOverdue(task);
    const priorityBadge = {
      high: '<span class="px-2 py-0.5 text-xs font-bold rounded-md bg-red-50 text-red-600 border border-red-200">🔥 Ưu tiên cao</span>',
      medium: '<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">Bình thường</span>',
      low: '<span class="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-50 text-slate-400">Thấp</span>'
    }[task.priority] || '';

    const replanBadge = (task.replanCount && task.replanCount > 0)
      ? `<span class="px-2.5 py-0.5 text-xs font-bold rounded-md ${task.replanCount >= 3 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}" title="Đã bị dời ${task.replanCount} lần">
          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 inline"></i> Đã dời ${task.replanCount} lần
        </span>`
      : '';

    // Checkbox: Nếu chưa đăng nhập, bấm vào sẽ gọi openLoginModal()
    const checkboxHtml = state.isAdmin
      ? `<button onclick="toggleTaskComplete('${task.id}')" title="Bấm để đánh dấu hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition ${task.completed ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 hover:border-blue-500 bg-white'}">
          ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
        </button>`
      : `<button onclick="openLoginModal()" title="Chỉ đọc - Đăng nhập Admin để tích hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${task.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-200 bg-slate-100 hover:border-blue-400'} cursor-pointer">
          ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
        </button>`;

    // Thanh Replan (Chỉ hiện cho Admin)
    const replanToolbar = (taskIsOverdue && state.isAdmin)
      ? `<div class="pt-2.5 flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-amber-700 flex items-center gap-1">
            <i data-lucide="calendar-sync" class="w-4 h-4"></i> Dời lịch sang:
          </span>
          <button onclick="replanTask('${task.id}', '${todayStr}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs">
            Hôm nay
          </button>
          <button onclick="replanTask('${task.id}', '${tomorrowStr}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border">
            Ngày mai
          </button>
          <button onclick="replanTask('${task.id}', '${nextWeekStr}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border">
            Tuần sau (+7d)
          </button>
          <input type="date" min="${todayStr}" onchange="replanTask('${task.id}', this.value)" title="Chọn ngày cụ thể khác" class="text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white cursor-pointer hover:border-blue-400">
        </div>`
      : '';

    // Action tools (Chỉnh sửa / Xóa - Chỉ hiện cho Admin)
    const adminActionTools = state.isAdmin
      ? `<div class="flex items-center gap-1.5 self-end sm:self-start">
          <button onclick="openEditTaskModal('${task.id}')" title="Chỉnh sửa" class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa" class="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>`
      : '';

    return `
      <div class="bg-white rounded-2xl p-4 sm:p-5 border transition duration-200 hover:shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 ${taskIsOverdue ? 'border-amber-400 bg-amber-50/25 ring-1 ring-amber-200' : 'border-slate-200'} ${task.completed ? 'opacity-60 bg-slate-50/60' : ''}">
        <div class="flex items-start gap-3.5 flex-1">
          ${checkboxHtml}
          
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-bold text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}">${escapeHtml(task.title)}</span>
              ${priorityBadge}
              ${task.category ? `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-600 border border-blue-100">${escapeHtml(task.category)}</span>` : ''}
              ${replanBadge}
            </div>
            ${task.note ? `<p class="text-xs sm:text-sm text-slate-500">${escapeHtml(task.note)}</p>` : ''}
            ${replanToolbar}
          </div>
        </div>

        ${adminActionTools}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// C. Render Week View (TO HƠN, RỘNG RÃI, DỄ THAO TÁC)
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

  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  container.innerHTML = days.map((dayDate, idx) => {
    const dateStr = formatDate(dayDate);
    const isToday = dateStr === getTodayStr();
    const tasks = state.tasks.filter(t => t.date === dateStr);
    const completedCount = tasks.filter(t => t.completed).length;

    const addBtnHtml = state.isAdmin
      ? `<div class="p-3 border-t border-slate-100 mt-auto bg-slate-50/50 rounded-b-2xl">
          <button onclick="openAddTaskModalForDate('${dateStr}')" class="w-full py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
            <i data-lucide="plus" class="w-4 h-4"></i> Thêm nhiệm vụ
          </button>
        </div>`
      : '';

    return `
      <div class="bg-white rounded-2xl border ${isToday ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 shadow-xs'} flex flex-col min-h-[520px] transition hover:shadow-md">
        
        <!-- Day Column Header -->
        <div class="p-4 border-b border-slate-100 flex items-center justify-between ${isToday ? 'bg-blue-50/70' : 'bg-slate-50/60'} rounded-t-2xl">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider ${idx >= 5 ? 'text-red-500' : 'text-slate-500'}">${dayNames[idx]}</span>
            <div class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">${dayDate.getDate()}/${dayDate.getMonth() + 1}</div>
          </div>
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'} shadow-2xs">
            ${completedCount}/${tasks.length}
          </span>
        </div>

        <!-- Task List inside day -->
        <div class="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
          ${tasks.length === 0 ? `
            <div class="text-xs text-slate-400 text-center py-16 flex flex-col items-center justify-center gap-1.5">
              <i data-lucide="clipboard-check" class="w-8 h-8 text-slate-200"></i>
              <span>Không có task</span>
            </div>` : ''}
          
          ${tasks.map(t => {
            const taskIsOverdue = isOverdue(t);
            const priorityDot = {
              high: '<span class="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Ưu tiên cao"></span>',
              medium: '<span class="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Bình thường"></span>',
              low: '<span class="w-2 h-2 rounded-full bg-slate-300 shrink-0" title="Thấp"></span>'
            }[t.priority] || '';

            return `
              <div onclick="openDayFromGrid('${dateStr}')" class="p-3 rounded-xl border transition-all duration-150 cursor-pointer hover:shadow-sm ${taskIsOverdue ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200 hover:border-blue-300'} ${t.completed ? 'opacity-60 bg-slate-50/70' : ''}">
                <div class="flex items-start gap-2.5">
                  <!-- Checkbox: Nếu là khách thì bấm vào mở modal đăng nhập -->
                  ${state.isAdmin ? `
                    <button onclick="event.stopPropagation(); toggleTaskComplete('${t.id}')" title="Tích hoàn thành" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${t.completed ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 hover:border-blue-500 bg-white'}">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>
                  ` : `
                    <button onclick="event.stopPropagation(); openLoginModal()" title="Chỉ đọc - Đăng nhập để hoàn thành task" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${t.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-200 bg-slate-100 hover:border-blue-400'} cursor-pointer">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>
                  `}
                  
                  <!-- Nội dung task -->
                  <div class="flex-1 min-w-0">
                    <div class="text-xs sm:text-sm font-semibold text-slate-800 leading-snug break-words ${t.completed ? 'line-through text-slate-400' : ''}">
                      ${escapeHtml(t.title)}
                    </div>
                    
                    <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                      ${priorityDot}
                      ${t.category ? `<span class="text-[10px] sm:text-xs px-2 py-0.5 font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-100">${escapeHtml(t.category)}</span>` : ''}
                      ${t.replanCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 font-semibold rounded bg-amber-100 text-amber-800">Dời ${t.replanCount} lần</span>` : ''}
                      ${taskIsOverdue ? `<span class="text-[10px] font-bold text-amber-700">⚠️ Trễ hạn</span>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${addBtnHtml}
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
        <div onclick="openDayFromGrid('${dateStr}')" class="min-h-[110px] p-2 sm:p-2.5 rounded-2xl border cursor-pointer hover:border-blue-400 transition bg-white flex flex-col justify-between ${isToday ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs' : 'border-slate-200'}">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}">${dayNum}</span>
            ${overdueTasks.length > 0 ? `<span class="w-2.5 h-2.5 rounded-full bg-amber-500" title="Có task trễ hạn"></span>` : ''}
          </div>
          
          <div class="space-y-1 my-1.5 overflow-hidden">
            ${tasks.slice(0, 2).map(t => `
              <div class="text-[11px] px-2 py-0.5 rounded truncate ${t.completed ? 'bg-slate-100 text-slate-400 line-through' : 'bg-blue-50 text-blue-700 font-semibold'}">
                ${escapeHtml(t.title)}
              </div>
            `).join('')}
            ${tasks.length > 2 ? `<div class="text-[10px] text-slate-400 font-medium pl-1">+${tasks.length - 2} task nữa</div>` : ''}
          </div>

          <div class="text-[11px] text-slate-400 text-right font-medium">
            ${tasks.length > 0 ? `${tasks.filter(t => t.completed).length}/${tasks.length}` : ''}
          </div>
        </div>
      `;
    } else {
      html += `<div class="min-h-[110px] p-2 bg-slate-50/50 rounded-2xl border border-slate-100"></div>`;
    }
  }

  container.innerHTML = html;
}

// E. Render Year Heatmap View (GitHub-style Contribution)
function renderYearView() {
  const container = document.getElementById('yearHeatmapContainer');
  const year = state.currentDate.getFullYear();

  let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">`;

  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1);
    const monthName = monthDate.toLocaleDateString('vi-VN', { month: 'long' });
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    html += `
      <div class="p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
        <h4 class="text-xs sm:text-sm font-bold text-slate-800 capitalize mb-3">${monthName}</h4>
        <div class="grid grid-cols-7 gap-1.5">
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
        <div onclick="openDayFromGrid('${dateStr}')" title="${dateStr}: ${completed}/${tasks.length} hoàn thành" class="w-5 h-5 sm:w-6 sm:h-6 rounded-md border text-[10px] flex items-center justify-center cursor-pointer transition hover:scale-115 ${colorClass}">
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
      btn.className = 'view-btn px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-white text-blue-600 shadow-xs';
    } else {
      btn.className = 'view-btn px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-600 hover:text-slate-900';
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
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const changePwModal = document.getElementById('changePwModal');
const changePwForm = document.getElementById('changePwForm');

function openAddTaskModal(initialDate = null) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  taskForm.reset();
  document.getElementById('taskId').value = '';
  document.getElementById('modalTitle').textContent = 'Thêm nhiệm vụ mới';
  document.getElementById('taskDate').value = initialDate || formatDate(state.currentDate);
  taskModal.classList.remove('hidden');
}

function openAddTaskModalForDate(dateStr) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  openAddTaskModal(dateStr);
}

function openEditTaskModal(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
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
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  renderReplanModalContent();
  replanModal.classList.remove('hidden');
}

function closeReplanModal() {
  replanModal.classList.add('hidden');
}

function openLoginModal() {
  loginForm.reset();
  document.getElementById('loginErrorMsg').classList.add('hidden');
  loginModal.classList.remove('hidden');
  document.getElementById('loginPassword').focus();
}

function closeLoginModal() {
  loginModal.classList.add('hidden');
}

function openChangePwModal() {
  changePwForm.reset();
  document.getElementById('changePwErrorMsg').classList.add('hidden');
  changePwModal.classList.remove('hidden');
  document.getElementById('userDropdown').classList.add('hidden');
}

function closeChangePwModal() {
  changePwModal.classList.add('hidden');
}

function renderReplanModalContent() {
  const listContainer = document.getElementById('replanTaskList');
  const overdueTasks = getOverdueTasks();

  if (overdueTasks.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-500 mx-auto mb-2"></i>
        <p class="font-bold text-slate-700 text-base">Tuyệt vời! Bạn không còn nhiệm vụ nào bị quá hạn.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const nextWeekStr = getNextWeekStr();

  listContainer.innerHTML = overdueTasks.map(task => {
    return `
      <div class="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-slate-800 text-sm sm:text-base">${escapeHtml(task.title)}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold">Ngày cũ: ${task.date}</span>
            ${task.replanCount > 0 ? `<span class="text-xs px-2 py-0.5 rounded-md bg-amber-200 text-amber-800 font-semibold">Đã dời ${task.replanCount} lần</span>` : ''}
          </div>
          ${task.note ? `<p class="text-xs sm:text-sm text-slate-500 mt-1">${escapeHtml(task.note)}</p>` : ''}
        </div>

        <div class="flex items-center gap-2 flex-wrap self-end sm:self-center">
          <button onclick="replanTask('${task.id}', '${todayStr}')" title="Dời về ngày hôm nay" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs">
            Hôm nay
          </button>
          <button onclick="replanTask('${task.id}', '${tomorrowStr}')" title="Dời sang ngày mai" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border">
            Ngày mai
          </button>
          <button onclick="replanTask('${task.id}', '${nextWeekStr}')" title="Dời sang 7 ngày tới" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border">
            Tuần sau (+7d)
          </button>
          <input type="date" min="${todayStr}" onchange="replanTask('${task.id}', this.value)" title="Chọn ngày bất kỳ" class="text-xs px-2.5 py-1 border border-slate-300 rounded-xl bg-white cursor-pointer hover:border-blue-400">
          
          <button onclick="toggleTaskComplete('${task.id}')" title="Đánh dấu đã hoàn thành" class="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded-lg transition">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa bỏ task này" class="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// --- 8. EXPORT & IMPORT (Chỉ Admin) ---
function exportData() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.tasks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `study-planner-backup-${getTodayStr()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(file) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
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
  updateAuthUI();
  updateHeaderDisplay();
  updateNotificationBell();

  if (state.currentView === 'day') renderDayView();
  else if (state.currentView === 'week') renderWeekView();
  else if (state.currentView === 'month') renderMonthView();
  else if (state.currentView === 'year') renderYearView();
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
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

  // Chuông thông báo
  const btnNotifBell = document.getElementById('btnNotifBell');
  btnNotifBell.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotifDropdown();
  });

  // Click ra ngoài đóng chuông thông báo & menu user
  document.addEventListener('click', (e) => {
    const notifContainer = document.getElementById('notifBellContainer');
    if (notifContainer && !notifContainer.contains(e.target)) {
      toggleNotifDropdown(false);
    }
    const userContainer = document.getElementById('userMenuContainer');
    if (userContainer && !userContainer.contains(e.target)) {
      document.getElementById('userDropdown').classList.add('hidden');
    }
  });

  // Auth: Mở Login Modal
  document.getElementById('btnOpenLoginModal').addEventListener('click', openLoginModal);
  document.getElementById('btnCloseLoginModal').addEventListener('click', closeLoginModal);
  document.getElementById('btnCancelLoginModal').addEventListener('click', closeLoginModal);

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    if (loginAdmin(pw, remember)) {
      closeLoginModal();
      renderApp();
    } else {
      document.getElementById('loginErrorMsg').classList.remove('hidden');
    }
  });

  // Admin User Dropdown Menu
  const btnUserMenu = document.getElementById('btnUserMenu');
  const userDropdown = document.getElementById('userDropdown');
  btnUserMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    userDropdown.classList.add('hidden');
    logoutAdmin();
  });

  // Đổi mật khẩu
  document.getElementById('btnOpenChangePwModal').addEventListener('click', openChangePwModal);
  document.getElementById('btnCloseChangePwModal').addEventListener('click', closeChangePwModal);
  document.getElementById('btnCancelChangePwModal').addEventListener('click', closeChangePwModal);

  changePwForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const curr = document.getElementById('currentPw').value;
    const next = document.getElementById('newPw').value;
    const res = changeAdminPassword(curr, next);
    const errEl = document.getElementById('changePwErrorMsg');
    if (res.success) {
      alert(res.message);
      closeChangePwModal();
    } else {
      errEl.textContent = res.message;
      errEl.classList.remove('hidden');
    }
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
  document.getElementById('btnCloseReplanModal').addEventListener('click', closeReplanModal);
  document.getElementById('btnReplanAllToToday').addEventListener('click', replanAllOverdueToToday);
  document.getElementById('btnReplanAllToNextWeek').addEventListener('click', replanAllOverdueToNextWeek);

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

  renderApp();
  lucide.createIcons();
});
