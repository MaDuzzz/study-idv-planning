/**
 * Study & Life Planner - Main Application Logic
 * Vanilla JavaScript (Zero build dependencies, works seamlessly on GitHub Pages)
 */

// --- 1. STATE, AUTH, THEME & STORAGE MANAGEMENT ---
const STORAGE_KEY = 'study_planner_tasks_v1';
const PARENT_STORAGE_KEY = 'study_planner_parent_tasks_v1';
const AUTH_TOKEN_KEY = 'study_planner_auth_session';
const ADMIN_PW_KEY = 'study_planner_admin_password';
const THEME_KEY = 'study_planner_theme';

// Bảng màu RGB gợi ý nhanh và ánh xạ tương thích ngược
const PRESET_RGB_COLORS = [
  { name: 'Xanh dương', hex: '#2563eb', legacyKey: 'blue' },
  { name: 'Xanh ngọc', hex: '#059669', legacyKey: 'emerald' },
  { name: 'Tím violet', hex: '#7c3aed', legacyKey: 'purple' },
  { name: 'Vàng cam', hex: '#d97706', legacyKey: 'amber' },
  { name: 'Đỏ hồng', hex: '#e11d48', legacyKey: 'rose' },
  { name: 'Chàm indigo', hex: '#4f46e5', legacyKey: 'indigo' },
  { name: 'Xanh lơ cyan', hex: '#0891b2', legacyKey: 'cyan' },
  { name: 'Hồng sen', hex: '#db2777', legacyKey: 'pink' }
];

const LEGACY_COLOR_HEX = {
  blue: '#2563eb',
  emerald: '#059669',
  purple: '#7c3aed',
  amber: '#d97706',
  rose: '#e11d48',
  indigo: '#4f46e5',
  cyan: '#0891b2',
  pink: '#db2777'
};

function hexToRgb(hex) {
  if (!hex) return { r: 37, g: 99, b: 235 };
  let c = String(hex).replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  if (c.length !== 6) {
    return { r: 37, g: 99, b: 235 };
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 37, g: 99, b: 235 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

const PARENT_COLOR_PALETTES = {
  blue: {
    name: 'Xanh dương',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/80',
    cardHeader: 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/80',
    btnBg: 'bg-blue-600',
    ring: 'ring-blue-400'
  },
  emerald: {
    name: 'Xanh ngọc',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/80',
    cardHeader: 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80',
    btnBg: 'bg-emerald-600',
    ring: 'ring-emerald-400'
  },
  purple: {
    name: 'Tím violet',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/80',
    cardHeader: 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/80',
    btnBg: 'bg-purple-600',
    ring: 'ring-purple-400'
  },
  amber: {
    name: 'Vàng cam',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700/80',
    cardHeader: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80',
    btnBg: 'bg-amber-500',
    ring: 'ring-amber-400'
  },
  rose: {
    name: 'Đỏ hồng',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700/80',
    cardHeader: 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80',
    btnBg: 'bg-rose-600',
    ring: 'ring-rose-400'
  },
  indigo: {
    name: 'Chàm indigo',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700/80',
    cardHeader: 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/80',
    btnBg: 'bg-indigo-600',
    ring: 'ring-indigo-400'
  },
  cyan: {
    name: 'Xanh lơ cyan',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700/80',
    cardHeader: 'bg-cyan-50/90 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/80',
    btnBg: 'bg-cyan-600',
    ring: 'ring-cyan-400'
  },
  pink: {
    name: 'Hồng sen',
    dot: 'bg-pink-500',
    badge: 'bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-200 border border-pink-200 dark:border-pink-700/80',
    cardHeader: 'bg-pink-50/90 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800/80',
    btnBg: 'bg-pink-600',
    ring: 'ring-pink-400'
  }
};

let state = {
  isAdmin: false,
  currentUser: null,           // Google Firebase User { uid, email, displayName, photoURL }
  isCloudSync: false,          // Đang đồng bộ Firestore đám mây
  currentView: 'week',         // Mặc định mở view Tuần
  currentDate: new Date(),     // Ngày đang xem
  tasks: [],
  parentTasks: [],             // Danh sách các Task tổng { id, title, color, description, createdAt }
  taskManagerFilter: 'all',    // Bộ lọc kho task: 'all' | 'unscheduled' | 'scheduled' | 'completed'
  taskManagerSearch: '',       // Chuỗi tìm kiếm trong kho task
  activeDetailTaskId: null,    // ID của task đang mở chi tiết & editor
  firestoreUnsubscribe: null,  // Hàm hủy lắng nghe realtime Firestore Tasks
  firestoreParentUnsubscribe: null // Hàm hủy lắng nghe realtime Firestore Parent Tasks
};

// Quản lý Dark Mode
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  lucide.createIcons();
}

// Kiểm tra trạng thái đăng nhập Local
function checkAuthStatus() {
  if (state.currentUser) {
    state.isAdmin = true;
    return;
  }
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

async function logoutAdmin() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  
  if (typeof stopDriveAutoSyncTimer === 'function') {
    stopDriveAutoSyncTimer();
  }

  if (window.StudyPlannerFirebase && state.currentUser) {
    await window.StudyPlannerFirebase.signOutUser();
  }
  
  if (state.firestoreUnsubscribe) {
    state.firestoreUnsubscribe();
    state.firestoreUnsubscribe = null;
  }

  if (state.firestoreParentUnsubscribe) {
    state.firestoreParentUnsubscribe();
    state.firestoreParentUnsubscribe = null;
  }

  state.currentUser = null;
  state.isCloudSync = false;
  state.isAdmin = false;
  
  // Nạp lại danh sách task local hoặc mẫu
  loadTasks();
  loadParentTasks();
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

// Callback toàn cục nhận thông báo thay đổi Auth từ firebase-config.js
window.handleAuthStateChange = (user) => {
  if (user) {
    state.currentUser = user;
    state.isAdmin = true;
    state.isCloudSync = true;
    console.log('Multi-tenant: Đã đăng nhập người dùng', user.email, 'UID:', user.uid);

    updateAuthUI();

    // Hủy đăng ký listener cũ nếu có
    if (state.firestoreUnsubscribe) {
      state.firestoreUnsubscribe();
      state.firestoreUnsubscribe = null;
    }
    if (state.firestoreParentUnsubscribe) {
      state.firestoreParentUnsubscribe();
      state.firestoreParentUnsubscribe = null;
    }

    // Đăng ký lắng nghe Firestore của riêng user này: users/{uid}/tasks
    state.firestoreUnsubscribe = window.StudyPlannerFirebase.listenToUserTasks(
      user.uid,
      (cloudTasks) => {
        console.log(`Đã đồng bộ ${cloudTasks.length} task từ Firestore của ${user.email}`);
        state.tasks = cloudTasks || [];
        saveTasksToStorage(state.tasks); // Cache lại local
        renderApp();
        if (!document.getElementById('taskManagerModal').classList.contains('hidden')) {
          renderTaskManagerContent();
        }
      },
      (err) => {
        console.warn('Lỗi kết nối Firestore, sử dụng dữ liệu cục bộ:', err);
      }
    );

    // Đăng ký lắng nghe Firestore parent tasks: users/{uid}/parentTasks
    state.firestoreParentUnsubscribe = window.StudyPlannerFirebase.listenToUserParentTasks(
      user.uid,
      (cloudParents) => {
        console.log(`Đã đồng bộ ${cloudParents.length} task tổng từ Firestore của ${user.email}`);
        state.parentTasks = cloudParents || [];
        saveParentTasksToStorage(state.parentTasks);
        renderApp();
        if (!document.getElementById('taskManagerModal').classList.contains('hidden')) {
          renderTaskManagerContent();
        }
      },
      (err) => {
        console.warn('Lỗi kết nối Firestore Parent Tasks, sử dụng dữ liệu cục bộ:', err);
      }
    );
  } else {
    state.currentUser = null;
    state.isCloudSync = false;
    if (state.firestoreUnsubscribe) {
      state.firestoreUnsubscribe();
      state.firestoreUnsubscribe = null;
    }
    if (state.firestoreParentUnsubscribe) {
      state.firestoreParentUnsubscribe();
      state.firestoreParentUnsubscribe = null;
    }
    checkAuthStatus();
    loadParentTasks();
    renderApp();
  }
};

// Khởi tạo dữ liệu mẫu Task tổng (Parent Tasks) nếu lần đầu truy cập
function initSampleParentTasksIfEmpty() {
  const existing = localStorage.getItem(PARENT_STORAGE_KEY);
  if (!existing) {
    const sampleParents = [
      {
        id: 'parent-1',
        title: 'Nghiên cứu & Học thuật',
        tag: 'NCHT',
        color: 'blue',
        description: 'Mục tiêu nghiên cứu, đọc bài báo, và hoàn thành các môn học chính',
        createdAt: new Date().toISOString()
      },
      {
        id: 'parent-2',
        title: 'Ngoại ngữ & Kỹ năng (IELTS / TOEIC)',
        tag: 'NNKN',
        color: 'emerald',
        description: 'Kế hoạch nâng cao phản xạ từ vựng, ngữ pháp và luyện thi',
        createdAt: new Date().toISOString()
      },
      {
        id: 'parent-3',
        title: 'Dự án Công nghệ & Website',
        tag: 'CNTT',
        color: 'purple',
        description: 'Xây dựng các milestone sản phẩm, tính năng và tối ưu hóa hệ thống',
        createdAt: new Date().toISOString()
      }
    ];
    saveParentTasksToStorage(sampleParents);
    return sampleParents;
  }
  try {
    return JSON.parse(existing) || [];
  } catch (e) {
    return [];
  }
}

function loadParentTasks() {
  state.parentTasks = initSampleParentTasksIfEmpty();
}

function saveParentTasksToStorage(parentTasks) {
  try {
    localStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify(parentTasks));
  } catch (e) {
    console.warn('LocalStorage không thể lưu Parent Tasks:', e);
  }
}

async function saveSingleParentTask(parentTask) {
  const idx = state.parentTasks.findIndex(p => p.id === parentTask.id);
  if (idx >= 0) {
    state.parentTasks[idx] = parentTask;
  } else {
    state.parentTasks.push(parentTask);
  }
  saveParentTasksToStorage(state.parentTasks);
  if (state.currentUser && window.StudyPlannerFirebase) {
    await window.StudyPlannerFirebase.saveParentTaskToFirestore(state.currentUser.uid, parentTask);
  }
}

async function deleteSingleParentTask(parentTaskId) {
  state.parentTasks = state.parentTasks.filter(p => p.id !== parentTaskId);
  saveParentTasksToStorage(state.parentTasks);

  // Gỡ liên kết parentId của các sub-task thuộc parent này
  let updatedAny = false;
  state.tasks.forEach(t => {
    if (t.parentId === parentTaskId) {
      t.parentId = null;
      updatedAny = true;
    }
  });
  if (updatedAny) {
    saveTasksToStorage(state.tasks);
  }

  if (state.currentUser && window.StudyPlannerFirebase) {
    await window.StudyPlannerFirebase.deleteParentTaskFromFirestore(state.currentUser.uid, parentTaskId);
  }
}

function getParentTask(parentId) {
  if (!parentId) return null;
  return state.parentTasks.find(p => p.id === parentId) || null;
}

function getParentColorConfig(color) {
  let hex = '#2563eb';
  if (color && typeof color === 'string') {
    const trimmed = color.trim();
    if (PARENT_COLOR_PALETTES[trimmed]) {
      const p = PARENT_COLOR_PALETTES[trimmed];
      hex = p.hex || LEGACY_COLOR_HEX[trimmed] || '#2563eb';
      const rgb = hexToRgb(hex);
      return {
        ...p,
        hex: hex,
        dotStyle: `background-color: ${hex};`,
        badgeStyle: `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14); color: ${hex}; border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35);`,
        cardHeaderStyle: `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08); border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22);`
      };
    }
    hex = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
  }
  const rgb = hexToRgb(hex);
  return {
    name: hex,
    hex: hex,
    dot: '',
    dotStyle: `background-color: ${hex};`,
    badge: 'font-mono font-bold',
    badgeStyle: `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14); color: ${hex}; border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35);`,
    cardHeader: 'border-b',
    cardHeaderStyle: `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08); border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22);`,
    btnBg: '',
    btnBgStyle: `background-color: ${hex};`,
    ring: ''
  };
}

// Bỏ dấu tiếng Việt phục vụ tạo mã tag viết tắt
function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tự động sinh mã Tag viết tắt từ Tên Task tổng (tối đa 5 ký tự)
 * - Nếu nhiều từ (>= 2): lấy chữ cái đầu mỗi từ (VD: "Vault associate" -> "VA", "Nghiên cứu & Học thuật" -> "NCHT")
 * - Nếu 1 từ: lấy tối đa 5 chữ cái đầu (VD: "Vault" -> "VAULT", "Docker" -> "DOCKE")
 * - Tối đa 5 ký tự, viết hoa
 */
function generateParentTaskTag(title) {
  if (!title || !title.trim()) return '';
  const cleanStr = removeVietnameseTones(title.trim());
  const words = cleanStr
    .split(/[\s\-_,.:;+&/\\()]+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 0);

  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].slice(0, 5).toUpperCase();
  }
  const tag = words.map(w => w[0]).join('');
  return tag.slice(0, 5).toUpperCase();
}

/**
 * Lấy mã Tag của Task tổng (ưu tiên parent.tag, nếu chưa có thì tự động sinh từ parent.title)
 */
function getParentTag(parent) {
  if (!parent) return '';
  if (parent.tag && parent.tag.trim()) return parent.tag.trim().toUpperCase().slice(0, 5);
  return generateParentTaskTag(parent.title || '');
}

/**
 * Tạo badge hiển thị mã Tag viết tắt của Task tổng cho Subtask
 */
function getParentBadgeHtml(task) {
  if (task.parentId) {
    const parent = getParentTask(task.parentId);
    if (parent) {
      const palette = getParentColorConfig(parent.color);
      const tag = getParentTag(parent);
      return `<span class="px-2 py-0.5 text-[11px] font-black font-mono tracking-wide rounded-md inline-flex items-center shrink-0 border ${palette.badge}" style="${palette.badgeStyle || ''}" title="Task tổng: ${escapeHtml(parent.title)}">${escapeHtml(tag)}</span>`;
    }
  }
  if (task.category) {
    return `<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/80">${escapeHtml(task.category)}</span>`;
  }
  return '';
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
        parentId: 'parent-1',
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
        parentId: 'parent-2',
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
        parentId: 'parent-3',
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
        parentId: 'parent-1',
        category: 'Kế hoạch',
        note: '',
        completed: false,
        replanCount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-5',
        title: 'Luyện đề thi thử IELTS Reading Section 2',
        date: '',
        priority: 'high',
        parentId: 'parent-2',
        category: 'Ngoại ngữ',
        note: 'Nhiệm vụ này nằm trong Kho (chờ xếp lịch) để bạn dễ dàng chọn và xếp vào lịch!',
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('LocalStorage không thể lưu:', e);
  }
}

async function saveCurrentTasks() {
  saveTasksToStorage(state.tasks);
  if (state.currentUser && window.StudyPlannerFirebase) {
    for (const t of state.tasks) {
      window.StudyPlannerFirebase.saveTaskToFirestore(state.currentUser.uid, t);
    }
  }
}

async function saveSingleTask(task) {
  saveTasksToStorage(state.tasks);
  if (state.currentUser && window.StudyPlannerFirebase) {
    await window.StudyPlannerFirebase.saveTaskToFirestore(state.currentUser.uid, task);
  }
}

async function deleteSingleTask(taskId) {
  saveTasksToStorage(state.tasks);
  if (state.currentUser && window.StudyPlannerFirebase) {
    await window.StudyPlannerFirebase.deleteTaskFromFirestore(state.currentUser.uid, taskId);
  }
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
  if (!task.date || !task.date.trim()) return false;
  return task.date < getTodayStr() && !task.completed;
}

// --- 3. DRAG AND DROP ENGINE (KÉO THẢ NHIỆM VỤ GIỮA CÁC NGÀY) ---
let draggedTaskId = null;

function handleDragStart(e, taskId) {
  if (!state.isAdmin) return;
  const taskToDrag = state.tasks.find(t => t.id === taskId);
  if (taskToDrag && taskToDrag.date && taskToDrag.date < getTodayStr() && taskToDrag.completed) {
    e.preventDefault();
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch!'
    });
    return;
  }
  draggedTaskId = taskId;
  e.dataTransfer.setData('text/plain', taskId);
  e.dataTransfer.effectAllowed = 'move';
  
  const card = e.currentTarget;
  setTimeout(() => card.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
  draggedTaskId = null;
  document.querySelectorAll('.task-card').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.day-dropzone').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  if (!state.isAdmin) return;
  const dropZone = e.currentTarget.closest('.day-dropzone') || e.currentTarget;
  if (dropZone && dropZone.dataset.isPast === 'true') {
    e.dataTransfer.dropEffect = 'none';
    return;
  }
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  if (!state.isAdmin) return;
  const dropZone = e.currentTarget.closest('.day-dropzone') || e.currentTarget;
  if (dropZone && dropZone.dataset.isPast === 'true') return;
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  const dropZone = e.currentTarget.closest('.day-dropzone') || e.currentTarget;
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
}

function handleDrop(e, targetDateStr) {
  e.preventDefault();
  document.querySelectorAll('.day-dropzone').forEach(el => el.classList.remove('drag-over'));

  if (!state.isAdmin) {
    openLoginModal();
    return;
  }

  // Chặn thả nhiệm vụ vào ngày trong quá khứ
  if (targetDateStr < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Không thể chuyển',
      message: 'Không thể chuyển nhiệm vụ vào ngày trong quá khứ!'
    });
    return;
  }

  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Chặn dời lịch nhiệm vụ quá khứ đã hoàn thành
  if (task.date && task.date < getTodayStr() && task.completed) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch!'
    });
    return;
  }

  if (task.date !== targetDateStr) {
    const isPastTask = Boolean(task.date && task.date < getTodayStr());
    if (isPastTask && targetDateStr >= getTodayStr()) {
      task.replanCount = (task.replanCount || 0) + 1;
      showToast({
        type: 'success',
        title: 'Replan thành công',
        message: `Đã dời lịch nhiệm vụ "${task.title}" sang ngày ${targetDateStr}! Bây giờ bạn có thể chỉnh sửa như bình thường.`
      });
    }
    task.date = targetDateStr;
    saveCurrentTasks();
    renderApp();
    if (!document.getElementById('taskManagerModal').classList.contains('hidden')) {
      renderTaskManagerContent();
    }
    if (!document.getElementById('taskDetailModal').classList.contains('hidden') && state.activeDetailTaskId === task.id) {
      openTaskDetailModal(task.id);
    }
  }
}

// --- 4. NOTIFICATION BELL HUB (TRUNG TÂM THÔNG BÁO DUY NHẤT) ---
function getOverdueTasks() {
  const todayStr = getTodayStr();
  return state.tasks.filter(t => t.date < todayStr && !t.completed);
}

function updateNotificationBell() {
  const overdueTasks = getOverdueTasks();
  const todayTasks = state.tasks.filter(t => t.date === getTodayStr());
  const pendingToday = todayTasks.filter(t => !t.completed);
  const highlyPostponed = state.tasks.filter(t => (t.replanCount || 0) >= 3 && !t.completed);

  const notifications = [];

  // 1. Thông báo quyền Khách (Chỉ xem)
  if (!state.isAdmin) {
    notifications.push({
      badgeColor: 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200',
      icon: 'shield-alert',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'Chế độ xem (Chỉ đọc)',
      desc: 'Bạn đang xem kế hoạch ở chế độ khách. Hãy đăng nhập Admin để thêm, sửa, xóa, kéo thả và dời lịch.',
      actionHtml: `<button onclick="openLoginModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Đăng nhập ngay</button>`
    });
  }

  // 2. Cảnh báo trễ hạn cần Replan
  if (overdueTasks.length > 0) {
    notifications.push({
      badgeColor: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200',
      icon: 'alert-triangle',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: `Có ${overdueTasks.length} nhiệm vụ trễ hạn!`,
      desc: 'Nhiệm vụ từ những ngày trước chưa hoàn thành. Bạn có thể mở Replan Center hoặc kéo thả task sang ngày mới trên màn hình Tuần.',
      actionHtml: state.isAdmin
        ? `<button onclick="openReplanModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Mở Replan Center</button>`
        : `<button onclick="openLoginModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Đăng nhập để Replan</button>`
    });
  }

  // 3. Cảnh báo các task bị hoãn quá nhiều lần (>= 3 lần)
  if (highlyPostponed.length > 0 && state.isAdmin) {
    notifications.push({
      badgeColor: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200',
      icon: 'alert-octagon',
      iconColor: 'text-rose-600 dark:text-rose-400',
      title: `${highlyPostponed.length} task bị dời quá 3 lần`,
      desc: `Task "${escapeHtml(highlyPostponed[0].title)}" đang bị trì hoãn nhiều lần. Bạn nên xem xét chia nhỏ nó ra hoặc giảm độ khó.`,
      actionHtml: `<button onclick="openReplanModal(); toggleNotifDropdown(false);" class="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs">Xem chi tiết</button>`
    });
  }

  // 4. Nhắc nhở tiến độ hôm nay (Nếu là Admin)
  if (state.isAdmin && pendingToday.length > 0) {
    notifications.push({
      badgeColor: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
      icon: 'calendar-clock',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: `Hôm nay còn ${pendingToday.length} việc cần làm`,
      desc: `Đã xong ${todayTasks.length - pendingToday.length}/${todayTasks.length} nhiệm vụ (${Math.round(((todayTasks.length - pendingToday.length)/todayTasks.length)*100)}%). Cố gắng hoàn thành nhé!`,
      actionHtml: ''
    });
  } else if (state.isAdmin && todayTasks.length > 0 && pendingToday.length === 0) {
    notifications.push({
      badgeColor: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200',
      icon: 'party-popper',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Mục tiêu hôm nay hoàn tất!',
      desc: 'Tuyệt vời! Bạn đã hoàn thành 100% nhiệm vụ đặt ra cho hôm nay 🎉',
      actionHtml: ''
    });
  }

  const badge = document.getElementById('notifBadge');
  const dropdownBadge = document.getElementById('notifDropdownBadge');
  const listContainer = document.getElementById('notifList');

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
      <div class="text-center py-6 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-1.5">
        <i data-lucide="check-circle-2" class="w-8 h-8 text-emerald-500 opacity-80"></i>
        <p class="text-xs font-bold text-slate-600 dark:text-slate-300">Bạn không có thông báo hay cảnh báo nào!</p>
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

  // Chặn replan nếu nhiệm vụ quá khứ đã hoàn thành
  if (task.date && task.date < getTodayStr() && task.completed) {
    showToast({
      type: 'warning',
      title: 'Không thể dời lịch',
      message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch!'
    });
    return;
  }

  if (targetDateStr < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Không hợp lệ',
      message: 'Không thể dời lịch vào ngày trong quá khứ!'
    });
    return;
  }

  task.date = targetDateStr;
  task.replanCount = (task.replanCount || 0) + 1;
  saveCurrentTasks();
  showToast({
    type: 'success',
    title: 'Replan thành công',
    message: `Đã dời nhiệm vụ "${task.title}" sang ngày ${targetDateStr}! Bây giờ bạn có thể chỉnh sửa như bình thường.`
  });
  renderApp();
  renderReplanModalContent();
  if (!document.getElementById('taskManagerModal').classList.contains('hidden')) {
    renderTaskManagerContent();
  }
  if (!document.getElementById('taskDetailModal').classList.contains('hidden') && state.activeDetailTaskId === task.id) {
    openTaskDetailModal(task.id);
  }
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

// --- 5. TASK CRUD (Chỉ Admin) ---
function toggleTaskComplete(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Chặn đổi trạng thái nếu nhiệm vụ thuộc ngày quá khứ
  if (task.date && task.date < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ thuộc ngày trong quá khứ, không thể thay đổi trạng thái!'
    });
    return;
  }

  task.completed = !task.completed;
  saveSingleTask(task);
  if (state.activeDetailTaskId === taskId) {
    updateDetailModalCompletion(task.completed);
  }
  renderApp();
}

async function deleteTask(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const taskToDelete = state.tasks.find(t => t.id === taskId);
  if (!taskToDelete) return;

  // Chặn xóa nếu nhiệm vụ thuộc ngày quá khứ
  if (taskToDelete.date && taskToDelete.date < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Không thể xóa nhiệm vụ thuộc ngày trong quá khứ!'
    });
    return;
  }

  const hasDriveData = taskToDelete.driveFolderId || 
    taskToDelete.document?.driveFolderId || 
    taskToDelete.document?.driveFileId || 
    (taskToDelete.links && taskToDelete.links.some(l => l.type === 'drive_file' || l.fileId));

  const confirmMsg = hasDriveData
    ? `Bạn có chắc chắn muốn xóa nhiệm vụ "${taskToDelete.title}"?\n\n⚠️ Lưu ý: Toàn bộ thư mục và tài liệu của nhiệm vụ này trên Google Drive cũng sẽ được xóa sạch sẽ để tránh trùng lặp.`
    : `Bạn có chắc chắn muốn xóa nhiệm vụ "${taskToDelete.title}" không?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  // 1. Cập nhật state local & Firestore
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  await deleteSingleTask(taskId);

  if (state.activeDetailTaskId === taskId) {
    closeTaskDetailModal();
  }

  renderApp();
  renderReplanModalContent();
  if (!taskManagerModal.classList.contains('hidden')) {
    renderTaskManagerContent();
  }

  // 2. Nếu người dùng đăng nhập Google & có Drive integration -> xóa sạch thư mục của subtask trên Google Drive
  if (state.currentUser && window.StudyPlannerFirebase && window.StudyPlannerFirebase.deleteSubtaskDriveFolder) {
    const yearStr = (taskToDelete.date && taskToDelete.date.trim()) 
      ? taskToDelete.date.split('-')[0] 
      : new Date().getFullYear().toString();

    let parentTitle = 'Nhiệm vụ độc lập';
    if (taskToDelete.parentId) {
      const parent = getParentTask(taskToDelete.parentId);
      if (parent && parent.title) {
        parentTitle = parent.title.trim();
      }
    } else if (taskToDelete.category) {
      parentTitle = taskToDelete.category.trim();
    }

    const subtaskTitle = (taskToDelete.title || 'Nhiệm vụ').trim();
    const folderPath = ['study_idv_planning', yearStr, parentTitle, subtaskTitle];
    const folderId = taskToDelete.driveFolderId || taskToDelete.document?.driveFolderId || null;

    try {
      const deleted = await window.StudyPlannerFirebase.deleteSubtaskDriveFolder({
        folderId: folderId,
        folderPath: folderPath
      });

      if (deleted) {
        showToast({
          type: 'info',
          title: 'Đã dọn dẹp Google Drive',
          message: `Nhiệm vụ <strong>"${escapeHtml(taskToDelete.title)}"</strong> và toàn bộ thư mục tài liệu trên Google Drive đã được xóa sạch sẽ.`,
          duration: 4500
        });
      }
    } catch (driveErr) {
      console.warn('Lỗi khi xóa thư mục trên Google Drive:', driveErr);
    }
  }
}

async function saveTaskFromForm(formData) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const { id, title, date, priority, parentId: initialParentId, note, tag } = formData;

  // Chặn tạo hoặc dời ngày về quá khứ
  if (date && date < getTodayStr()) {
    showToast({
      type: 'error',
      title: 'Không hợp lệ',
      message: 'Không thể thêm hoặc chuyển nhiệm vụ vào ngày trong quá khứ!'
    });
    return;
  }

  let targetTask = null;
  let parentId = initialParentId;

  // Nếu người dùng chọn "Parent Task" (tức là parentId rỗng):
  if (!parentId) {
    // 1. Tìm xem đã có parent task nào cùng title chưa, hoặc nếu đang sửa task này
    let existingParent = state.parentTasks.find(p => p.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (!existingParent && id) {
      const prevTask = state.tasks.find(t => t.id === id);
      if (prevTask && prevTask.parentId) {
        existingParent = state.parentTasks.find(p => p.id === prevTask.parentId);
      }
    }

    if (existingParent) {
      existingParent.title = title;
      if (tag) existingParent.tag = tag;
      await saveSingleParentTask(existingParent);
      parentId = existingParent.id;
    } else {
      const availableColors = PRESET_RGB_COLORS.map(p => p.hex);
      const colorHex = availableColors[state.parentTasks.length % availableColors.length];
      const newParent = {
        id: 'parent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title: title,
        tag: tag || generateParentTaskTag(title) || 'TASK',
        color: colorHex,
        description: note || 'Mục tiêu được tạo tự động từ nhiệm vụ',
        createdAt: new Date().toISOString()
      };
      await saveSingleParentTask(newParent);
      parentId = newParent.id;
    }
  }

  if (id) {
    targetTask = state.tasks.find(t => t.id === id);
    if (targetTask) {
      const wasPast = Boolean(targetTask.date && targetTask.date < getTodayStr());
      if (wasPast && targetTask.completed) {
        showToast({
          type: 'warning',
          title: 'Chỉ xem',
          message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch hay chỉnh sửa!'
        });
        return;
      }
      if (wasPast && date && date >= getTodayStr()) {
        targetTask.replanCount = (targetTask.replanCount || 0) + 1;
        showToast({
          type: 'success',
          title: 'Replan thành công',
          message: `Nhiệm vụ đã được dời lịch sang ngày ${date} và mở khóa chỉnh sửa bình thường!`
        });
      }
      targetTask.title = title;
      targetTask.date = date || '';
      targetTask.priority = priority;
      targetTask.parentId = parentId || null;
      targetTask.note = note;
    }
  } else {
    targetTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      date: date || '',
      priority,
      parentId: parentId || null,
      category: '',
      note,
      completed: false,
      replanCount: 0,
      createdAt: new Date().toISOString()
    };
    state.tasks.push(targetTask);
  }

  if (targetTask) {
    await saveSingleTask(targetTask);
  } else {
    await saveCurrentTasks();
  }
  renderApp();
  if (!document.getElementById('taskManagerModal').classList.contains('hidden')) {
    renderTaskManagerContent();
  }
  if (id && !document.getElementById('taskDetailModal').classList.contains('hidden') && state.activeDetailTaskId === id) {
    openTaskDetailModal(id);
  }
}

// --- 6. RENDER VIEWS & UI UPDATE ---

function updateAuthUI() {
  const adminGroup = document.getElementById('adminActionGroup');
  const guestGroup = document.getElementById('guestActionGroup');
  const btnQuickAdd = document.getElementById('btnQuickAddTaskDay');
  const emptyHint = document.getElementById('emptyStateAdminHint');
  const dragDropTip = document.getElementById('dragDropTip');

  const topNav = document.getElementById('topNavigationBar');
  const authView = document.getElementById('authenticatedMainView');
  const guestPortal = document.getElementById('guestLandingPortal');

  const userAvatarImg = document.getElementById('userAvatarImg');
  const userFallbackIcon = document.getElementById('userFallbackIcon');
  const userNameLabel = document.getElementById('userNameLabel');
  const userDropdownName = document.getElementById('userDropdownName');
  const userDropdownEmail = document.getElementById('userDropdownEmail');
  const userCloudTag = document.getElementById('userCloudTag');

  const isAuthenticated = Boolean(state.isAdmin || state.currentUser);

  const mobileNav = document.getElementById('mobileBottomNav');

  if (isAuthenticated) {
    if (topNav) topNav.classList.remove('hidden');
    if (authView) authView.classList.remove('hidden');
    if (guestPortal) guestPortal.classList.add('hidden');
    if (mobileNav) mobileNav.classList.remove('hidden');

    adminGroup.classList.remove('hidden');
    adminGroup.classList.add('flex');
    guestGroup.classList.add('hidden');
    guestGroup.classList.remove('flex');
    btnQuickAdd.classList.remove('hidden');
    btnQuickAdd.classList.add('flex');
    if (emptyHint) emptyHint.textContent = 'Bấm "Thêm Task" ở góc trên để bắt đầu lên kế hoạch!';
    if (dragDropTip) {
      dragDropTip.classList.toggle('hidden', state.currentView !== 'week');
      dragDropTip.classList.toggle('flex', state.currentView === 'week');
    }

    if (state.currentUser) {
      // Đã đăng nhập bằng Google
      if (state.currentUser.photoURL && userAvatarImg) {
        userAvatarImg.src = state.currentUser.photoURL;
        userAvatarImg.classList.remove('hidden');
        if (userFallbackIcon) userFallbackIcon.classList.add('hidden');
      } else {
        if (userAvatarImg) userAvatarImg.classList.add('hidden');
        if (userFallbackIcon) userFallbackIcon.classList.remove('hidden');
      }

      const displayName = state.currentUser.displayName || state.currentUser.email.split('@')[0];
      if (userNameLabel) userNameLabel.textContent = displayName;
      if (userDropdownName) userDropdownName.textContent = state.currentUser.displayName || displayName;
      if (userDropdownEmail) userDropdownEmail.textContent = state.currentUser.email;
      if (userCloudTag) {
        userCloudTag.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Multi-tenant Cloud Sync';
        userCloudTag.className = 'inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold';
      }
    } else {
      // Đăng nhập Local Admin Password
      if (userAvatarImg) userAvatarImg.classList.add('hidden');
      if (userFallbackIcon) userFallbackIcon.classList.remove('hidden');
      if (userNameLabel) userNameLabel.textContent = 'Admin (Local)';
      if (userDropdownName) userDropdownName.textContent = 'Quản trị viên Local';
      if (userDropdownEmail) userDropdownEmail.textContent = 'Offline Sandbox';
      if (userCloudTag) {
        userCloudTag.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Chế độ Offline Local';
        userCloudTag.className = 'inline-flex items-center gap-1 text-[10px] mt-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold';
      }
    }
  } else {
    // Khách chưa đăng nhập: Ẩn thanh chọn ngày & các view task cá nhân; Hiển thị Portal giới thiệu
    if (topNav) topNav.classList.add('hidden');
    if (authView) authView.classList.add('hidden');
    if (guestPortal) guestPortal.classList.remove('hidden');
    if (mobileNav) mobileNav.classList.add('hidden');

    adminGroup.classList.add('hidden');
    adminGroup.classList.remove('flex');
    guestGroup.classList.remove('hidden');
    guestGroup.classList.add('flex');
    btnQuickAdd.classList.add('hidden');
    btnQuickAdd.classList.remove('flex');
    if (emptyHint) emptyHint.textContent = 'Đăng nhập Google hoặc Admin để quản lý kế hoạch & tài liệu!';
    if (dragDropTip) {
      dragDropTip.classList.add('hidden');
      dragDropTip.classList.remove('flex');
    }
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

// B. Render Day View (Dark Mode & Elastic Fluid)
function renderDayView() {
  const listContainer = document.getElementById('dayTaskList');
  const emptyState = document.getElementById('dayEmptyState');
  const targetDateStr = formatDate(state.currentDate);
  const isPast = targetDateStr < getTodayStr();

  const tasksForDay = state.tasks.filter(t => t.date === targetDateStr);

  const dayHeader = document.getElementById('dayViewHeader');
  if (dayHeader) {
    dayHeader.textContent = `Nhiệm vụ (${targetDateStr === getTodayStr() ? 'Hôm nay - ' : isPast ? 'Quá khứ (Chỉ xem) - ' : ''}${state.currentDate.toLocaleDateString('vi-VN')})`;
  }

  const btnQuickAddDay = document.getElementById('btnQuickAddTaskDay');
  if (btnQuickAddDay) {
    if (state.isAdmin && !isPast) {
      btnQuickAddDay.classList.remove('hidden');
      btnQuickAddDay.classList.add('flex');
    } else {
      btnQuickAddDay.classList.add('hidden');
      btnQuickAddDay.classList.remove('flex');
    }
  }

  if (tasksForDay.length === 0) {
    listContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    const emptyHint = document.getElementById('emptyStateAdminHint');
    if (emptyHint) {
      emptyHint.textContent = isPast ? 'Ngày trong quá khứ không có nhiệm vụ nào.' : (state.isAdmin ? 'Bấm Thêm nhanh để lên kế hoạch!' : 'Đăng nhập Admin để bắt đầu lên kế hoạch!');
    }
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

  const pastNoticeBanner = isPast 
    ? `<div class="p-3.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-2 mb-3 shadow-2xs">
        <i data-lucide="lock" class="w-4 h-4 text-amber-500 shrink-0"></i>
        <span>Ngày trong quá khứ (${targetDateStr}): Chế độ chỉ xem (Read-only). Không thể thêm mới, chỉnh sửa hoặc thay đổi trạng thái nhiệm vụ.</span>
      </div>`
    : '';

  listContainer.innerHTML = pastNoticeBanner + tasksForDay.map(task => {
    const taskIsOverdue = isOverdue(task);
    const priorityBadge = {
      high: '<span class="px-2 py-0.5 text-xs font-bold rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700">🔥 Ưu tiên cao</span>',
      medium: '<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">Bình thường</span>',
      low: '<span class="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">Thấp</span>'
    }[task.priority] || '';

    const replanBadge = (task.replanCount && task.replanCount > 0)
      ? `<span class="inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-help shrink-0" title="Nhiệm vụ này đã được dời lịch ${task.replanCount} lần. Cố gắng hoàn thành sớm nhé!">
          <i data-lucide="alert-triangle" class="w-4 h-4"></i>
        </span>`
      : '';

    const checkboxHtml = isPast
      ? `<div title="Ngày đã qua - Không thể thay đổi trạng thái" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${task.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-750'} cursor-not-allowed opacity-60">
          ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
        </div>`
      : (state.isAdmin
          ? `<button onclick="toggleTaskComplete('${task.id}')" title="Bấm để đánh dấu hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition ${task.completed ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 bg-white dark:bg-slate-700'}">
              ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
            </button>`
          : `<button onclick="openLoginModal()" title="Chỉ đọc - Đăng nhập Admin để tích hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${task.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-750 hover:border-blue-400'} cursor-pointer">
              ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
            </button>`);

    const replanToolbar = (taskIsOverdue && state.isAdmin)
      ? `<div class="pt-2.5 flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <i data-lucide="calendar-sync" class="w-4 h-4"></i> Dời lịch sang:
          </span>
          <button onclick="replanTask('${task.id}', '${todayStr}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs">
            Hôm nay
          </button>
          <button onclick="replanTask('${task.id}', '${tomorrowStr}')" class="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600">
            Ngày mai
          </button>
          <button onclick="replanTask('${task.id}', '${nextWeekStr}')" class="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600">
            Tuần sau (+7d)
          </button>
          <input type="date" min="${todayStr}" onchange="replanTask('${task.id}', this.value)" title="Chọn ngày cụ thể khác" class="text-xs px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white cursor-pointer hover:border-blue-400">
        </div>`
      : '';

    const adminActionTools = state.isAdmin
      ? `<div class="flex items-center gap-1.5 self-end sm:self-start">
          ${(!isPast || !task.completed) ? `
          <button onclick="openEditTaskModal('${task.id}')" title="${isPast ? 'Dời lịch (Replan)' : 'Chỉnh sửa'}" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="${isPast ? 'calendar-cog' : 'edit-3'}" class="w-4 h-4 ${isPast ? 'text-amber-500' : ''}"></i>
          </button>` : ''}
          ${!isPast ? `
          <button onclick="deleteTask('${task.id}')" title="Xóa" class="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
          ` : ''}
        </div>`
      : '';

    const docBadge = (task.document && task.document.contentHtml)
      ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/80 flex items-center gap-1" title="Có tài liệu soạn thảo">
          <i data-lucide="file-text" class="w-3.5 h-3.5"></i> DOCX
        </span>`
      : '';

    const linkBadge = (task.links && task.links.length > 0)
      ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/80 flex items-center gap-1" title="${task.links.length} tài nguyên đính kèm">
          <i data-lucide="link" class="w-3.5 h-3.5"></i> ${task.links.length}
        </span>`
      : '';

    return `
      <div onclick="openTaskDetailModal('${task.id}')" class="cursor-pointer rounded-2xl p-4 sm:p-5 border transition duration-200 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-400 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 ${taskIsOverdue ? 'border-amber-300 dark:border-amber-600/80 bg-amber-50/70 dark:bg-amber-950/40' : 'bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700'} ${task.completed ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60' : ''}">
        <div class="flex items-start gap-3.5 flex-1">
          <div onclick="event.stopPropagation()">${checkboxHtml}</div>
          
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-bold ${task.completed ? 'line-through text-slate-500 dark:text-slate-300' : 'text-slate-900 dark:text-white'}">${escapeHtml(task.title)}</span>
              ${replanBadge}
              ${getParentBadgeHtml(task)}
              ${priorityBadge}
              ${docBadge}
              ${linkBadge}
            </div>
            ${task.note ? `<p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300">${escapeHtml(task.note)}</p>` : ''}
            <div onclick="event.stopPropagation()">${replanToolbar}</div>
          </div>
        </div>

        <div onclick="event.stopPropagation()">${adminActionTools}</div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// C. Render Week View (DARK MODE & ELASTIC DÀNH CHO 14", 24", 27")
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
    const isPast = dateStr < getTodayStr();
    const tasks = state.tasks.filter(t => t.date === dateStr);
    const completedCount = tasks.filter(t => t.completed).length;

    const addBtnHtml = (state.isAdmin && !isPast)
      ? `<div class="p-3 border-t border-slate-200 dark:border-slate-700/80 mt-auto bg-slate-100/70 dark:bg-slate-800/50 rounded-b-2xl shrink-0">
          <button onclick="openAddTaskModalForDate('${dateStr}')" class="w-full py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/60 border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
            <i data-lucide="plus" class="w-4 h-4"></i> Thêm nhiệm vụ
          </button>
        </div>`
      : (isPast 
          ? `<div class="py-3 px-3 border-t border-slate-200/60 dark:border-slate-800/60 mt-auto bg-slate-100/40 dark:bg-slate-900/30 rounded-b-2xl text-center pointer-events-none select-none flex items-center justify-center shrink-0" title="Ngày trong quá khứ (Chỉ xem)">
              <i data-lucide="lock" class="w-4 h-4 text-slate-400 dark:text-slate-500"></i>
            </div>`
          : '');

    let dayCardClasses = '';
    if (isToday) {
      dayCardClasses = 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-md bg-blue-50/20 dark:bg-slate-900/90';
    } else if (isPast) {
      dayCardClasses = 'border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/40 opacity-60 hover:opacity-90 transition-opacity shadow-none';
    } else {
      dayCardClasses = 'border-slate-200 dark:border-slate-750 shadow-xs bg-slate-50/40 dark:bg-slate-900/90';
    }

    const headerBg = isToday 
      ? 'bg-blue-100/80 dark:bg-blue-950/70' 
      : (isPast ? 'bg-slate-200/50 dark:bg-slate-850/50' : 'bg-slate-100 dark:bg-slate-800');

    const dayNameColor = isPast
      ? 'text-slate-400 dark:text-slate-500'
      : (idx >= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300');

    const dateNumberColor = isPast ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white';

    const countBadgeClass = isToday 
      ? 'bg-blue-600 text-white font-black' 
      : (isPast 
          ? 'bg-slate-200/80 dark:bg-slate-750 text-slate-500 dark:text-slate-400 font-bold border border-slate-300/60 dark:border-slate-700/60'
          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-bold');

    return `
      <!-- Cột ngày Elastic & Cố định chiều cao đồng đều 530px (2K: 610px), snap-center trên mobile iPhone -->
      <div 
        class="day-dropzone rounded-2xl border transition-all duration-200 flex flex-col h-[530px] 2xl:h-[610px] snap-center shrink-0 ${dayCardClasses}"
        data-is-past="${isPast ? 'true' : 'false'}"
        data-is-today="${isToday ? 'true' : 'false'}"
        ${isPast ? '' : `
        ondragover="handleDragOver(event)"
        ondragenter="handleDragEnter(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event, '${dateStr}')"
        `}
      >
        
        <!-- Day Column Header -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between ${headerBg} rounded-t-2xl pointer-events-none shrink-0">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold uppercase tracking-wider ${dayNameColor}">${dayNames[idx]}</span>
              ${isPast ? `<span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><i data-lucide="lock" class="w-3 h-3"></i></span>` : ''}
            </div>
            <div class="text-xl 2xl:text-2xl font-black ${dateNumberColor} leading-tight">${dayDate.getDate()}/${dayDate.getMonth() + 1}</div>
          </div>
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full ${countBadgeClass} shadow-2xs" ${tasks.length > 4 ? `title="Có ${tasks.length} nhiệm vụ (Cuộn thanh slide để xem thêm)"` : ''}>
            ${completedCount}/${tasks.length}
          </span>
        </div>

        <!-- Task List inside day: Giới hạn 4 task, nếu > 4 task sẽ xuất hiện thanh slide cuộn mượt mà -->
        <div class="p-3 space-y-2.5 flex-1 min-h-0 overflow-y-auto custom-slidebar ${tasks.length > 4 ? 'pr-1.5' : ''}">
          ${tasks.length === 0 ? `
            <div class="text-xs text-slate-400 dark:text-slate-500 text-center py-16 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <i data-lucide="clipboard-check" class="w-8 h-8 text-slate-300 dark:text-slate-700"></i>
              <span>Không có task</span>
            </div>` : ''}
          
          ${tasks.map(t => {
            const taskIsOverdue = isOverdue(t);
            const canDrag = state.isAdmin && (!isPast || !t.completed);

            const checkboxHtml = isPast 
              ? `<div title="Ngày đã qua - Không thể thay đổi trạng thái" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${t.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'} cursor-not-allowed opacity-60">
                  ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                </div>`
              : (state.isAdmin 
                  ? `<button onclick="event.stopPropagation(); toggleTaskComplete('${t.id}')" title="Tích hoàn thành" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${t.completed ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 bg-white dark:bg-slate-700'}">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>`
                  : `<button onclick="event.stopPropagation(); openLoginModal()" title="Chỉ đọc - Đăng nhập để hoàn thành task" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${t.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-750 hover:border-blue-400'} cursor-pointer">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>`);

            return `
              <div 
                draggable="${canDrag ? 'true' : 'false'}"
                ${canDrag ? `
                ondragstart="handleDragStart(event, '${t.id}')"
                ondragend="handleDragEnd(event)"
                ` : ''}
                onclick="openTaskDetailModal('${t.id}')" 
                class="task-card h-[96px] shrink-0 p-3 rounded-xl border transition-all duration-150 select-none flex flex-col justify-between ${canDrag ? 'cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'} ${taskIsOverdue ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-600/80' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:dark:border-slate-600'} ${t.completed ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60' : ''}"
                title="${escapeHtml(t.title)} • ${isPast ? (t.completed ? 'Nhiệm vụ trong quá khứ đã hoàn thành (Chỉ xem)' : 'Nhiệm vụ quá hạn - Kéo thả sang ngày mới để dời lịch (Replan)') : (state.isAdmin ? 'Bấm để xem chi tiết & tài liệu, hoặc kéo thả để đổi ngày' : 'Bấm để xem chi tiết')}"
              >
                <div class="flex items-start gap-2.5 h-full">
                  <!-- Checkbox -->
                  ${checkboxHtml}
                  
                  <!-- Nội dung task -->
                  <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div class="flex items-start gap-1.5 min-w-0 h-[36px] sm:h-[40px]">
                      <span 
                        class="text-xs sm:text-sm font-semibold leading-snug line-clamp-2 flex-1 min-w-0 ${t.completed ? 'line-through text-slate-500 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-bold'}"
                        title="${escapeHtml(t.title)}"
                      >
                        ${escapeHtml(t.title)}
                      </span>
                      ${t.replanCount > 0 ? `<span class="inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-help shrink-0 mt-0.5" title="Nhiệm vụ này đã được dời lịch ${t.replanCount} lần. Cố gắng hoàn thành sớm nhé!"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i></span>` : ''}
                    </div>
                    
                    <div class="flex items-center gap-1.5 flex-nowrap overflow-hidden mt-auto">
                      ${getParentBadgeHtml(t)}
                      ${t.document && t.document.contentHtml ? `<span class="text-[10px] px-1.5 py-0.5 font-semibold rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/80 inline-flex items-center gap-0.5 shrink-0" title="Có tài liệu soạn thảo (.docx)"><i data-lucide="file-text" class="w-3 h-3"></i> DOCX</span>` : ''}
                      ${t.links && t.links.length > 0 ? `<span class="text-[10px] px-1.5 py-0.5 font-semibold rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/80 inline-flex items-center gap-0.5 shrink-0" title="${t.links.length} tài nguyên đính kèm"><i data-lucide="link" class="w-3 h-3"></i> ${t.links.length}</span>` : ''}
                      ${taskIsOverdue ? `<span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 shrink-0"><i data-lucide="clock-alert" class="w-3 h-3"></i> Trễ hạn</span>` : ''}
                    </div>
                  </div>

                  <!-- Grip Handle Icon -->
                  ${canDrag ? `
                    <i data-lucide="grip-vertical" class="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 mt-0.5"></i>
                  ` : ''}
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

  // Tự động cuộn mượt đến thẻ của ngày hôm nay trên mobile nếu có
  if (window.innerWidth < 768) {
    setTimeout(() => {
      const todayCard = container.querySelector('[data-is-today="true"]');
      if (todayCard && todayCard.scrollIntoView) {
        todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 80);
  }
}

// D. Render Month View (Dark Mode High Contrast & Elastic)
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
      const isPast = dateStr < getTodayStr();
      const canInteract = state.isAdmin && !isPast;
      const tasks = state.tasks.filter(t => t.date === dateStr);
      const overdueTasks = tasks.filter(t => isOverdue(t));
      const completedCount = tasks.filter(t => t.completed).length;
      const isAllDone = tasks.length > 0 && completedCount === tasks.length;

      html += `
        <div 
          class="day-dropzone min-h-[75px] sm:min-h-[115px] 2xl:min-h-[140px] p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
            isToday 
              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm' 
              : isPast
                ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/40 opacity-60 hover:opacity-90'
                : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-xs'
          }"
          data-is-past="${isPast ? 'true' : 'false'}"
          data-is-today="${isToday ? 'true' : 'false'}"
          onclick="openDayFromGrid('${dateStr}')"
          ${isPast ? '' : `
          ondragover="handleDragOver(event)"
          ondragenter="handleDragEnter(event)"
          ondragleave="handleDragLeave(event)"
          ondrop="handleDrop(event, '${dateStr}')"
          `}
        >
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-extrabold ${
              isToday 
                ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-xs' 
                : isPast
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-800 dark:text-slate-100'
            }">${dayNum}</span>
            <div class="flex items-center gap-1">
              ${isPast ? `<i data-lucide="lock" class="w-3 h-3 text-slate-400 dark:text-slate-500" title="Ngày đã qua (Chỉ xem)"></i>` : ''}
              ${overdueTasks.length > 0 ? `<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" title="Có task trễ hạn"></span>` : ''}
            </div>
          </div>
          
          <div class="space-y-1.5 my-1.5 overflow-hidden">
            ${tasks.slice(0, 3).map(t => {
              let pillClasses = '';
              let pillStyle = '';
              let prefixIcon = '';

              const parent = t.parentId ? getParentTask(t.parentId) : null;
              const palette = parent ? getParentColorConfig(parent.color) : null;
              const parentTag = parent ? getParentTag(parent) : '';

              if (t.completed) {
                pillClasses = 'bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 line-through border border-slate-200 dark:border-slate-600 font-medium';
                prefixIcon = '<i data-lucide="check" class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mr-1 inline-block"></i>';
              } else if (palette) {
                // Áp dụng màu sắc thẻ đồng nhất với Tag của Task tổng
                const isDark = document.documentElement.classList.contains('dark');
                const rgb = hexToRgb(palette.hex);
                const bgOpacity = isDark ? 0.22 : 0.14;
                const borderOpacity = isDark ? 0.45 : 0.35;
                const textColor = isDark ? `rgb(${Math.min(255, rgb.r + 55)}, ${Math.min(255, rgb.g + 55)}, ${Math.min(255, rgb.b + 55)})` : palette.hex;

                pillClasses = 'font-bold border shadow-2xs';
                pillStyle = `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity}); color: ${textColor}; border-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderOpacity});`;
              } else if (isOverdue(t)) {
                pillClasses = 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-100 font-bold border border-amber-300 dark:border-amber-600/90 shadow-2xs';
              } else if (t.priority === 'high') {
                pillClasses = 'bg-rose-100 dark:bg-rose-950 text-rose-950 dark:text-rose-100 font-bold border border-rose-300 dark:border-rose-600/90 shadow-2xs';
              } else {
                pillClasses = 'bg-blue-100 dark:bg-blue-950 text-blue-950 dark:text-blue-100 font-bold border border-blue-300 dark:border-blue-600/90 shadow-2xs';
              }

              const docIndicator = (t.document && t.document.contentHtml) ? '<i data-lucide="file-text" class="w-3 h-3 ml-1 shrink-0 text-emerald-600 dark:text-emerald-400"></i>' : '';
              const linkIndicator = (t.links && t.links.length > 0) ? '<i data-lucide="link" class="w-3 h-3 ml-0.5 shrink-0 text-purple-600 dark:text-purple-400"></i>' : '';

              const canDragTask = state.isAdmin && (!isPast || !t.completed);

              return `
                <div 
                  draggable="${canDragTask ? 'true' : 'false'}"
                  ${canDragTask ? `
                  ondragstart="handleDragStart(event, '${t.id}')"
                  ondragend="handleDragEnd(event)"
                  ` : ''}
                  onclick="event.stopPropagation(); openTaskDetailModal('${t.id}')"
                  class="text-[11px] px-2 py-0.5 rounded-md truncate transition-colors flex items-center cursor-pointer hover:opacity-85 ${pillClasses}"
                  style="${pillStyle}"
                  title="${escapeHtml(t.title)}${parent ? ` [${escapeHtml(parent.title)}]` : ''} (${isPast ? (t.completed ? 'Nhiệm vụ trong quá khứ đã hoàn thành (Chỉ xem)' : 'Nhiệm vụ quá hạn - Kéo thả để dời lịch (Replan)') : 'Bấm để xem chi tiết & tài liệu'})"
                >
                  ${prefixIcon}
                  ${parentTag ? `<span class="font-mono font-black mr-1 text-[10px] opacity-90 shrink-0">[${escapeHtml(parentTag)}]</span>` : ''}
                  <span class="truncate flex-1">${escapeHtml(t.title)}</span>
                  ${docIndicator}
                  ${linkIndicator}
                </div>
              `;
            }).join('')}
            ${tasks.length > 3 ? `<div class="text-[10px] text-slate-500 dark:text-slate-300 font-bold pl-1">+${tasks.length - 3} task nữa</div>` : ''}
          </div>

          <div class="text-[11px] font-bold ${isAllDone ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500 dark:text-slate-300'} text-right">
            ${tasks.length > 0 ? `${completedCount}/${tasks.length}` : ''}
          </div>
        </div>
      `;
    } else {
      html += `<div class="min-h-[115px] 2xl:min-h-[140px] p-2 bg-slate-50/40 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 opacity-30"></div>`;
    }
  }

  container.innerHTML = html;
  lucide.createIcons();
}

// E. Render Year Heatmap View (Dark Mode High Contrast & Elastic Layout)
function renderYearView() {
  const container = document.getElementById('yearHeatmapContainer');
  const year = state.currentDate.getFullYear();

  let html = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 2xl:gap-6">`;

  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1);
    const monthName = monthDate.toLocaleDateString('vi-VN', { month: 'long' });
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    html += `
      <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize mb-3">${monthName}</h4>
        <div class="grid grid-cols-7 gap-1.5">
    `;

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, m, d);
      const dateStr = formatDate(cellDate);
      const tasks = state.tasks.filter(t => t.date === dateStr);
      const completed = tasks.filter(t => t.completed).length;

      let colorClass = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
      if (completed > 0) {
        if (completed === 1) colorClass = 'bg-emerald-200 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700';
        else if (completed === 2) colorClass = 'bg-emerald-400 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-500';
        else colorClass = 'bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300 text-slate-900';
      }

      html += `
        <div onclick="openDayFromGrid('${dateStr}')" title="${dateStr}: ${completed}/${tasks.length} hoàn thành" class="w-5 h-5 2xl:w-6 2xl:h-6 rounded-md border text-[10px] flex items-center justify-center cursor-pointer transition hover:scale-115 ${colorClass}">
        </div>
      `;
    }

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// --- 7. SWITCH & NAVIGATE (HIỆU ỨNG SLIDE CHUYỂN NGÀY/TUẦN/THÁNG SIÊU MƯỢT) ---
function triggerSlideAnimation(direction) {
  const mainView = document.getElementById('authenticatedMainView');
  const dateDisplay = document.getElementById('currentDateDisplay');

  if (mainView) {
    mainView.classList.remove('slide-in-right', 'slide-in-left', 'date-pulse', 'view-fade-in');
    void mainView.offsetWidth; // Buộc reflow để kích hoạt lại animation mượt mà ngay lập tức
    if (direction === 'next') {
      mainView.classList.add('slide-in-right');
    } else if (direction === 'prev') {
      mainView.classList.add('slide-in-left');
    } else if (direction === 'pulse') {
      mainView.classList.add('date-pulse');
    } else if (direction === 'fade') {
      mainView.classList.add('view-fade-in');
    }

    const onAnimEnd = () => {
      mainView.classList.remove('slide-in-right', 'slide-in-left', 'date-pulse', 'view-fade-in');
      mainView.removeEventListener('animationend', onAnimEnd);
    };
    mainView.addEventListener('animationend', onAnimEnd);
  }

  if (dateDisplay) {
    dateDisplay.classList.remove('slide-in-right-sm', 'slide-in-left-sm', 'date-pulse');
    void dateDisplay.offsetWidth;
    if (direction === 'next') {
      dateDisplay.classList.add('slide-in-right-sm');
    } else if (direction === 'prev') {
      dateDisplay.classList.add('slide-in-left-sm');
    } else if (direction === 'pulse') {
      dateDisplay.classList.add('date-pulse');
    }

    const onDateAnimEnd = () => {
      dateDisplay.classList.remove('slide-in-right-sm', 'slide-in-left-sm', 'date-pulse');
      dateDisplay.removeEventListener('animationend', onDateAnimEnd);
    };
    dateDisplay.addEventListener('animationend', onDateAnimEnd);
  }
}

function switchView(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.view-btn').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.className = 'view-btn px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-xs';
    } else {
      btn.className = 'view-btn px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent';
    }
  });

  // Đồng bộ trạng thái active trên Mobile Bottom Nav Dock
  document.querySelectorAll('.mobile-dock-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-mobile-view') === viewName;
    if (isTarget) {
      btn.className = 'mobile-dock-btn flex-1 py-1 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 font-bold transition';
    } else {
      btn.className = 'mobile-dock-btn flex-1 py-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition';
    }
  });

  document.getElementById('viewDay').classList.toggle('hidden', viewName !== 'day');
  document.getElementById('viewWeek').classList.toggle('hidden', viewName !== 'week');
  document.getElementById('viewMonth').classList.toggle('hidden', viewName !== 'month');
  document.getElementById('viewYear').classList.toggle('hidden', viewName !== 'year');

  renderApp();
  triggerSlideAnimation('fade');
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
  triggerSlideAnimation(delta > 0 ? 'next' : 'prev');
}

function goToToday() {
  const today = new Date();
  const current = new Date(state.currentDate);
  let direction = 'pulse';

  if (state.currentView === 'day') {
    const todayStr = getTodayStr();
    const currStr = formatDate(current);
    if (todayStr > currStr) direction = 'next';
    else if (todayStr < currStr) direction = 'prev';
  } else if (state.currentView === 'week') {
    const currMonday = getMonday(current);
    const todayMonday = getMonday(today);
    if (todayMonday.getTime() > currMonday.getTime()) direction = 'next';
    else if (todayMonday.getTime() < currMonday.getTime()) direction = 'prev';
  } else if (state.currentView === 'month') {
    const currMonthVal = current.getFullYear() * 12 + current.getMonth();
    const todayMonthVal = today.getFullYear() * 12 + today.getMonth();
    if (todayMonthVal > currMonthVal) direction = 'next';
    else if (todayMonthVal < currMonthVal) direction = 'prev';
  } else if (state.currentView === 'year') {
    if (today.getFullYear() > current.getFullYear()) direction = 'next';
    else if (today.getFullYear() < current.getFullYear()) direction = 'prev';
  }

  state.currentDate = today;
  renderApp();
  triggerSlideAnimation(direction);

  // Nếu đang ở màn hình Tuần, tự động cuộn nhẹ đến cột Hôm nay
  if (state.currentView === 'week') {
    setTimeout(() => {
      const todayCard = document.querySelector('[data-is-today="true"]');
      if (todayCard && todayCard.scrollIntoView) {
        todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 60);
  }
}

function openDayFromGrid(dateStr) {
  state.currentDate = parseDateStr(dateStr);
  switchView('day');
}

// E. Nhận diện cử chỉ vuốt chạm màn hình (Swipe Gestures) trên iPhone & Mobile
function initMobileTouchGestures() {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const targetArea = document.getElementById('authenticatedMainView');
  const dateNavArea = document.getElementById('topNavigationBar');

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e) {
    if (!touchStartX || !touchStartY) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const duration = Date.now() - touchStartTime;

    touchStartX = 0;
    touchStartY = 0;

    // Chỉ nhận diện swipe dứt khoát (< 450ms) và theo phương ngang rõ rệt
    if (duration > 450) return;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

    // Không kích hoạt nếu đang mở bất kỳ modal nào
    const anyModalOpen = Array.from(document.querySelectorAll('.fixed.inset-0:not(#toastNotificationContainer)'))
      .some(m => !m.classList.contains('hidden'));
    if (anyModalOpen) return;

    // Ở chế độ Tuần, người dùng vuốt trên các thẻ ngày để cuộn ngang (snap cards).
    // Do đó trong Week view chỉ nhận diện swipe chuyển tuần khi vuốt trên thanh điều hướng ngày trên cùng (dateNavArea)
    const isOverWeekScroll = e.target.closest('#weekScrollContainer');
    if (state.currentView === 'week' && isOverWeekScroll) {
      return;
    }

    // DeltaX < 0: Vuốt sang trái -> Xem kế tiếp (Next)
    // DeltaX > 0: Vuốt sang phải -> Xem trước đó (Prev)
    if (deltaX < 0) {
      navigateDate(1);
    } else {
      navigateDate(-1);
    }
  }

  if (targetArea) {
    targetArea.addEventListener('touchstart', handleTouchStart, { passive: true });
    targetArea.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
  if (dateNavArea) {
    dateNavArea.addEventListener('touchstart', handleTouchStart, { passive: true });
    dateNavArea.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
}

// --- 8. MODALS ---
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const replanModal = document.getElementById('replanModal');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const changePwModal = document.getElementById('changePwModal');
const changePwForm = document.getElementById('changePwForm');

const formAddDefinedTask = document.getElementById('formAddDefinedTask');
const taskManagerModal = document.getElementById('taskManagerModal');
const parentTaskModal = document.getElementById('parentTaskModal');
const formParentTask = document.getElementById('formParentTask');
const quickScheduleModal = document.getElementById('quickScheduleModal');
const formQuickSchedule = document.getElementById('formQuickSchedule');

// --- MODAL STACKING & ANIMATION HELPERS (Hiệu ứng chuyển cảnh xếp lớp mượt mà) ---
function pushModalStack(dialogId) {
  const dlg = document.getElementById(dialogId);
  if (dlg) {
    dlg.classList.add('modal-dialog-animated');
    dlg.style.transform = 'scale(0.965) translateY(-8px)';
    dlg.style.opacity = '0.55';
    dlg.style.filter = 'blur(1px)';
    dlg.style.pointerEvents = 'none';
  }
}

function popModalStack(dialogId) {
  const dlg = document.getElementById(dialogId);
  if (dlg) {
    dlg.classList.add('modal-dialog-animated');
    dlg.style.transform = '';
    dlg.style.opacity = '';
    dlg.style.filter = '';
    dlg.style.pointerEvents = '';
  }
}

function animateModalOpen(modalEl, dialogId) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  const dlg = dialogId ? document.getElementById(dialogId) : null;
  if (dlg) {
    dlg.classList.add('modal-dialog-animated');
    dlg.style.transform = 'scale(0.95) translateY(12px)';
    dlg.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dlg.style.transform = 'scale(1) translateY(0)';
        dlg.style.opacity = '1';
      });
    });
  }
}

let currentAddTaskTab = 'defined'; // 'defined' | 'others'

function switchAddTaskTypeTab(tabName) {
  currentAddTaskTab = tabName;
  const tabBtnDefined = document.getElementById('tabBtnAddDefined');
  const tabBtnOthers = document.getElementById('tabBtnAddOthers');
  const formDefined = document.getElementById('formAddDefinedTask');
  const formOthers = document.getElementById('taskForm');

  if (tabName === 'defined') {
    if (tabBtnDefined) tabBtnDefined.className = 'flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs';
    if (tabBtnOthers) tabBtnOthers.className = 'flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
    if (formDefined) formDefined.classList.remove('hidden');
    if (formOthers) formOthers.classList.add('hidden');
  } else {
    if (tabBtnOthers) tabBtnOthers.className = 'flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs';
    if (tabBtnDefined) tabBtnDefined.className = 'flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white';
    if (formOthers) formOthers.classList.remove('hidden');
    if (formDefined) formDefined.classList.add('hidden');
  }
  lucide.createIcons();
}

let isTaskFormTagManuallyEdited = false;

function updateTaskFormTagCount() {
  const tagInput = document.getElementById('taskFormTagInput');
  const countEl = document.getElementById('taskFormTagCount');
  if (tagInput && countEl) {
    countEl.textContent = `${tagInput.value.length}/5`;
  }
}

function toggleTaskFormTagRow() {
  const parentSelect = document.getElementById('taskParentSelect');
  const tagRow = document.getElementById('taskTagRow');
  const tagInput = document.getElementById('taskFormTagInput');
  const titleInput = document.getElementById('taskTitle');
  if (!parentSelect || !tagRow) return;

  // Nếu chọn "Parent Task" (value rỗng)
  if (!parentSelect.value) {
    tagRow.classList.remove('hidden');
    if ((!tagInput.value.trim() || !isTaskFormTagManuallyEdited) && titleInput && titleInput.value.trim()) {
      tagInput.value = generateParentTaskTag(titleInput.value);
    }
  } else {
    // Nếu chọn một Task tổng đã có sẵn -> ẩn ô tag (subtask kế thừa tag của Parent)
    tagRow.classList.add('hidden');
  }
  updateTaskFormTagCount();
}

function populateParentSelectOptions(selectEl, selectedParentId = '') {
  let html = `<option value="">Parent Task</option>`;
  state.parentTasks.forEach(p => {
    const isSelected = p.id === selectedParentId ? 'selected' : '';
    const tag = getParentTag(p);
    html += `<option value="${p.id}" ${isSelected}>📁 [${escapeHtml(tag)}] ${escapeHtml(p.title)}</option>`;
  });
  selectEl.innerHTML = html;
}

function openAddTaskModal(initialDate = null) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }

  const todayStr = getTodayStr();
  const rawTargetDate = initialDate || formatDate(state.currentDate);
  const targetDate = rawTargetDate < todayStr ? todayStr : rawTargetDate;

  // Hiển thị thanh tabs
  const tabsContainer = document.getElementById('addTaskTypeTabs');
  if (tabsContainer) tabsContainer.classList.remove('hidden');

  // Chuẩn bị Form 1: Defined Tasks (chưa có ngày)
  const unscheduledTasks = state.tasks.filter(t => !t.date || !t.date.trim());
  const selectDefined = document.getElementById('selectDefinedTaskId');
  const emptyHint = document.getElementById('emptyDefinedHint');
  const dateInputDefined = document.getElementById('definedTaskDate');
  const btnSubmitDefined = document.getElementById('btnSubmitDefined');

  if (dateInputDefined) {
    dateInputDefined.value = targetDate;
    dateInputDefined.min = todayStr;
  }

  if (unscheduledTasks.length === 0) {
    if (emptyHint) emptyHint.classList.remove('hidden');
    if (selectDefined) {
      selectDefined.innerHTML = '<option value="" disabled selected>-- Kho task hiện không có task chờ xếp lịch --</option>';
      selectDefined.disabled = true;
    }
    if (btnSubmitDefined) btnSubmitDefined.disabled = true;
    switchAddTaskTypeTab('others');
  } else {
    if (emptyHint) emptyHint.classList.add('hidden');
    if (selectDefined) {
      selectDefined.disabled = false;
      let optHtml = '';
      
      // Nhóm theo Parent Task
      state.parentTasks.forEach(parent => {
        const groupTasks = unscheduledTasks.filter(t => t.parentId === parent.id);
        if (groupTasks.length > 0) {
          const tag = getParentTag(parent);
          optHtml += `<optgroup label="📂 [${escapeHtml(tag)}] ${escapeHtml(parent.title)}">`;
          groupTasks.forEach(t => {
            const pBadge = t.priority === 'high' ? '🔥 Cao' : (t.priority === 'low' ? 'Thấp' : 'Bình thường');
            optHtml += `<option value="${t.id}">${escapeHtml(t.title)} (${pBadge})</option>`;
          });
          optHtml += `</optgroup>`;
        }
      });

      // Các task độc lập / Chưa gán Parent
      const unassigned = unscheduledTasks.filter(t => !t.parentId || !getParentTask(t.parentId));
      if (unassigned.length > 0) {
        optHtml += `<optgroup label="📋 Chưa phân loại / Độc lập">`;
        unassigned.forEach(t => {
          const pBadge = t.priority === 'high' ? '🔥 Cao' : (t.priority === 'low' ? 'Thấp' : 'Bình thường');
          optHtml += `<option value="${t.id}">${escapeHtml(t.title)} (${pBadge})</option>`;
        });
        optHtml += `</optgroup>`;
      }

      selectDefined.innerHTML = optHtml;
    }
    if (btnSubmitDefined) btnSubmitDefined.disabled = false;
    switchAddTaskTypeTab('defined');
  }

  // Chuẩn bị Form 2: Others
  taskForm.reset();
  document.getElementById('taskId').value = '';
  const taskDateInput = document.getElementById('taskDate');
  if (taskDateInput) {
    taskDateInput.value = targetDate;
    taskDateInput.min = todayStr;
  }
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskNote').value = '';
  document.getElementById('modalTitle').textContent = 'Thêm nhiệm vụ vào lịch';
  
  const parentSelect = document.getElementById('taskParentSelect');
  if (parentSelect) populateParentSelectOptions(parentSelect);

  const formTagInput = document.getElementById('taskFormTagInput');
  if (formTagInput) formTagInput.value = '';
  isTaskFormTagManuallyEdited = false;
  toggleTaskFormTagRow();

  animateModalOpen(taskModal, 'taskDialog');
  lucide.createIcons();
}

function openAddTaskModalForDate(dateStr) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  if (dateStr < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Không thể thêm nhiệm vụ vào ngày trong quá khứ!'
    });
    return;
  }
  openAddTaskModal(dateStr);
}

function openAddTaskModalForParent(parentId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }
  openAddTaskModal();
  switchAddTaskTypeTab('others');
  const parentSelect = document.getElementById('taskParentSelect');
  if (parentSelect) {
    populateParentSelectOptions(parentSelect, parentId);
    parentSelect.value = parentId;
  }
  toggleTaskFormTagRow();
  // Để trống ngày để task mới lưu thẳng vào Kho (chờ xếp lịch)
  document.getElementById('taskDate').value = '';
  document.getElementById('taskTitle').focus();
}

function resetTaskFormState() {
  const titleInput = document.getElementById('taskTitle');
  const dateInput = document.getElementById('taskDate');
  const prioritySelect = document.getElementById('taskPriority');
  const noteInput = document.getElementById('taskNote');
  const parentSelect = document.getElementById('taskParentSelect');
  const formTagInput = document.getElementById('taskFormTagInput');
  const pastNotice = document.getElementById('editTaskPastReplanNotice');

  if (titleInput) {
    titleInput.readOnly = false;
    titleInput.classList.remove('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
  }
  if (dateInput) {
    dateInput.min = '';
  }
  if (prioritySelect) {
    prioritySelect.disabled = false;
    prioritySelect.classList.remove('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
  }
  if (noteInput) {
    noteInput.readOnly = false;
    noteInput.classList.remove('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
  }
  if (parentSelect) {
    parentSelect.disabled = false;
    parentSelect.classList.remove('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
  }
  if (formTagInput) {
    formTagInput.readOnly = false;
    formTagInput.classList.remove('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
  }
  if (pastNotice) {
    pastNotice.classList.add('hidden');
  }
}

function openEditTaskModal(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const isPast = Boolean(task.date && task.date < getTodayStr());
  if (isPast && task.completed) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể chỉnh sửa hay dời lịch!'
    });
    return;
  }

  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }

  // Ẩn tabs chọn defined (vì đang edit trực tiếp task này)
  const tabsContainer = document.getElementById('addTaskTypeTabs');
  if (tabsContainer) tabsContainer.classList.add('hidden');
  
  document.getElementById('formAddDefinedTask').classList.add('hidden');
  taskForm.classList.remove('hidden');

  document.getElementById('taskId').value = task.id;

  const titleInput = document.getElementById('taskTitle');
  const dateInput = document.getElementById('taskDate');
  const prioritySelect = document.getElementById('taskPriority');
  const noteInput = document.getElementById('taskNote');
  const parentSelect = document.getElementById('taskParentSelect');
  const formTagInput = document.getElementById('taskFormTagInput');

  titleInput.value = task.title;
  dateInput.value = task.date || '';
  prioritySelect.value = task.priority || 'medium';
  noteInput.value = task.note || '';

  let pastNotice = document.getElementById('editTaskPastReplanNotice');

  if (isPast) {
    document.getElementById('modalTitle').textContent = 'Dời lịch (Replan) nhiệm vụ quá khứ';
    dateInput.min = getTodayStr();
    titleInput.readOnly = true;
    titleInput.classList.add('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
    prioritySelect.disabled = true;
    prioritySelect.classList.add('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
    noteInput.readOnly = true;
    noteInput.classList.add('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
    if (parentSelect) {
      parentSelect.disabled = true;
      parentSelect.classList.add('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
    }
    if (formTagInput) {
      formTagInput.readOnly = true;
      formTagInput.classList.add('bg-slate-100', 'dark:bg-slate-750', 'opacity-75');
    }

    if (!pastNotice) {
      pastNotice = document.createElement('div');
      pastNotice.id = 'editTaskPastReplanNotice';
      pastNotice.className = 'p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2';
      taskForm.insertBefore(pastNotice, taskForm.firstChild);
    }
    pastNotice.innerHTML = `
      <i data-lucide="info" class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400"></i>
      <span>Nhiệm vụ thuộc ngày quá khứ. Hãy chọn <strong>Ngày mới (từ hôm nay trở đi)</strong> để Replan. Sau khi lưu ngày mới, nhiệm vụ sẽ được mở khóa để chỉnh sửa mọi thông tin bình thường.</span>
    `;
    pastNotice.classList.remove('hidden');
    dateInput.focus();
  } else {
    document.getElementById('modalTitle').textContent = 'Chỉnh sửa nhiệm vụ';
    resetTaskFormState();
  }

  const parentId = task.parentId || '';
  if (parentSelect) {
    populateParentSelectOptions(parentSelect, parentId);
    parentSelect.value = parentId;
  }

  if (formTagInput) {
    if (!task.parentId) {
      const p = state.parentTasks.find(p => p.id === task.parentId || p.title.trim().toLowerCase() === task.title.trim().toLowerCase());
      formTagInput.value = p ? getParentTag(p) : generateParentTaskTag(task.title);
      isTaskFormTagManuallyEdited = true;
    } else {
      formTagInput.value = '';
    }
  }
  toggleTaskFormTagRow();

  animateModalOpen(taskModal, 'taskDialog');
  lucide.createIcons();
}

function closeTaskModal() {
  resetTaskFormState();
  taskModal.classList.add('hidden');
  popModalStack('taskManagerDialog');
}

// Xử lý nộp Form 1: Chọn Task có sẵn từ kho để xếp vào ngày
async function handleAddDefinedTaskSubmit(e) {
  e.preventDefault();
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const selectDefined = document.getElementById('selectDefinedTaskId');
  const dateInput = document.getElementById('definedTaskDate');
  const selectedTaskId = selectDefined ? selectDefined.value : null;
  const targetDate = dateInput ? dateInput.value : null;

  if (!selectedTaskId || !targetDate) {
    alert('Vui lòng chọn nhiệm vụ từ kho và ngày cần xếp lịch!');
    return;
  }

  // Chặn xếp lịch vào ngày quá khứ
  if (targetDate < getTodayStr()) {
    showToast({
      type: 'error',
      title: 'Không hợp lệ',
      message: 'Không thể xếp lịch nhiệm vụ vào ngày trong quá khứ!'
    });
    return;
  }

  const task = state.tasks.find(t => t.id === selectedTaskId);
  if (task) {
    task.date = targetDate;
    await saveSingleTask(task);
    closeTaskModal();
    renderApp();
    if (!taskManagerModal.classList.contains('hidden')) {
      renderTaskManagerContent();
    }
  }
}

// --- 8.1. TASK MANAGER HUB (KHO NHIỆM VỤ & QUẢN LÝ TASK TỔNG) ---
function openTaskManagerModal() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  state.taskManagerFilter = 'all';
  state.taskManagerSearch = '';
  const searchInput = document.getElementById('searchTaskManagerInput');
  if (searchInput) searchInput.value = '';
  updateTaskManagerFilterButtons();
  renderTaskManagerContent();
  animateModalOpen(taskManagerModal, 'taskManagerDialog');
  document.getElementById('userDropdown').classList.add('hidden');
  lucide.createIcons();
}

function closeTaskManagerModal() {
  taskManagerModal.classList.add('hidden');
  popModalStack('taskManagerDialog');
}

function setTaskManagerFilter(filter) {
  state.taskManagerFilter = filter;
  updateTaskManagerFilterButtons();
  renderTaskManagerContent();
}

function updateTaskManagerFilterButtons() {
  document.querySelectorAll('.tm-filter-btn').forEach(btn => {
    const f = btn.getAttribute('data-filter');
    if (f === state.taskManagerFilter) {
      btn.className = 'tm-filter-btn px-3 py-1.5 rounded-lg font-bold bg-blue-600 text-white shadow-2xs transition';
    } else {
      btn.className = 'tm-filter-btn px-3 py-1.5 rounded-lg font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition';
    }
  });
}

function renderTaskManagerContent() {
  const container = document.getElementById('taskManagerCardsContainer');
  if (!container) return;

  // Thống kê toàn kho
  const totalParents = state.parentTasks.length;
  const totalSubtasks = state.tasks.length;
  const unscheduledSubtasks = state.tasks.filter(t => !t.date || !t.date.trim()).length;
  const completedSubtasks = state.tasks.filter(t => t.completed).length;
  const pctDone = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const statParentsEl = document.getElementById('statTotalParents');
  const statSubtasksEl = document.getElementById('statTotalSubtasks');
  const statUnscheduledEl = document.getElementById('statUnscheduledSubtasks');
  const statCompletedEl = document.getElementById('statCompletedSubtasks');

  if (statParentsEl) statParentsEl.textContent = totalParents;
  if (statSubtasksEl) statSubtasksEl.textContent = totalSubtasks;
  if (statUnscheduledEl) statUnscheduledEl.textContent = unscheduledSubtasks;
  if (statCompletedEl) statCompletedEl.textContent = `${pctDone}% (${completedSubtasks}/${totalSubtasks})`;

  // Lọc nhiệm vụ
  const query = (state.taskManagerSearch || '').toLowerCase().trim();
  let filteredTasks = state.tasks.filter(t => {
    // Lọc theo trạng thái
    if (state.taskManagerFilter === 'unscheduled') {
      if (t.date && t.date.trim() !== '') return false;
    } else if (state.taskManagerFilter === 'scheduled') {
      if (!t.date || !t.date.trim()) return false;
    } else if (state.taskManagerFilter === 'completed') {
      if (!t.completed) return false;
    }

    // Lọc theo tìm kiếm từ khóa
    if (query) {
      const matchTitle = (t.title || '').toLowerCase().includes(query);
      const matchNote = (t.note || '').toLowerCase().includes(query);
      const parent = t.parentId ? getParentTask(t.parentId) : null;
      const matchParent = parent && (parent.title || '').toLowerCase().includes(query);
      return matchTitle || matchNote || matchParent;
    }

    return true;
  });

  // Render cards
  if (state.parentTasks.length === 0 && state.tasks.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
        <i data-lucide="layers" class="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-80"></i>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Kho nhiệm vụ đang trống</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Tạo các Task tổng (mục tiêu lớn trong năm) và phân rã các nhiệm vụ con (sub-tasks) để chuẩn bị xếp vào lịch học tập & công việc.
        </p>
        <button onclick="openAddParentTaskModal()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-2">
          <i data-lucide="plus" class="w-4 h-4"></i> Thêm parentTask đầu tiên
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '';

  // Render từng Parent Task
  state.parentTasks.forEach(parent => {
    const parentSubtasks = filteredTasks.filter(t => t.parentId === parent.id);
    const allParentSubtasks = state.tasks.filter(t => t.parentId === parent.id);
    const parentCompletedCount = allParentSubtasks.filter(t => t.completed).length;
    const parentPct = allParentSubtasks.length > 0 ? Math.round((parentCompletedCount / allParentSubtasks.length) * 100) : 0;
    const palette = getParentColorConfig(parent.color);

    html += `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
        <!-- Parent Card Header -->
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${palette.cardHeader}" style="${palette.cardHeaderStyle || ''}">
          <div class="flex items-start gap-3 min-w-0">
            <span class="w-3.5 h-3.5 rounded-full ${palette.dot} mt-1 shrink-0 shadow-xs" style="${palette.dotStyle || ''}"></span>
            <div class="min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">${escapeHtml(parent.title)}</h3>
                <span class="px-2.5 py-0.5 text-xs font-mono font-black rounded-md border ${palette.badge}" style="${palette.badgeStyle || ''}">
                  #${escapeHtml(getParentTag(parent))}
                </span>
                <span class="px-2.5 py-0.5 text-xs font-extrabold rounded-md border ${palette.badge}" style="${palette.badgeStyle || ''}">
                  ${parentCompletedCount}/${allParentSubtasks.length} task (${parentPct}%)
                </span>
              </div>
              ${parent.description ? `<p class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">${escapeHtml(parent.description)}</p>` : ''}
            </div>
          </div>

          <!-- Parent Action Buttons -->
          <div class="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            <button onclick="openAddTaskModalForParent('${parent.id}')" title="Thêm subtask cho mục tiêu này" class="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs">
              <i data-lucide="plus" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"></i>
              <span>Thêm subtask</span>
            </button>
            <button onclick="openEditParentTaskModal('${parent.id}')" title="Sửa tên, tag hoặc màu Task tổng" class="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteParentTask('${parent.id}')" title="Xóa Task tổng này" class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Subtasks List Container -->
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${parentSubtasks.length === 0 ? `
            <div class="p-6 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-1.5">
              ${allParentSubtasks.length === 0 ? `
                <p>Chưa có subtask nào thuộc mục tiêu này.</p>
                <button onclick="openAddTaskModalForParent('${parent.id}')" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  + Thêm subtask ngay
                </button>
              ` : `
                <p>Không có subtask nào thỏa mãn bộ lọc hiện tại.</p>
              `}
            </div>
          ` : parentSubtasks.map(task => renderTaskManagerSubtaskRow(task)).join('')}
        </div>
      </div>
    `;
  });

  // Nhiệm vụ độc lập / Chưa phân loại parent
  const unassignedSubtasks = filteredTasks.filter(t => !t.parentId || !getParentTask(t.parentId));
  if (unassignedSubtasks.length > 0) {
    html += `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
        <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-800/60">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full bg-slate-400 shrink-0"></span>
            <div>
              <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Nhiệm vụ độc lập (Chưa gán Task tổng)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">${unassignedSubtasks.length} nhiệm vụ</p>
            </div>
          </div>
        </div>
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${unassignedSubtasks.map(task => renderTaskManagerSubtaskRow(task)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
}

function renderTaskManagerSubtaskRow(task) {
  const isPast = Boolean(task.date && task.date < getTodayStr());
  const isTaskOverdue = isOverdue(task);
  const canReplanThisTask = isPast && !task.completed && state.isAdmin;

  const priorityBadge = {
    high: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700 shrink-0">🔥 Cao</span>',
    medium: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">Bình thường</span>',
    low: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">Thấp</span>'
  }[task.priority] || '';

  const scheduleBadge = task.date && task.date.trim() !== ''
    ? `<span ${canReplanThisTask ? `onclick="openQuickScheduleModal('${task.id}')" title="Bấm để dời lịch (Replan) sang ngày mới"` : ''} class="px-2.5 py-1 text-xs font-semibold rounded-lg ${isPast ? (task.completed ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 cursor-pointer hover:border-amber-400 hover:shadow-2xs') : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'} border flex items-center gap-1.5 shrink-0">
        <i data-lucide="calendar" class="w-3.5 h-3.5 ${isPast ? (task.completed ? 'text-slate-400' : 'text-amber-500') : 'text-blue-500'}"></i> ${task.date}
        ${canReplanThisTask ? `<i data-lucide="calendar-sync" class="w-3 h-3 text-amber-500 ml-0.5" title="Replan"></i>` : ''}
      </span>`
    : `<div class="flex items-center gap-1.5 shrink-0">
        <span class="px-2 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700/80 flex items-center gap-1">
          <i data-lucide="clock" class="w-3.5 h-3.5"></i> Chờ lên lịch
        </span>
        <button onclick="openQuickScheduleModal('${task.id}')" title="Xếp nhiệm vụ này vào lịch" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs">
          <i data-lucide="calendar-plus" class="w-3.5 h-3.5"></i> Xếp vào lịch
        </button>
      </div>`;

  const docBadge = (task.document && task.document.contentHtml)
    ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 flex items-center gap-1 shrink-0" title="Có tài liệu soạn thảo">
        <i data-lucide="file-text" class="w-3 h-3"></i> DOCX
      </span>`
    : '';

  const linksBadge = (task.links && task.links.length > 0)
    ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700 flex items-center gap-1 shrink-0">
        <i data-lucide="link" class="w-3 h-3"></i> ${task.links.length}
      </span>`
    : '';

  const checkboxHtml = isPast
    ? `<div title="Ngày đã qua - Không thể thay đổi trạng thái" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${task.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'} cursor-not-allowed opacity-60">
        ${task.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
      </div>`
    : `<button onclick="toggleTaskComplete('${task.id}')" title="Đánh dấu hoàn thành" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${task.completed ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-500'}">
        ${task.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
      </button>`;

  return `
    <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${task.completed ? 'bg-slate-50/40 dark:bg-slate-850/40' : ''} ${isPast ? 'opacity-75' : ''}">
      <div class="flex items-start gap-3 flex-1 min-w-0">
        ${checkboxHtml}

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span onclick="openTaskDetailModal('${task.id}')" class="text-sm font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 break-words ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}">
              ${escapeHtml(task.title)}
            </span>
            ${getParentBadgeHtml(task)}
            ${priorityBadge}
            ${docBadge}
            ${linksBadge}
            ${isTaskOverdue ? '<span class="text-[10px] font-bold text-rose-600 dark:text-rose-400">⚠️ Trễ hạn</span>' : ''}
            ${isPast ? '<span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><i data-lucide="lock" class="w-3 h-3"></i> Đã qua</span>' : ''}
          </div>
          ${task.note ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${escapeHtml(task.note)}</p>` : ''}
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-end sm:self-center shrink-0">
        ${scheduleBadge}
        ${!isPast ? `
          <button onclick="openEditTaskModal('${task.id}')" title="Chỉnh sửa nhiệm vụ" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa nhiệm vụ" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        ` : (canReplanThisTask ? `
          <button onclick="openQuickScheduleModal('${task.id}')" title="Dời lịch (Replan) sang ngày hôm nay hoặc tương lai" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs">
            <i data-lucide="calendar-sync" class="w-3.5 h-3.5"></i> Replan
          </button>
          <button onclick="openEditTaskModal('${task.id}')" title="Dời ngày qua form chỉnh sửa" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i data-lucide="calendar-cog" class="w-4 h-4 text-amber-500"></i>
          </button>
        ` : `
          <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <i data-lucide="${task.completed ? 'check-check' : 'lock'}" class="w-3 h-3"></i> ${task.completed ? 'Đã xong' : 'Chỉ xem'}
          </span>
        `)}
      </div>
    </div>
  `;
}

// --- 8.2. PARENT TASK ADD / EDIT MODAL & RGB COLOR PICKER ---
function renderParentColorPicker(selectedColor = '#2563eb') {
  let hex = '#2563eb';
  if (selectedColor && typeof selectedColor === 'string') {
    const trimmed = selectedColor.trim();
    if (LEGACY_COLOR_HEX[trimmed]) {
      hex = LEGACY_COLOR_HEX[trimmed];
    } else if (trimmed.startsWith('#')) {
      hex = trimmed;
    } else {
      hex = '#' + trimmed;
    }
  }

  const customColorPicker = document.getElementById('parentCustomColorPicker');
  const hexInput = document.getElementById('parentColorHexInput');
  const hiddenInput = document.getElementById('selectedParentColor');

  if (customColorPicker) customColorPicker.value = hex;
  if (hexInput) hexInput.value = hex.replace('#', '').toUpperCase();
  if (hiddenInput) hiddenInput.value = hex;

  updateParentTagPreview(hex);
  renderQuickColorPresets(hex);
}

function selectParentColor(colorHex) {
  renderParentColorPicker(colorHex);
}

function renderQuickColorPresets(currentHex = '#2563eb') {
  const container = document.getElementById('parentQuickColorPresets');
  if (!container) return;

  const normalizedCurrent = (currentHex || '').toLowerCase();
  container.innerHTML = PRESET_RGB_COLORS.map(p => {
    const isSelected = p.hex.toLowerCase() === normalizedCurrent;
    return `
      <button 
        type="button" 
        onclick="selectParentColor('${p.hex}')"
        title="${p.name} (${p.hex})"
        class="w-6 h-6 rounded-full transition-all hover:scale-115 shadow-2xs shrink-0 cursor-pointer ${
          isSelected 
            ? 'ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-800 scale-110' 
            : 'opacity-85 hover:opacity-100'
        }"
        style="background-color: ${p.hex};"
      ></button>
    `;
  }).join('');
}

function updateParentTagPreview(hexVal) {
  const hiddenInput = document.getElementById('selectedParentColor');
  const hex = hexVal || (hiddenInput ? hiddenInput.value : '#2563eb') || '#2563eb';
  const rgb = hexToRgb(hex);

  const tagInput = document.getElementById('parentTaskTagInput');
  const titleInput = document.getElementById('parentTaskTitleInput');
  let tagText = '';
  if (tagInput && tagInput.value.trim()) {
    tagText = tagInput.value.trim().toUpperCase().slice(0, 5);
  } else if (titleInput && titleInput.value.trim()) {
    tagText = generateParentTaskTag(titleInput.value.trim());
  }
  if (!tagText) tagText = 'TAG';

  const liveText = document.getElementById('parentTagLiveText');
  const livePreview = document.getElementById('parentTagLivePreview');

  if (liveText) liveText.textContent = tagText;
  if (livePreview) {
    livePreview.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
    livePreview.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
    livePreview.style.color = hex;
  }
}

let isParentTagManuallyEdited = false;

function updateParentTagCharCount() {
  const tagInput = document.getElementById('parentTaskTagInput');
  const countEl = document.getElementById('parentTagCharCount');
  if (tagInput && countEl) {
    countEl.textContent = `${tagInput.value.length}/5`;
  }
  updateParentTagPreview();
}

function openAddParentTaskModal() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  formParentTask.reset();
  document.getElementById('parentTaskId').value = '';
  document.getElementById('parentTaskModalTitle').textContent = 'Thêm parentTask';
  document.getElementById('selectedParentColor').value = '#2563eb';

  const tagInput = document.getElementById('parentTaskTagInput');
  if (tagInput) tagInput.value = '';
  isParentTagManuallyEdited = false;
  updateParentTagCharCount();

  renderParentColorPicker('#2563eb');
  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }
  animateModalOpen(parentTaskModal, 'parentTaskDialog');
  document.getElementById('parentTaskTitleInput').focus();
}

function openEditParentTaskModal(parentId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const parent = state.parentTasks.find(p => p.id === parentId);
  if (!parent) return;

  document.getElementById('parentTaskId').value = parent.id;
  document.getElementById('parentTaskTitleInput').value = parent.title;
  document.getElementById('parentTaskDescInput').value = parent.description || '';
  document.getElementById('selectedParentColor').value = parent.color || '#2563eb';
  document.getElementById('parentTaskModalTitle').textContent = 'Chỉnh sửa parentTask';

  const tagInput = document.getElementById('parentTaskTagInput');
  if (tagInput) {
    tagInput.value = getParentTag(parent);
    isParentTagManuallyEdited = true; // Giữ nguyên tag khi mở sửa, người dùng có thể bấm Tự sinh lại nếu muốn
    updateParentTagCharCount();
  }
  
  renderParentColorPicker(parent.color || '#2563eb');
  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }
  animateModalOpen(parentTaskModal, 'parentTaskDialog');
}

function closeParentTaskModal() {
  parentTaskModal.classList.add('hidden');
  popModalStack('taskManagerDialog');
}

async function handleSaveParentTask(e) {
  e.preventDefault();
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const id = document.getElementById('parentTaskId').value;
  const title = document.getElementById('parentTaskTitleInput').value.trim();
  const color = document.getElementById('selectedParentColor').value || '#2563eb';
  const description = document.getElementById('parentTaskDescInput').value.trim();

  if (!title) {
    alert('Vui lòng nhập tên Task tổng!');
    return;
  }

  const tagInput = document.getElementById('parentTaskTagInput');
  let tag = (tagInput ? tagInput.value.trim() : '') || generateParentTaskTag(title) || 'TASK';
  tag = tag.toUpperCase().slice(0, 5);

  if (id) {
    const parent = state.parentTasks.find(p => p.id === id);
    if (parent) {
      parent.title = title;
      parent.tag = tag;
      parent.color = color;
      parent.description = description;
      await saveSingleParentTask(parent);
    }
  } else {
    const newParent = {
      id: 'parent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title,
      tag,
      color,
      description,
      createdAt: new Date().toISOString()
    };
    await saveSingleParentTask(newParent);
  }

  closeParentTaskModal();
  renderApp();
  renderTaskManagerContent();
}

async function deleteParentTask(parentId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const parent = state.parentTasks.find(p => p.id === parentId);
  if (!parent) return;

  if (confirm(`Bạn có chắc chắn muốn xóa Task tổng "${parent.title}"?\nCác nhiệm vụ con sẽ không bị xóa mà được chuyển sang nhóm "Nhiệm vụ độc lập".`)) {
    await deleteSingleParentTask(parentId);
    renderApp();
    renderTaskManagerContent();
  }
}

// --- 8.3. QUICK SCHEDULE MODAL ---
function openQuickScheduleModal(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.date && task.date < getTodayStr() && task.completed) {
    showToast({
      type: 'warning',
      title: 'Không thể xếp lịch',
      message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch!'
    });
    return;
  }

  const todayStr = getTodayStr();
  const currentSelected = formatDate(state.currentDate);

  document.getElementById('quickScheduleTaskId').value = task.id;
  document.getElementById('quickScheduleTaskTitle').textContent = task.title;
  const dateInput = document.getElementById('quickScheduleDateInput');
  if (dateInput) {
    dateInput.min = todayStr;
    dateInput.value = currentSelected < todayStr ? todayStr : currentSelected;
  }
  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }
  animateModalOpen(quickScheduleModal, 'quickScheduleDialog');
}

function closeQuickScheduleModal() {
  quickScheduleModal.classList.add('hidden');
  popModalStack('taskManagerDialog');
}

async function handleQuickScheduleSubmit(e) {
  e.preventDefault();
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const taskId = document.getElementById('quickScheduleTaskId').value;
  const date = document.getElementById('quickScheduleDateInput').value;

  if (!taskId || !date) {
    alert('Vui lòng chọn ngày thực hiện!');
    return;
  }

  // Chặn xếp lịch vào ngày quá khứ
  if (date < getTodayStr()) {
    showToast({
      type: 'error',
      title: 'Không hợp lệ',
      message: 'Không thể xếp lịch nhiệm vụ vào ngày trong quá khứ!'
    });
    return;
  }

  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    const wasPast = Boolean(task.date && task.date < getTodayStr());
    if (wasPast && task.completed) {
      showToast({
        type: 'warning',
        title: 'Chỉ xem',
        message: 'Nhiệm vụ trong quá khứ đã hoàn thành, không thể dời lịch!'
      });
      return;
    }
    task.date = date;
    if (wasPast && date >= getTodayStr()) {
      task.replanCount = (task.replanCount || 0) + 1;
      showToast({
        type: 'success',
        title: 'Replan thành công',
        message: `Đã dời lịch nhiệm vụ "${task.title}" sang ngày ${date}! Bây giờ bạn có thể chỉnh sửa như bình thường.`
      });
    }
    await saveSingleTask(task);
    closeQuickScheduleModal();
    renderApp();
    renderTaskManagerContent();
  }
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
      <div class="text-center py-12 text-slate-500 dark:text-slate-400">
        <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-500 mx-auto mb-2"></i>
        <p class="font-bold text-slate-700 dark:text-slate-200 text-base">Tuyệt vời! Bạn không còn nhiệm vụ nào bị quá hạn.</p>
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
      <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">${escapeHtml(task.title)}</span>
            <span class="text-xs px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold border border-rose-200 dark:border-rose-700">Ngày cũ: ${task.date}</span>
            ${task.replanCount > 0 ? `<span class="text-xs px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold border border-amber-200 dark:border-amber-700">Đã dời ${task.replanCount} lần</span>` : ''}
          </div>
          ${task.note ? `<p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">${escapeHtml(task.note)}</p>` : ''}
        </div>

        <div class="flex items-center gap-2 flex-wrap self-end sm:self-center">
          <button onclick="replanTask('${task.id}', '${todayStr}')" title="Dời về ngày hôm nay" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs">
            Hôm nay
          </button>
          <button onclick="replanTask('${task.id}', '${tomorrowStr}')" title="Dời sang ngày mai" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition border border-slate-300 dark:border-slate-600">
            Ngày mai
          </button>
          <button onclick="replanTask('${task.id}', '${nextWeekStr}')" title="Dời sang 7 ngày tới" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition border border-slate-300 dark:border-slate-600">
            Tuần sau (+7d)
          </button>
          <input type="date" min="${todayStr}" onchange="replanTask('${task.id}', this.value)" title="Chọn ngày bất kỳ" class="text-xs px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white cursor-pointer hover:border-blue-400">
          
          <button onclick="toggleTaskComplete('${task.id}')" title="Đánh dấu đã hoàn thành" class="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg transition">
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa bỏ task này" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-500 dark:text-rose-400 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// --- 9. EXPORT & IMPORT (Chỉ Admin) ---
function exportData() {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const payload = {
    version: '3.2',
    exportedAt: new Date().toISOString(),
    parentTasks: state.parentTasks,
    tasks: state.tasks
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
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
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Tìm thấy ${imported.length} nhiệm vụ từ file sao lưu. Bạn có muốn nhập danh sách này không?`)) {
          state.tasks = imported;
          await saveCurrentTasks();
          renderApp();
          alert('Nhập dữ liệu thành công!');
        }
      } else if (imported && typeof imported === 'object' && Array.isArray(imported.tasks)) {
        const pCount = imported.parentTasks ? imported.parentTasks.length : 0;
        const tCount = imported.tasks.length;
        if (confirm(`Tìm thấy ${pCount} Task tổng và ${tCount} nhiệm vụ con từ file sao lưu. Bạn có muốn nhập dữ liệu này không?`)) {
          if (imported.parentTasks) {
            state.parentTasks = imported.parentTasks;
            saveParentTasksToStorage(state.parentTasks);
            if (state.currentUser && window.StudyPlannerFirebase) {
              for (const p of state.parentTasks) {
                await window.StudyPlannerFirebase.saveParentTaskToFirestore(state.currentUser.uid, p);
              }
            }
          }
          state.tasks = imported.tasks;
          await saveCurrentTasks();
          renderApp();
          if (!taskManagerModal.classList.contains('hidden')) {
            renderTaskManagerContent();
          }
          alert('Nhập dữ liệu thành công!');
        }
      } else {
        alert('File JSON không đúng định dạng sao lưu của ứng dụng!');
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

/**
 * Hiển thị thông báo Toast Notification hiện đại, tinh tế (thay thế browser alert thô)
 */
function showToast({ type = 'success', title = 'Thông báo', message = '', actionText = null, actionUrl = null, duration = 4500 }) {
  let container = document.getElementById('toastNotificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastNotificationContainer';
    container.className = 'fixed top-5 right-5 z-[120] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-3';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 transform transition-all duration-300 translate-y-[-10px] opacity-0 scale-95 backdrop-blur-md';

  const icons = {
    success: '<div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs"><i data-lucide="check-circle-2" class="w-5 h-5"></i></div>',
    error: '<div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs"><i data-lucide="alert-circle" class="w-5 h-5"></i></div>',
    warning: '<div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs"><i data-lucide="alert-triangle" class="w-5 h-5"></i></div>',
    info: '<div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs"><i data-lucide="info" class="w-5 h-5"></i></div>'
  };

  const actionHtml = (actionText && actionUrl)
    ? `<a href="${actionUrl}" target="_blank" class="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-bold transition border border-blue-200 dark:border-blue-800 shadow-2xs">
        <span>${escapeHtml(actionText)}</span>
        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
      </a>`
    : '';

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="flex-1 min-w-0 pt-0.5">
      <div class="text-sm font-bold text-slate-900 dark:text-white leading-tight">${escapeHtml(title)}</div>
      ${message ? `<div class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words">${message}</div>` : ''}
      ${actionHtml}
    </div>
    <button type="button" class="btn-close-toast text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition shrink-0">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-[-10px]', 'opacity-0', 'scale-95');
    toast.classList.add('translate-y-0', 'opacity-100', 'scale-100');
  });

  const dismiss = () => {
    toast.classList.remove('translate-y-0', 'opacity-100', 'scale-100');
    toast.classList.add('translate-y-[-10px]', 'opacity-0', 'scale-95');
    setTimeout(() => {
      toast.remove();
    }, 300);
  };

  toast.querySelector('.btn-close-toast')?.addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

// --- 9.1 TASK DETAIL & DOCX WYSIWYG EDITOR, GOOGLE DRIVE, RELATED LINKS ---

let docSaveTimeout = null;

function updateDetailModalCompletion(isCompleted) {
  const checkIcon = document.getElementById('detailCompleteCheckIcon');
  const btnToggle = document.getElementById('btnDetailToggleComplete');
  if (!checkIcon || !btnToggle) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  const isPast = Boolean(task && task.date && task.date < getTodayStr());

  if (isCompleted) {
    checkIcon.classList.remove('hidden');
    btnToggle.className = `mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 bg-blue-600 border-blue-600 text-white shadow-2xs ${isPast ? 'cursor-not-allowed opacity-60' : ''}`;
  } else {
    checkIcon.classList.add('hidden');
    btnToggle.className = `mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-500 shadow-2xs ${isPast ? 'cursor-not-allowed opacity-60' : ''}`;
  }
  btnToggle.disabled = isPast;
  btnToggle.title = isPast ? 'Nhiệm vụ thuộc ngày trong quá khứ - Không thể thay đổi trạng thái' : 'Đánh dấu hoàn thành';
}

function openTaskDetailModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  state.activeDetailTaskId = taskId;

  // Header data
  document.getElementById('detailTaskTitle').textContent = task.title;
  document.getElementById('detailTaskDate').innerHTML = task.date 
    ? `<i data-lucide="calendar" class="w-3.5 h-3.5 inline"></i> ${task.date}`
    : `<span class="text-amber-600 dark:text-amber-400 font-bold">⏳ Chưa lên lịch (Kho Backlog)</span>`;

  const priorityEl = document.getElementById('detailPriorityBadge');
  const pMap = {
    high: { text: '🔥 Ưu tiên cao', cls: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700' },
    medium: { text: 'Bình thường', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600' },
    low: { text: 'Thấp', cls: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700' }
  };
  const pInfo = pMap[task.priority] || pMap.medium;
  priorityEl.textContent = pInfo.text;
  priorityEl.className = `text-xs px-2.5 py-1 rounded-md font-bold ${pInfo.cls}`;

  const catEl = document.getElementById('detailCategoryBadge');
  if (task.parentId) {
    const parent = getParentTask(task.parentId);
    if (parent) {
      const palette = getParentColorConfig(parent.color);
      const tag = getParentTag(parent);
      catEl.innerHTML = `<span class="font-mono font-black mr-1">[${escapeHtml(tag)}]</span> ${escapeHtml(parent.title)}`;
      catEl.className = `text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border ${palette.badge}`;
      if (palette.badgeStyle) catEl.setAttribute('style', palette.badgeStyle);
      else catEl.removeAttribute('style');
      catEl.classList.remove('hidden');
    } else {
      catEl.classList.add('hidden');
    }
  } else if (task.category) {
    catEl.textContent = task.category;
    catEl.className = 'text-xs px-2.5 py-1 rounded-md font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700/80';
    catEl.removeAttribute('style');
    catEl.classList.remove('hidden');
  } else {
    catEl.classList.add('hidden');
  }

  const replanEl = document.getElementById('detailReplanBadge');
  if (task.replanCount && task.replanCount > 0) {
    replanEl.innerHTML = `<i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline mr-1 text-amber-500"></i> Đã dời lịch ${task.replanCount} lần`;
    replanEl.title = `Nhiệm vụ này đã được dời lịch ${task.replanCount} lần. Cố gắng hoàn thành sớm nhé!`;
    replanEl.classList.remove('hidden');
  } else {
    replanEl.classList.add('hidden');
  }

  // Trạng thái hoàn thành
  updateDetailModalCompletion(task.completed);

  // Đảm bảo cấu trúc tài liệu document
  if (!task.document) {
    const cleanName = task.title
      .replace(/[^\p{L}\p{N}_]+/gu, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 35) || 'Tai_lieu';
    task.document = {
      fileName: `${cleanName}.docx`,
      contentHtml: task.note ? `<p>${escapeHtml(task.note)}</p>` : '',
      driveFileId: null,
      driveWebViewLink: null,
      lastSaved: null
    };
  }

  document.getElementById('docFileNameInput').value = task.document.fileName || 'Tai_lieu.docx';
  const editor = document.getElementById('taskDocEditor');
  editor.innerHTML = task.document.contentHtml || '';

  // Google Drive link & trạng thái
  const driveSyncStatus = document.getElementById('driveSyncStatus');
  const btnOpenDocs = document.getElementById('btnOpenInGoogleDocsLink');
  if (task.document.driveWebViewLink) {
    btnOpenDocs.href = task.document.driveWebViewLink;
    btnOpenDocs.classList.remove('hidden');
    btnOpenDocs.classList.add('flex');

    driveSyncStatus.classList.remove('hidden');
    driveSyncStatus.classList.add('flex');
    if (task.document.lastDriveSynced) {
      const syncTimeStr = new Date(task.document.lastDriveSynced).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      driveSyncStatus.innerHTML = `<i data-lucide="cloud-check" class="w-4 h-4 text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400">Đã sync Drive (${syncTimeStr})</span>`;
    } else {
      driveSyncStatus.innerHTML = `<i data-lucide="cloud-check" class="w-4 h-4 text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400">Đã liên kết Drive</span>`;
    }
  } else {
    driveSyncStatus.classList.add('hidden');
    driveSyncStatus.classList.remove('flex');
    btnOpenDocs.classList.add('hidden');
    btnOpenDocs.classList.remove('flex');
  }

  // Khôi phục khổ giấy dọc / ngang đã lưu
  currentDocOrientation = task.document?.orientation || 'portrait';
  applyDocOrientation(currentDocOrientation);

  updateDocCounts();

  const isPast = Boolean(task.date && task.date < getTodayStr());

  // Hiển thị / ẩn banner thông báo quá khứ
  const pastNotice = document.getElementById('detailPastNotice');
  if (pastNotice) {
    pastNotice.classList.toggle('hidden', !isPast);
    if (isPast) {
      if (task.completed) {
        pastNotice.innerHTML = `
          <div class="flex items-center justify-between w-full flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="lock" class="w-4 h-4 text-slate-500 shrink-0"></i>
              <span>Nhiệm vụ đã hoàn thành trong quá khứ. Chế độ lưu trữ chỉ xem (Read-only).</span>
            </div>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã hoàn thành
            </span>
          </div>
        `;
      } else {
        pastNotice.innerHTML = `
          <div class="flex items-center justify-between w-full flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="alert-circle" class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"></i>
              <span>Nhiệm vụ quá hạn trong quá khứ. Hãy dời lịch (Replan) sang ngày mới để tiếp tục thực hiện.</span>
            </div>
            ${state.isAdmin ? `
              <button onclick="openQuickScheduleModal('${task.id}')" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition">
                <i data-lucide="calendar-sync" class="w-3.5 h-3.5"></i> Dời lịch (Replan) sang ngày mới
              </button>
            ` : ''}
          </div>
        `;
      }
    }
  }

  // Nút Sửa & Xóa trong Header
  const btnDetailEdit = document.getElementById('btnDetailEditTask');
  if (btnDetailEdit) {
    const canEditOrReplan = state.isAdmin && (!isPast || !task.completed);
    btnDetailEdit.classList.toggle('hidden', !canEditOrReplan);
    btnDetailEdit.title = isPast ? 'Dời lịch (Replan) nhiệm vụ' : 'Chỉnh sửa ngày/ưu tiên';
  }
  const btnDetailDelete = document.getElementById('btnDetailDeleteTask');
  if (btnDetailDelete) {
    btnDetailDelete.classList.toggle('hidden', isPast);
  }

  // Khóa / mở trình soạn thảo Live Editor
  editor.contentEditable = isPast ? 'false' : 'true';
  const taskDocToolbar = document.getElementById('taskDocToolbar');
  if (taskDocToolbar) {
    taskDocToolbar.classList.toggle('hidden', isPast);
  }
  const docFileNameInput = document.getElementById('docFileNameInput');
  if (docFileNameInput) {
    docFileNameInput.readOnly = isPast;
  }
  const btnTriggerImportDocx = document.getElementById('btnTriggerImportDocx');
  if (btnTriggerImportDocx) {
    btnTriggerImportDocx.classList.toggle('hidden', isPast);
  }
  const btnSaveToGoogleDrive = document.getElementById('btnSaveToGoogleDrive');
  if (btnSaveToGoogleDrive) {
    btnSaveToGoogleDrive.classList.toggle('hidden', isPast);
  }

  // Tab Liên kết & Tài nguyên: Ẩn khu vực upload và thêm link mới nếu ngày trong quá khứ
  const resourceUploadSec = document.getElementById('detailResourceUploadSection');
  if (resourceUploadSec) {
    resourceUploadSec.classList.toggle('hidden', isPast);
  }
  const addLinkSec = document.getElementById('detailAddLinkSection');
  if (addLinkSec) {
    addLinkSec.classList.toggle('hidden', isPast);
  }

  // Khởi tạo snapshot để kiểm tra thay đổi cho Drive Auto-Sync (5 phút/lần)
  lastDriveSyncedHtml = task.document?.contentHtml || '';
  let initialDocName = task.document?.fileName || '';
  if (initialDocName && !initialDocName.endsWith('.docx')) initialDocName += '.docx';
  lastDriveSyncedFileName = initialDocName || 'Tai_lieu.docx';
  if (!isPast) {
    startDriveAutoSyncTimer();
  }

  // Danh sách links
  renderTaskDetailLinks(task);

  // Mở tab soạn thảo mặc định
  switchDetailTab('document');

  // Mở modal
  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }
  animateModalOpen(document.getElementById('taskDetailModal'), 'taskDetailDialog');
  lucide.createIcons();
}

let isDetailFullscreen = false;
let currentDocOrientation = 'portrait'; // 'portrait' | 'landscape'

function applyDocOrientation(orientation) {
  currentDocOrientation = orientation || 'portrait';
  const paper = document.getElementById('docPaperSheet');
  const rulerContainer = document.getElementById('docRulerContainer');
  const btnPortrait = document.getElementById('btnPagePortrait');
  const btnLandscape = document.getElementById('btnPageLandscape');
  const rulerInch8 = document.getElementById('rulerInch8');
  const rulerInch9 = document.getElementById('rulerInch9');
  const rulerInch10 = document.getElementById('rulerInch10');

  const isLandscape = currentDocOrientation === 'landscape';

  if (paper) {
    if (isLandscape) {
      paper.style.width = '1123px';
      paper.style.minHeight = '794px';
    } else {
      paper.style.width = '794px';
      paper.style.minHeight = '1123px';
    }
  }

  if (rulerContainer) {
    rulerContainer.style.width = isLandscape ? '1123px' : '794px';
  }

  if (rulerInch8) rulerInch8.classList.toggle('hidden', !isLandscape);
  if (rulerInch9) rulerInch9.classList.toggle('hidden', !isLandscape);
  if (rulerInch10) rulerInch10.classList.toggle('hidden', !isLandscape);

  if (btnPortrait && btnLandscape) {
    if (isLandscape) {
      btnLandscape.className = 'px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs';
      btnPortrait.className = 'px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600';
    } else {
      btnPortrait.className = 'px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs';
      btnLandscape.className = 'px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600';
    }
  }

  if (state.activeDetailTaskId) {
    const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
    if (task) {
      if (!task.document) task.document = {};
      task.document.orientation = currentDocOrientation;
    }
  }

  updateDocCounts();
}

function insertPageBreakIntoEditor() {
  const editor = document.getElementById('taskDocEditor');
  if (!editor) return;
  editor.focus();

  const pageBreakHtml = 
    `<div class="doc-page-break" contenteditable="false">` +
      `<div class="doc-page-break-gap"></div>` +
      `<div class="doc-page-break-bar">` +
        `<span class="doc-page-break-badge">📄 Trang mới (Page Break)</span>` +
      `</div>` +
    `</div>` +
    `<p><br></p>`;

  document.execCommand('insertHTML', false, pageBreakHtml);
  updateDocCounts();
  triggerDocAutoSave();
}

function toggleDetailFullscreen() {
  const modalDialog = document.getElementById('taskDetailDialog');
  const modalBackdrop = document.getElementById('taskDetailModal');
  const modalHeader = document.getElementById('taskDetailModalHeader');
  const tabsBar = document.getElementById('taskDetailTabsBar');
  const iconFs = document.getElementById('iconFullscreen');
  const btnExitFs = document.getElementById('btnExitFullscreen');
  isDetailFullscreen = !isDetailFullscreen;

  if (isDetailFullscreen) {
    modalBackdrop.className = 'fixed inset-0 bg-slate-950 z-[100] modal-layer-system flex p-0';
    modalDialog.className = 'bg-slate-100 dark:bg-slate-950 w-full h-full rounded-none flex flex-col transition-all duration-150 overflow-hidden';
    
    // Hình 2: Ẩn phần header task và tabs bar khi full screen, chỉ giữ toolbar và editor
    if (modalHeader) modalHeader.classList.add('hidden');
    if (tabsBar) tabsBar.classList.add('hidden');
    if (btnExitFs) {
      btnExitFs.classList.remove('hidden');
      btnExitFs.classList.add('flex');
    }
    if (iconFs) iconFs.setAttribute('data-lucide', 'minimize-2');
  } else {
    modalBackdrop.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[75] modal-layer-detail flex items-center justify-center p-1 sm:p-2.5 2xl:p-4';
    modalDialog.className = 'bg-white dark:bg-slate-900 rounded-2xl w-full h-[96vh] 2xl:h-[97vh] max-w-[98vw] 2xl:max-w-[1950px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-200 overflow-hidden modal-dialog-animated';
    
    // Khôi phục header task và tabs bar
    if (modalHeader) modalHeader.classList.remove('hidden');
    if (tabsBar) tabsBar.classList.remove('hidden');
    if (btnExitFs) {
      btnExitFs.classList.remove('flex');
      btnExitFs.classList.add('hidden');
    }
    if (iconFs) iconFs.setAttribute('data-lucide', 'maximize-2');
  }
  lucide.createIcons();
}

function closeTaskDetailModal() {
  if (isDetailFullscreen) {
    toggleDetailFullscreen();
  }
  stopDriveAutoSyncTimer();
  if (state.activeDetailTaskId) {
    const closingTaskId = state.activeDetailTaskId;
    const task = state.tasks.find(t => t.id === closingTaskId);
    const isPast = Boolean(task && task.date && task.date < getTodayStr());

    if (!isPast) {
      flushSaveTaskDoc(closingTaskId);

      // Sync thủ công khi người dùng bấm vào button "Xong" hoặc "X" để tắt modal live editor
      const editor = document.getElementById('taskDocEditor');
      const fileNameInput = document.getElementById('docFileNameInput');
      const curHtml = editor ? (editor.innerHTML || '') : (task?.document?.contentHtml || '');
      let curFileName = (fileNameInput ? fileNameInput.value.trim() : '') || task?.document?.fileName || 'Tai_lieu.docx';
      if (!curFileName.endsWith('.docx')) curFileName += '.docx';

      const hasChanges = (curHtml !== lastDriveSyncedHtml || curFileName !== lastDriveSyncedFileName);
      const plainText = curHtml.replace(/<[^>]*>/g, '').trim();
      const hasContent = plainText.length > 0 || task?.document?.driveFileId;

      if (hasChanges && hasContent && state.currentUser && window.StudyPlannerFirebase) {
        console.log('Tự động sync Google Drive khi tắt modal live editor ("Xong" hoặc "X")...');
        performGoogleDriveUpload({
          silent: true,
          taskId: closingTaskId,
          contentHtml: curHtml,
          fileName: curFileName
        }).catch(e => console.warn('Lỗi sync Drive khi đóng modal:', e));
      }
    }

    state.activeDetailTaskId = null;
  }
  document.getElementById('taskDetailModal').classList.add('hidden');
  popModalStack('taskManagerDialog');
  renderApp();
}

function switchDetailTab(tabName) {
  const tabDoc = document.getElementById('tabBtnDocument');
  const tabLinks = document.getElementById('tabBtnLinks');
  const contentDoc = document.getElementById('tabContentDocument');
  const contentLinks = document.getElementById('tabContentLinks');

  if (tabName === 'document') {
    tabDoc.className = 'py-3 border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 transition font-bold';
    tabLinks.className = 'py-3 border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition font-bold';
    contentDoc.classList.remove('hidden');
    contentLinks.classList.add('hidden');
  } else {
    tabLinks.className = 'py-3 border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 transition font-bold';
    tabDoc.className = 'py-3 border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition font-bold';
    contentDoc.classList.add('hidden');
    contentLinks.classList.remove('hidden');
  }
  lucide.createIcons();
}

function updateDocCounts() {
  const editor = document.getElementById('taskDocEditor');
  if (!editor) return;
  const text = editor.innerText || editor.textContent || '';
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Đếm số trang (dựa vào số lượng page breaks + chiều cao thực tế)
  const pageBreaks = editor.querySelectorAll('.doc-page-break').length;
  const isLandscape = currentDocOrientation === 'landscape';
  const pageHeight = isLandscape ? 794 : 1123;
  // Chiều cao có thể chứa nội dung mỗi trang (trừ lề trên dưới 144px)
  const contentPageHeight = Math.max(400, pageHeight - 144);
  const heightBasedPages = Math.ceil(editor.scrollHeight / contentPageHeight);
  const totalPages = Math.max(1, pageBreaks + 1, heightBasedPages);

  const charEl = document.getElementById('editorCharCount');
  const wordEl = document.getElementById('editorWordCount');
  const pageEl = document.getElementById('editorPageCount');
  if (charEl) charEl.textContent = `${charCount} ký tự`;
  if (wordEl) wordEl.textContent = `${wordCount} từ`;
  if (pageEl) pageEl.textContent = `Trang 1 / ${totalPages}`;
}

function flushSaveTaskDoc(taskId) {
  if (!taskId) return;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.date && task.date < getTodayStr()) return;

  const editor = document.getElementById('taskDocEditor');
  const fileNameInput = document.getElementById('docFileNameInput');
  if (!editor || !fileNameInput) return;

  if (!task.document) task.document = {};
  task.document.contentHtml = editor.innerHTML;
  let fname = fileNameInput.value.trim();
  if (fname && !fname.endsWith('.docx')) fname += '.docx';
  task.document.fileName = fname || 'Tai_lieu.docx';
  task.document.orientation = currentDocOrientation || 'portrait';
  task.document.lastSaved = new Date().toISOString();

  saveSingleTask(task);

  const statusEl = document.getElementById('editorSaveStatus');
  if (statusEl) {
    statusEl.innerHTML = '<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã tự động lưu';
    statusEl.className = 'flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold';
    lucide.createIcons();
  }
}

function triggerDocAutoSave() {
  const activeTask = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (activeTask && activeTask.date && activeTask.date < getTodayStr()) return;

  const statusEl = document.getElementById('editorSaveStatus');
  if (statusEl) {
    statusEl.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Đang lưu...';
    statusEl.className = 'flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium';
    lucide.createIcons();
  }

  // Cập nhật trạng thái Drive: nếu đã có file trên Drive và có thay đổi so với bản sync Drive gần nhất
  if (state.activeDetailTaskId) {
    const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
    if (task && task.document?.driveFileId) {
      const editor = document.getElementById('taskDocEditor');
      const docNameInput = document.getElementById('docFileNameInput');
      const curHtml = editor ? (editor.innerHTML || '') : '';
      let curName = docNameInput ? docNameInput.value.trim() : '';
      if (curName && !curName.endsWith('.docx')) curName += '.docx';

      if (curHtml !== lastDriveSyncedHtml || (curName && curName !== lastDriveSyncedFileName)) {
        const driveSyncStatus = document.getElementById('driveSyncStatus');
        if (driveSyncStatus) {
          driveSyncStatus.classList.remove('hidden');
          driveSyncStatus.classList.add('flex');
          driveSyncStatus.innerHTML = '<i data-lucide="clock" class="w-3.5 h-3.5 text-amber-500 animate-pulse"></i> <span class="text-amber-600 dark:text-amber-400 text-[11px]">Chưa sync Drive (tự động sau 5p)</span>';
          driveSyncStatus.title = 'Có thay đổi mới chưa lưu lên Drive. Hệ thống sẽ tự động đồng bộ sau 5 phút hoặc bấm "Lưu vào Drive" để lưu ngay.';
          lucide.createIcons();
        }
      }
    }
  }

  if (docSaveTimeout) clearTimeout(docSaveTimeout);
  docSaveTimeout = setTimeout(() => {
    if (state.activeDetailTaskId) {
      flushSaveTaskDoc(state.activeDetailTaskId);
    }
  }, 500);
}

// Nhập file DOCX từ máy tính qua Mammoth.js
async function handleImportDocx(file) {
  if (!file) return;
  if (!window.mammoth) {
    alert('Thư viện xử lý Word (Mammoth.js) chưa sẵn sàng!');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const editor = document.getElementById('taskDocEditor');
    editor.innerHTML = result.value;

    const fileNameInput = document.getElementById('docFileNameInput');
    fileNameInput.value = file.name;

    updateDocCounts();
    triggerDocAutoSave();
    showToast({
      type: 'success',
      title: 'Nhập Word thành công',
      message: `Đã đọc và nhập nội dung từ tệp "${escapeHtml(file.name)}" vào trình soạn thảo.`
    });
  } catch (err) {
    console.error('Lỗi khi đọc file .docx:', err);
    showToast({
      type: 'error',
      title: 'Không thể đọc file .docx',
      message: err.message
    });
  }
}

// Chuẩn hóa và giới hạn kích thước hình ảnh cho khổ trang Google Docs (A4 / Letter trừ lề 1 inch)
const MAX_DOC_IMAGE_WIDTH = 650;

function normalizeDocImagesForGoogleDrive(html) {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      let widthAttr = parseInt(img.getAttribute('width') || '0', 10);
      if (!widthAttr || widthAttr > MAX_DOC_IMAGE_WIDTH) {
        img.setAttribute('width', String(MAX_DOC_IMAGE_WIDTH));
      }
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '12pt auto';
      img.style.borderRadius = '4px';
    });
    return doc.body.innerHTML;
  } catch (e) {
    console.warn('Lỗi khi chuẩn hóa ảnh cho Drive:', e);
    return html;
  }
}

/**
 * Nén và chuẩn hóa kích thước ảnh về chuẩn trang tài liệu
 * Tránh tràn lề trên Google Docs và giảm dung lượng payload Firestore
 */
async function processAndOptimizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Tệp không phải là hình ảnh'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Nếu ảnh lớn hơn khổ giấy chuẩn (650px), tự động co tỉ lệ chuẩn
        if (width > MAX_DOC_IMAGE_WIDTH) {
          height = Math.round(height * (MAX_DOC_IMAGE_WIDTH / width));
          width = MAX_DOC_IMAGE_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Nén chất lượng cao 90%
        const isPng = file.type === 'image/png';
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.90);

        resolve({
          dataUrl,
          width,
          height
        });
      };
      img.onerror = () => reject(new Error('Không thể tải dữ liệu ảnh'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

function insertOptimizedImageIntoEditor({ dataUrl, width, height }) {
  const editor = document.getElementById('taskDocEditor');
  if (!editor) return;
  editor.focus();

  // Tạo thẻ img chuẩn có thuộc tính width tương thích 100% với Google Docs và căn giữa
  const imgHtml = `<p style="text-align: center; margin: 12pt 0;"><img src="${dataUrl}" width="${width}" style="max-width: 100%; height: auto; display: inline-block; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);" alt="Hình ảnh tài liệu" /></p><p><br></p>`;
  
  document.execCommand('insertHTML', false, imgHtml);
  updateDocCounts();
  triggerDocAutoSave();
}

function buildTaskDocxHtml(task, editorHtml) {
  const parent = task.parentId ? getParentTask(task.parentId) : null;
  const parentTitle = parent ? parent.title : (task.category || 'Không');
  const safeEditorHtml = normalizeDocImagesForGoogleDrive(editorHtml || '<p></p>');
  const orientation = (task.document && task.document.orientation) || currentDocOrientation || 'portrait';
  const isLandscape = orientation === 'landscape';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(task.title)}</title>
  <style>
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'};
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      font-weight: normal;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    p, li, td, th, div, span { font-family: 'Times New Roman', Times, serif; font-size: 13pt; font-weight: normal; line-height: 1.5; }
    h1 { font-family: 'Times New Roman', Times, serif; font-size: 20pt; font-weight: bold; color: #1e40af; margin-top: 18pt; margin-bottom: 6pt; }
    h2 { font-family: 'Times New Roman', Times, serif; font-size: 16pt; font-weight: bold; color: #1e3a8a; margin-top: 14pt; margin-bottom: 5pt; }
    h3 { font-family: 'Times New Roman', Times, serif; font-size: 14pt; font-weight: bold; color: #2563eb; margin-top: 10pt; margin-bottom: 4pt; }
    p { margin-bottom: 8pt; line-height: 1.5; }
    ul, ol { margin-left: 24pt; margin-bottom: 8pt; }
    li { margin-bottom: 4pt; }
    ul[data-bullet="star"], .list-star { list-style-type: '★  '; }
    ul[data-bullet="check"], .list-check { list-style-type: '✔  '; }
    ul[data-bullet="arrow"], .list-arrow { list-style-type: '➔  '; }
    ul[type="square"], .list-square { list-style-type: square; }
    ul[type="circle"], .list-circle { list-style-type: circle; }
    ol[type="a"] { list-style-type: lower-alpha; }
    ol[type="A"] { list-style-type: upper-alpha; }
    ol[type="i"] { list-style-type: lower-roman; }
    ol[type="I"] { list-style-type: upper-roman; }
    ol[type="1"] { list-style-type: decimal; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; font-family: 'Times New Roman', Times, serif; font-size: 13pt; }
    th, td { border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: left; }
    th { background-color: #f1f5f9; font-weight: bold; }
    blockquote { border-left: 3pt solid #3b82f6; padding-left: 10pt; margin: 10pt 0; color: #64748b; font-style: italic; }
    img { max-width: 100% !important; height: auto !important; display: block; margin: 12pt auto; border-radius: 4pt; }
    pre, code { font-family: 'Consolas', 'Courier New', monospace; background-color: #f1f5f9; padding: 2pt 4pt; border-radius: 3pt; font-size: 10.5pt; }
    .doc-page-break {
      page-break-before: always !important;
      break-before: page !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    }
    .doc-page-break * {
      display: none !important;
    }
  </style>
</head>
<body>
  <h1 style="color: #1e40af; border-bottom: 2pt solid #2563eb; padding-bottom: 4pt; font-family: 'Times New Roman', Times, serif;">${escapeHtml(task.title)}</h1>
  <p style="color: #64748b; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">
    <strong>Kế hoạch:</strong> ${task.date || 'Chưa lên lịch'} &nbsp;|&nbsp; 
    <strong>Parent Task:</strong> ${escapeHtml(parentTitle)} &nbsp;|&nbsp; 
    <strong>Mức độ:</strong> ${task.priority === 'high' ? '🔥 Ưu tiên cao' : (task.priority === 'low' ? 'Thấp' : 'Bình thường')}
  </p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 14pt;" />
  ${safeEditorHtml}
</body>
</html>`;
}

// Xuất file DOCX tải về máy qua html-docx-js và FileSaver
function handleExportDocx() {
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task) return;

  const editor = document.getElementById('taskDocEditor');
  const fileNameInput = document.getElementById('docFileNameInput');
  let fileName = fileNameInput.value.trim() || 'Tai_lieu.docx';
  if (!fileName.endsWith('.docx')) fileName += '.docx';

  const editorHtml = editor.innerHTML || '<p></p>';
  const fullHtml = buildTaskDocxHtml(task, editorHtml);

  try {
    if (window.htmlDocx && window.saveAs) {
      const converted = window.htmlDocx.asBlob(fullHtml);
      window.saveAs(converted, fileName);
    } else {
      const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
    }
    showToast({
      type: 'success',
      title: 'Đang tải file Word',
      message: `Tệp "${escapeHtml(fileName)}" đang được tải về máy của bạn.`
    });
  } catch (err) {
    console.error('Lỗi khi xuất DOCX:', err);
    showToast({
      type: 'error',
      title: 'Lỗi xuất file Word',
      message: err.message
    });
  }
}

// --- QUẢN LÝ ĐỒNG BỘ GOOGLE DRIVE & AUTO-SYNC ---
const DRIVE_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // Tự động đồng bộ vào Google Drive 5 phút/lần
let isDriveSyncing = false;
let driveAutoSyncInterval = null;
let lastDriveSyncedHtml = '';
let lastDriveSyncedFileName = '';

function startDriveAutoSyncTimer() {
  stopDriveAutoSyncTimer();
  driveAutoSyncInterval = setInterval(() => {
    // Chỉ tự động sync khi modal chi tiết nhiệm vụ đang mở và có activeDetailTaskId
    const modal = document.getElementById('taskDetailModal');
    if (modal && !modal.classList.contains('hidden') && state.activeDetailTaskId) {
      handleAutoSyncToGoogleDrive();
    } else {
      stopDriveAutoSyncTimer();
    }
  }, DRIVE_AUTO_SYNC_INTERVAL_MS);
}

function stopDriveAutoSyncTimer() {
  if (driveAutoSyncInterval) {
    clearInterval(driveAutoSyncInterval);
    driveAutoSyncInterval = null;
  }
}

// Hàm kích hoạt tự động đồng bộ ngầm định kỳ (5 phút/lần)
async function handleAutoSyncToGoogleDrive() {
  if (isDriveSyncing) return;
  if (!state.activeDetailTaskId) return;
  if (!state.currentUser || !window.StudyPlannerFirebase) return;

  // Kiểm tra token Google Drive có sẵn không (nếu chưa đăng nhập Google thì bỏ qua không quấy rầy)
  const token = window.StudyPlannerFirebase.getGoogleAccessToken ? window.StudyPlannerFirebase.getGoogleAccessToken() : null;
  if (!token) return;

  // Nếu token Google Drive đã hết hạn, không tự động bung popup re-auth làm gián đoạn người dùng gõ
  if (window.StudyPlannerFirebase.isGoogleAccessTokenExpired && window.StudyPlannerFirebase.isGoogleAccessTokenExpired()) {
    return;
  }

  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task) return;

  const editor = document.getElementById('taskDocEditor');
  const fileNameInput = document.getElementById('docFileNameInput');
  if (!editor || !fileNameInput) return;

  const currentHtml = editor.innerHTML || '';
  let currentFileName = fileNameInput.value.trim() || 'Tai_lieu.docx';
  if (!currentFileName.endsWith('.docx')) currentFileName += '.docx';

  // Không có bất kỳ thay đổi nào so với lần đã sync lên Google Drive gần nhất -> bỏ qua
  if (currentHtml === lastDriveSyncedHtml && currentFileName === lastDriveSyncedFileName) {
    return;
  }

  // Không tự động tạo file trắng nếu trình soạn thảo hoàn toàn rỗng và chưa từng có file trên Google Drive
  const plainText = (editor.innerText || editor.textContent || '').trim();
  if (!plainText && !task.document?.driveFileId) {
    return;
  }

  console.log('Đang tự động đồng bộ Google Drive (chu kỳ 5 phút)...');
  await performGoogleDriveUpload({ silent: true });
}

/**
 * Thực hiện upload/cập nhật tài liệu lên Google Drive
 * @param {Object} options - { silent: boolean, taskId: string, contentHtml: string, fileName: string }
 *  - silent = false: Được gọi khi người dùng bấm nút "Lưu vào Drive" thủ công -> Hiển thị spinner nút, toast thông báo
 *  - silent = true: Được gọi từ vòng lặp tự động đồng bộ 5 phút/lần hoặc khi tắt modal ("Xong"/"X") -> Cập nhật trạng thái ngầm
 */
async function performGoogleDriveUpload(options = {}) {
  const isSilent = options && options.silent === true;
  if (isDriveSyncing) return;
  const targetTaskId = options.taskId || state.activeDetailTaskId;
  if (!targetTaskId) return;
  const task = state.tasks.find(t => t.id === targetTaskId);
  if (!task) return;

  // Chặn đồng bộ tài liệu của nhiệm vụ trong quá khứ
  if (task.date && task.date < getTodayStr()) {
    if (!isSilent) {
      showToast({
        type: 'warning',
        title: 'Chỉ xem',
        message: 'Nhiệm vụ thuộc ngày trong quá khứ, chỉ có thể xem!'
      });
    }
    return;
  }

  // Nếu chưa đăng nhập
  if (!state.currentUser || !window.StudyPlannerFirebase) {
    if (isSilent) return;
    if (confirm('Bạn cần Đăng nhập bằng tài khoản Google để lưu tài liệu trực tiếp vào Google Drive cá nhân của bạn. Đăng nhập ngay?')) {
      try {
        await window.StudyPlannerFirebase.signInWithGoogle();
      } catch (e) {
        console.warn('Đăng nhập Google thất bại:', e);
        return;
      }
    } else {
      return;
    }
  }

  // Kiểm tra token Google Drive
  if (window.StudyPlannerFirebase.isGoogleAccessTokenExpired && window.StudyPlannerFirebase.isGoogleAccessTokenExpired()) {
    if (isSilent) {
      return;
    }
    console.log('Google Drive Token đã hết hạn. Đang xin cấp mới...');
    try {
      await window.StudyPlannerFirebase.ensureValidGoogleAccessToken(true);
    } catch (e) {
      console.warn('Không thể gia hạn token Google Drive:', e);
      showToast({
        type: 'warning',
        title: 'Phiên Google Drive hết hạn',
        message: 'Vui lòng đăng nhập lại Google để tiếp tục lưu tài liệu.'
      });
      return;
    }
  }

  const btnSave = document.getElementById('btnSaveToGoogleDrive');
  const driveSyncStatus = document.getElementById('driveSyncStatus');
  const editorSaveStatus = document.getElementById('editorSaveStatus');
  const originalBtnHtml = btnSave ? btnSave.innerHTML : '';

  isDriveSyncing = true;

  if (!isSilent && btnSave) {
    btnSave.disabled = true;
    btnSave.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Đang tải lên...';
    lucide.createIcons();
  }

  if (isSilent) {
    if (driveSyncStatus) {
      driveSyncStatus.classList.remove('hidden');
      driveSyncStatus.classList.add('flex');
      driveSyncStatus.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5 animate-spin text-blue-500"></i> <span class="text-blue-600 dark:text-blue-400">Đang tự động sync Drive...</span>';
      lucide.createIcons();
    }
    if (editorSaveStatus) {
      editorSaveStatus.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5 animate-spin"></i> Đang tự động đồng bộ Google Drive...';
      editorSaveStatus.className = 'flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium';
      lucide.createIcons();
    }
  }

  try {
    const editor = document.getElementById('taskDocEditor');
    const fileNameInput = document.getElementById('docFileNameInput');
    let fileName = options.fileName || (fileNameInput ? fileNameInput.value.trim() : '') || task.document?.fileName || 'Tai_lieu.docx';
    if (!fileName.endsWith('.docx')) fileName += '.docx';

    let editorHtml = options.contentHtml !== undefined
      ? options.contentHtml
      : (editor ? (editor.innerHTML || '') : (task.document?.contentHtml || ''));
    if (!editorHtml) editorHtml = '<p></p>';

    const fullHtml = buildTaskDocxHtml(task, editorHtml);

    // Cấu trúc phân cấp 4 tầng: study_idv_planning / [Năm] / [Task tổng] / [Task con]
    const yearStr = (task.date && task.date.trim()) 
      ? task.date.split('-')[0] 
      : new Date().getFullYear().toString();

    let parentTitle = 'Nhiệm vụ độc lập';
    if (task.parentId) {
      const parent = getParentTask(task.parentId);
      if (parent && parent.title) {
        parentTitle = parent.title.trim();
      }
    } else if (task.category) {
      parentTitle = task.category.trim();
    }

    const subtaskTitle = (task.title || 'Nhiệm vụ').trim();
    const folderPath = ['study_idv_planning', yearStr, parentTitle, subtaskTitle];

    // Gửi trực tiếp fullHtml chuẩn hóa để Google Drive tự động chuyển đổi thành tài liệu Google Docs
    const driveResult = await window.StudyPlannerFirebase.uploadFileToGoogleDrive({
      fileName: fileName,
      content: fullHtml,
      mimeType: 'text/html',
      existingFileId: task.document?.driveFileId || null,
      folderPath: folderPath,
      orientation: (task.document && task.document.orientation) || currentDocOrientation || 'portrait'
    });

    if (!task.document) task.document = {};
    task.document.driveFileId = driveResult.fileId;
    task.document.driveWebViewLink = driveResult.googleDocsUrl || driveResult.webViewLink;
    task.document.driveFolderId = driveResult.folderId || null;
    task.document.fileName = fileName;
    task.document.contentHtml = editorHtml;
    task.document.lastSaved = new Date().toISOString();
    task.document.lastDriveSynced = new Date().toISOString();

    await saveSingleTask(task);

    // Cập nhật snapshot đã sync thành công
    lastDriveSyncedHtml = editorHtml;
    lastDriveSyncedFileName = fileName;

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const btnOpenDocs = document.getElementById('btnOpenInGoogleDocsLink');

    if (driveSyncStatus) {
      driveSyncStatus.classList.remove('hidden');
      driveSyncStatus.classList.add('flex');
      driveSyncStatus.title = 'Tự động đồng bộ vào Google Drive 5 phút/lần';
      driveSyncStatus.innerHTML = `<i data-lucide="cloud-check" class="w-4 h-4 text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400">Đã sync Drive (${timeStr})</span>`;
    }

    if (btnOpenDocs) {
      btnOpenDocs.href = driveResult.googleDocsUrl || driveResult.webViewLink;
      btnOpenDocs.classList.remove('hidden');
      btnOpenDocs.classList.add('flex');
    }

    if (editorSaveStatus) {
      editorSaveStatus.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã tự động lưu & sync Drive (${timeStr})`;
      editorSaveStatus.className = 'flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold';
    }

    lucide.createIcons();

    if (!isSilent) {
      const displayPath = `study_idv_planning / ${yearStr} / ${parentTitle} / ${subtaskTitle}`;
      showToast({
        type: 'success',
        title: 'Đã lưu vào Google Drive!',
        message: `Tài liệu <strong>"${escapeHtml(fileName)}"</strong> đã được đồng bộ.<br><span class="font-mono text-[11px] opacity-85 text-slate-500 dark:text-slate-400">📂 ${escapeHtml(displayPath)}</span>`,
        actionText: 'Mở Google Docs ↗',
        actionUrl: driveResult.googleDocsUrl || driveResult.webViewLink,
        duration: 5000
      });
    }
  } catch (err) {
    console.error('Lỗi khi lưu/đồng bộ lên Google Drive:', err);
    if (isSilent) {
      if (driveSyncStatus) {
        driveSyncStatus.classList.remove('hidden');
        driveSyncStatus.classList.add('flex');
        driveSyncStatus.innerHTML = '<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500"></i> <span class="text-amber-600 dark:text-amber-400 text-[11px]">Chưa thể tự động sync Drive</span>';
        lucide.createIcons();
      }
    } else {
      if (err.status === 401 || err.code === 'UNAUTHENTICATED' || (err.message && err.message.includes('authentication credentials'))) {
        showToast({
          type: 'warning',
          title: 'Phiên Google Drive đã hết hạn',
          message: 'Hệ thống đã tự động kết nối lại, vui lòng bấm "Lưu vào Drive" lại một lần nữa để hoàn tất!',
          duration: 5000
        });
      } else {
        showToast({
          type: 'error',
          title: 'Không thể lưu lên Google Drive',
          message: err.message || 'Đã có lỗi xảy ra trong quá trình kết nối với Google Drive.',
          duration: 6000
        });
      }
    }
  } finally {
    isDriveSyncing = false;
    if (!isSilent && btnSave) {
      btnSave.disabled = false;
      btnSave.innerHTML = originalBtnHtml;
      lucide.createIcons();
    }
  }
}

// Nút bấm lưu tài liệu thủ công vào Google Drive
async function handleSaveToGoogleDrive() {
  await performGoogleDriveUpload({ silent: false });
}

// Chèn Bảng vào Editor
function insertTableIntoEditor(rows = 3, cols = 3) {
  const editor = document.getElementById('taskDocEditor');
  editor.focus();

  let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><thead><tr style="background:#f8fafc;">';
  for (let c = 1; c <= cols; c++) {
    tableHtml += `<th style="border:1px solid #cbd5e1; padding:8px 12px; font-weight:bold;">Tiêu đề ${c}</th>`;
  }
  tableHtml += '</tr></thead><tbody>';
  for (let r = 1; r <= rows; r++) {
    tableHtml += '<tr>';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<td style="border:1px solid #cbd5e1; padding:8px 12px;">Dữ liệu ${r}.${c}</td>`;
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table><p><br></p>';

  document.execCommand('insertHTML', false, tableHtml);
  triggerDocAutoSave();
}

// --- QUẢN LÝ LIÊN KẾT & TÀI NGUYÊN (RESOURCES & GOOGLE DRIVE FILES) ---

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getResourceFileInfo(link) {
  const title = (link.title || '').toLowerCase();
  const mime = (link.mimeType || '').toLowerCase();
  const url = (link.url || '').toLowerCase();

  const isDrive = link.type === 'drive_file' || Boolean(link.fileId) || url.includes('drive.google.com') || url.includes('docs.google.com');

  if (mime.includes('pdf') || title.endsWith('.pdf')) {
    return {
      type: 'pdf',
      label: 'PDF',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: 'file-text',
      iconColor: 'text-rose-500',
      isDrive
    };
  }
  if (mime.includes('video') || title.endsWith('.mp4') || title.endsWith('.mkv') || title.endsWith('.mov') || title.endsWith('.webm') || title.endsWith('.avi')) {
    return {
      type: 'video',
      label: 'VIDEO',
      badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      icon: 'video',
      iconColor: 'text-purple-500',
      isDrive
    };
  }
  if (mime.includes('image') || title.endsWith('.png') || title.endsWith('.jpg') || title.endsWith('.jpeg') || title.endsWith('.webp') || title.endsWith('.gif')) {
    return {
      type: 'image',
      label: 'IMAGE',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: 'image',
      iconColor: 'text-emerald-500',
      isDrive
    };
  }
  if (mime.includes('audio') || title.endsWith('.mp3') || title.endsWith('.wav') || title.endsWith('.m4a') || title.endsWith('.ogg')) {
    return {
      type: 'audio',
      label: 'AUDIO',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: 'music',
      iconColor: 'text-amber-500',
      isDrive
    };
  }
  if (title.endsWith('.zip') || title.endsWith('.rar') || title.endsWith('.7z') || title.endsWith('.tar') || title.endsWith('.gz')) {
    return {
      type: 'archive',
      label: 'ZIP',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: 'archive',
      iconColor: 'text-slate-500',
      isDrive
    };
  }
  if (title.endsWith('.doc') || title.endsWith('.docx') || mime.includes('word') || url.includes('docs.google.com/document')) {
    return {
      type: 'doc',
      label: 'DOCX',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: 'file-type-2',
      iconColor: 'text-blue-500',
      isDrive
    };
  }
  if (title.endsWith('.xls') || title.endsWith('.xlsx') || title.endsWith('.csv') || mime.includes('sheet') || url.includes('docs.google.com/spreadsheets')) {
    return {
      type: 'sheet',
      label: 'EXCEL',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: 'sheet',
      iconColor: 'text-emerald-600',
      isDrive
    };
  }
  if (title.endsWith('.ppt') || title.endsWith('.pptx') || mime.includes('presentation') || url.includes('docs.google.com/presentation')) {
    return {
      type: 'presentation',
      label: 'SLIDE',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: 'presentation',
      iconColor: 'text-amber-600',
      isDrive
    };
  }

  return {
    type: 'link',
    label: isDrive ? 'DRIVE' : 'LINK',
    badgeClass: isDrive ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: isDrive ? 'hard-drive' : 'link',
    iconColor: isDrive ? 'text-blue-500' : 'text-slate-400',
    isDrive
  };
}

function renderTaskDetailLinks(task) {
  const container = document.getElementById('detailLinksList');
  const countEl = document.getElementById('detailLinkCount');
  const links = task.links || [];
  const isPast = Boolean(task.date && task.date < getTodayStr());

  if (countEl) countEl.textContent = links.length;

  // Cập nhật nút Mở thư mục Drive nếu task đã có ID thư mục
  const btnOpenFolder = document.getElementById('btnOpenTaskDriveFolder');
  const folderId = task.driveFolderId || task.document?.driveFolderId;
  if (btnOpenFolder) {
    if (folderId) {
      btnOpenFolder.href = `https://drive.google.com/drive/folders/${folderId}`;
      btnOpenFolder.classList.remove('hidden');
      btnOpenFolder.classList.add('flex');
    } else {
      btnOpenFolder.classList.add('hidden');
      btnOpenFolder.classList.remove('flex');
    }
  }

  if (links.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <i data-lucide="folder-open" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-xs sm:text-sm font-semibold">Chưa có tệp tài liệu hay liên kết nào</p>
        <p class="text-[11px] mt-0.5 opacity-80">${isPast ? 'Không có tài nguyên đính kèm nào cho nhiệm vụ này.' : 'Hãy tải tệp PDF, video MP4 lên Google Drive hoặc dán đường dẫn URL ở trên.'}</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = links.map(link => {
    const fileInfo = getResourceFileInfo(link);
    const sizeStr = formatFileSize(link.size);

    let hostname = '';
    try {
      hostname = new URL(link.url).hostname;
    } catch (e) {
      hostname = link.url;
    }

    const faviconUrl = fileInfo.isDrive 
      ? '' 
      : `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

    return `
      <div class="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-3 shadow-2xs hover:border-blue-400 dark:hover:border-blue-400 transition group">
        <div class="flex items-start gap-3 min-w-0 flex-1">
          ${fileInfo.isDrive ? `
            <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-750 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 ${fileInfo.iconColor}">
              <i data-lucide="${fileInfo.icon}" class="w-5 h-5"></i>
            </div>
          ` : `
            <img src="${faviconUrl}" alt="" class="w-5 h-5 rounded-sm mt-1 shrink-0" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          `}

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span class="text-[10px] font-black uppercase font-mono px-1.5 py-0.5 rounded border ${fileInfo.badgeClass}">
                ${fileInfo.label}
              </span>
              ${fileInfo.isDrive ? `
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                  <i data-lucide="hard-drive" class="w-3 h-3"></i> Google Drive
                </span>
              ` : ''}
              ${sizeStr ? `<span class="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-semibold">• ${sizeStr}</span>` : ''}
            </div>

            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 break-words flex items-center gap-1 transition">
              <span>${escapeHtml(link.title)}</span>
              <i data-lucide="external-link" class="w-3.5 h-3.5 shrink-0 inline opacity-60"></i>
            </a>

            ${link.note ? `<p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${escapeHtml(link.note)}</p>` : ''}
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" title="Mở trên Google Drive / Trình duyệt" class="px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-blue-200 dark:border-blue-800 transition flex items-center gap-1">
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">Mở</span>
          </a>
          <button onclick="navigator.clipboard.writeText('${escapeHtml(link.url)}'); showToast({ type: 'info', title: 'Đã sao chép link', message: 'Đã lưu đường dẫn vào clipboard.', duration: 2500 });" title="Sao chép link" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          ${state.isAdmin && !isPast ? `
            <button onclick="deleteDetailLink('${link.id}')" title="Xóa tài nguyên" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function addDetailLink(title, url, note) {
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task) return;

  if (task.date && task.date < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ thuộc ngày trong quá khứ, không thể thêm tài nguyên!'
    });
    return;
  }

  if (!task.links) task.links = [];
  const newLink = {
    id: 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title,
    url,
    note,
    createdAt: new Date().toISOString()
  };
  task.links.push(newLink);
  saveSingleTask(task);
  renderTaskDetailLinks(task);
  renderApp();
}

async function deleteDetailLink(linkId) {
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task || !task.links) return;

  if (task.date && task.date < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ thuộc ngày trong quá khứ, không thể xóa tài nguyên!'
    });
    return;
  }

  const link = task.links.find(l => l.id === linkId);
  if (!link) return;

  const isDrive = link.type === 'drive_file' || link.fileId;
  const confirmMsg = isDrive 
    ? `Bạn có chắc muốn xóa tệp "${link.title}" khỏi danh sách tài nguyên của nhiệm vụ này không?\n\n(Lưu ý: Tệp vẫn được lưu an toàn trong Google Drive của bạn)`
    : `Bạn có chắc muốn xóa liên kết "${link.title}" khỏi nhiệm vụ này?`;

  if (!confirm(confirmMsg)) return;

  task.links = task.links.filter(l => l.id !== linkId);
  await saveSingleTask(task);
  renderTaskDetailLinks(task);
  renderApp();
}

// Xử lý upload danh sách tệp lên thư mục Google Drive của Subtask
async function handleUploadResourceFilesToDrive(files) {
  if (!files || files.length === 0) return;
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task) return;

  if (task.date && task.date < getTodayStr()) {
    showToast({
      type: 'warning',
      title: 'Chỉ xem',
      message: 'Nhiệm vụ thuộc ngày trong quá khứ, không thể tải tệp lên!'
    });
    return;
  }

  // 1. Kiểm tra đăng nhập Google
  if (!state.currentUser || !window.StudyPlannerFirebase) {
    if (confirm('Bạn cần Đăng nhập bằng tài khoản Google để tải tệp lên Google Drive của nhiệm vụ này. Đăng nhập ngay?')) {
      try {
        await window.StudyPlannerFirebase.signInWithGoogle();
      } catch (e) {
        console.warn('Đăng nhập Google thất bại:', e);
        return;
      }
    } else {
      return;
    }
  }

  // 2. Kiểm tra token Google Drive
  if (window.StudyPlannerFirebase.isGoogleAccessTokenExpired && window.StudyPlannerFirebase.isGoogleAccessTokenExpired()) {
    try {
      await window.StudyPlannerFirebase.ensureValidGoogleAccessToken(true);
    } catch (e) {
      console.warn('Không thể gia hạn token Google Drive:', e);
      showToast({
        type: 'warning',
        title: 'Phiên Google Drive hết hạn',
        message: 'Vui lòng đăng nhập lại Google để tiếp tục tải tệp lên.'
      });
      return;
    }
  }

  // 3. Phân cấp thư mục 4 tầng trên Drive
  const yearStr = (task.date && task.date.trim()) 
    ? task.date.split('-')[0] 
    : new Date().getFullYear().toString();

  let parentTitle = 'Nhiệm vụ độc lập';
  if (task.parentId) {
    const parent = getParentTask(task.parentId);
    if (parent && parent.title) {
      parentTitle = parent.title.trim();
    }
  } else if (task.category) {
    parentTitle = task.category.trim();
  }

  const subtaskTitle = (task.title || 'Nhiệm vụ').trim();
  const folderPath = ['study_idv_planning', yearStr, parentTitle, subtaskTitle];

  // 4. Hiển thị thanh tiến trình
  const progressBox = document.getElementById('driveUploadProgressContainer');
  const statusText = document.getElementById('driveUploadStatusText');
  const progressPercent = document.getElementById('driveUploadProgressPercent');
  if (progressBox) progressBox.classList.remove('hidden');

  let successCount = 0;
  const fileArray = Array.from(files);
  const totalFiles = fileArray.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = fileArray[i];
    const formattedSize = formatFileSize(file.size);
    if (statusText) statusText.textContent = `Đang tải lên (${i + 1}/${totalFiles}): ${file.name} ${formattedSize ? `(${formattedSize})` : ''}...`;
    if (progressPercent) progressPercent.textContent = `${Math.round(((i) / totalFiles) * 100)}%`;

    try {
      const res = await window.StudyPlannerFirebase.uploadBinaryFileToGoogleDrive({
        file: file,
        fileName: file.name,
        mimeType: file.type,
        folderPath: folderPath
      });

      if (!task.links) task.links = [];
      task.links.push({
        id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: file.name,
        url: res.webViewLink,
        downloadUrl: res.webContentLink,
        fileId: res.fileId,
        type: 'drive_file',
        mimeType: file.type,
        size: res.size || file.size,
        createdAt: new Date().toISOString()
      });

      if (res.folderId) {
        task.driveFolderId = res.folderId;
        if (task.document) task.document.driveFolderId = res.folderId;
      }

      successCount++;
    } catch (err) {
      console.error(`Lỗi khi tải lên tệp "${file.name}":`, err);
      showToast({
        type: 'error',
        title: 'Tải tệp thất bại',
        message: `Không thể tải "${escapeHtml(file.name)}": ${err.message}`
      });
    }
  }

  // 5. Cất thanh tiến trình và lưu task
  if (progressBox) progressBox.classList.add('hidden');
  await saveSingleTask(task);
  renderTaskDetailLinks(task);
  renderApp();

  if (successCount > 0) {
    showToast({
      type: 'success',
      title: 'Tải lên Google Drive thành công!',
      message: `Đã lưu <strong>${successCount}/${totalFiles}</strong> tệp vào thư mục Drive của nhiệm vụ.<br><span class="font-mono text-[11px] opacity-85 text-slate-500 dark:text-slate-400">📂 study_idv_planning / ${yearStr} / ${parentTitle} / ${subtaskTitle}</span>`,
      duration: 5000
    });
  }
}

// --- CẤU HÌNH FIREBASE MODAL ---

function openFirebaseSetupModal() {
  const modal = document.getElementById('firebaseSetupModal');
  const input = document.getElementById('firebaseConfigInput');
  const statusEl = document.getElementById('firebaseConfigStatus');
  if (statusEl) statusEl.classList.add('hidden');

  if (window.StudyPlannerFirebase) {
    const existing = window.StudyPlannerFirebase.getStoredFirebaseConfig();
    input.value = existing ? JSON.stringify(existing, null, 2) : '';
  }

  modal.classList.remove('hidden');
}
window.openFirebaseSetupModal = openFirebaseSetupModal;

function closeFirebaseSetupModal() {
  document.getElementById('firebaseSetupModal').classList.add('hidden');
}

function handleSaveFirebaseConfig(e) {
  e.preventDefault();
  const inputVal = document.getElementById('firebaseConfigInput').value.trim();
  const statusEl = document.getElementById('firebaseConfigStatus');

  try {
    let jsonStr = inputVal;
    if (jsonStr.includes('{')) {
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonStr = jsonStr.substring(start, end + 1);
      }
    }
    const sanitized = jsonStr
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
      .replace(/,\s*}/g, '}');

    const configObj = JSON.parse(sanitized);

    if (!configObj.apiKey || !configObj.projectId) {
      throw new Error('Cấu hình Firebase phải bao gồm ít nhất "apiKey" và "projectId"!');
    }

    if (window.StudyPlannerFirebase) {
      window.StudyPlannerFirebase.saveFirebaseConfig(configObj);
      const initialized = window.StudyPlannerFirebase.initFirebaseApp();
      if (initialized) {
        statusEl.className = 'text-xs font-bold text-emerald-600 dark:text-emerald-400 block';
        statusEl.textContent = '✅ Đã lưu và kết nối Firebase thành công!';
        setTimeout(() => {
          closeFirebaseSetupModal();
          alert('Cấu hình Firebase thành công! Bạn có thể bấm "Đăng nhập Google" ngay bây giờ.');
        }, 800);
      } else {
        throw new Error('Không thể khởi tạo Firebase với cấu hình này.');
      }
    }
  } catch (err) {
    statusEl.className = 'text-xs font-bold text-rose-600 dark:text-rose-400 block';
    statusEl.textContent = 'Lỗi cấu hình: ' + err.message;
  }
}

// --- CÀI ĐẶT EMAIL NHẮC VIỆC TỰ ĐỘNG (DAILY TASK REMINDER) ---

async function openReminderSettingsModal() {
  const modal = document.getElementById('reminderSettingsModal');
  if (!modal) return;

  const emailDisplay = document.getElementById('reminderUserEmailDisplay');
  const chkMaster = document.getElementById('chkReminderMaster');
  const chkMorning = document.getElementById('chkReminderMorning');
  const chkEvening = document.getElementById('chkReminderEvening');

  if (state.currentUser && state.currentUser.email) {
    if (emailDisplay) {
      emailDisplay.innerHTML = `<span class="text-blue-600 dark:text-blue-400 font-bold">${escapeHtml(state.currentUser.email)}</span>`;
    }
  } else {
    if (emailDisplay) {
      emailDisplay.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-semibold italic">⚠️ Chưa đăng nhập Google (Hãy đăng nhập Google để tự động nhận email nhắc việc)</span>`;
    }
  }

  // Đọc cài đặt lưu trên Firestore
  if (state.currentUser && window.StudyPlannerFirebase && window.StudyPlannerFirebase.getUserRemindSettings) {
    try {
      const settings = await window.StudyPlannerFirebase.getUserRemindSettings(state.currentUser.uid);
      if (settings && chkMaster && chkMorning && chkEvening) {
        chkMaster.checked = settings.enabled !== false;
        chkMorning.checked = settings.morning !== false;
        chkEvening.checked = settings.evening !== false;

        const enabled = chkMaster.checked;
        chkMorning.disabled = !enabled;
        chkEvening.disabled = !enabled;
        if (chkMorning.parentElement) chkMorning.parentElement.classList.toggle('opacity-50', !enabled);
        if (chkEvening.parentElement) chkEvening.parentElement.classList.toggle('opacity-50', !enabled);
      }
    } catch (e) {
      console.warn('Lỗi đọc cấu hình reminder:', e);
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
window.openReminderSettingsModal = openReminderSettingsModal;

function closeReminderSettingsModal() {
  const modal = document.getElementById('reminderSettingsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}
window.closeReminderSettingsModal = closeReminderSettingsModal;

async function handleSaveReminderSettings() {
  if (!state.currentUser) {
    alert('Bạn cần đăng nhập tài khoản Google để lưu cài đặt nhận email nhắc nhở!');
    return;
  }

  const btnSave = document.getElementById('btnSaveReminderSettings');
  const origText = btnSave ? btnSave.textContent : 'Lưu cài đặt';
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = 'Đang lưu...';
  }

  const chkMaster = document.getElementById('chkReminderMaster');
  const chkMorning = document.getElementById('chkReminderMorning');
  const chkEvening = document.getElementById('chkReminderEvening');

  const settings = {
    enabled: chkMaster ? chkMaster.checked : true,
    morning: chkMorning ? chkMorning.checked : true,
    evening: chkEvening ? chkEvening.checked : true
  };

  try {
    if (window.StudyPlannerFirebase && window.StudyPlannerFirebase.saveUserRemindSettings) {
      const ok = await window.StudyPlannerFirebase.saveUserRemindSettings(state.currentUser.uid, settings);
      if (ok) {
        showToast({
          type: 'success',
          title: 'Cài đặt Email thành công!',
          message: 'Lịch nhắc việc tự động buổi sáng và buổi tối đã được cập nhật.',
          duration: 4000
        });
        closeReminderSettingsModal();
      } else {
        throw new Error('Không thể lưu lên Firestore.');
      }
    }
  } catch (err) {
    console.error('Lỗi khi lưu cài đặt email:', err);
    showToast({
      type: 'error',
      title: 'Lưu cài đặt thất bại',
      message: err.message || 'Vui lòng kiểm tra lại kết nối Firestore.'
    });
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = origText;
    }
  }
}

function generateReminderEmailPreviewHtml(shift = 'morning') {
  const isMorning = shift === 'morning';
  const todayStr = getTodayStr();
  const dateObj = new Date();
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = days[dateObj.getDay()];
  const formattedDate = `${dayName}, ngày ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

  const user = state.currentUser || { displayName: 'Bạn', email: 'user@example.com' };
  const parentTasksMap = (state.parentTasks || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const todayTasks = (state.tasks || []).filter(t => t.date === todayStr);
  const completedCount = todayTasks.filter(t => t.completed).length;
  const highPriorityCount = todayTasks.filter(t => t.priority === 'high' && !t.completed).length;
  const totalTasks = todayTasks.length;

  const headerTitle = isMorning
    ? '🌅 Kế hoạch & Mục tiêu ngày mới'
    : '🌙 Tổng kết & Nhắc nhở buổi tối';

  const greeting = isMorning
    ? `Chào buổi sáng <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Dưới đây là danh sách nhiệm vụ đã lên lịch cho hôm nay:`
    : `Chào buổi tối <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Cùng điểm lại tiến độ hoàn thành các mục tiêu hôm nay nhé:`;

  let tasksHtml = '';
  if (totalTasks === 0) {
    tasksHtml = `
      <div class="empty-card" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 36px 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 40px; margin-bottom: 12px;">🏖️</div>
        <h3 class="empty-title" style="margin: 0 0 8px 0; color: #0f172a; font-size: 18px; font-weight: 700;">Hôm nay không có nhiệm vụ nào cả!</h3>
        <p class="empty-text" style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
          ${isMorning 
            ? 'Bạn không có task nào được lên lịch cho ngày hôm nay. Hãy tận hưởng ngày nghỉ hoặc click vào nút bên dưới để lên kế hoạch mới.' 
            : 'Toàn bộ ngày hôm nay bạn không có nhiệm vụ nào tồn đọng. Chúc bạn có một buổi tối thật thư giãn và nạp đầy năng lượng!'}
        </p>
      </div>
    `;
  } else {
    tasksHtml = `
      <!-- Thống kê nhanh: Sử dụng table 3 cột cách đều nhau tuyệt đối trên mọi email client -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0; table-layout: fixed;">
        <tr>
          <!-- Cột 1: TỔNG NHIỆM VỤ -->
          <td width="31%" align="center" style="vertical-align: top;">
            <div class="stat-card-total" style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 14px; padding: 14px 6px; text-align: center;">
              <div class="stat-label-total" style="font-size: 11px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">TỔNG NHIỆM VỤ</div>
              <div class="stat-num-total" style="font-size: 26px; font-weight: 900; color: #1e3a8a; margin-top: 4px;">${totalTasks}</div>
            </div>
          </td>
          <!-- Khoảng cách giữa cột 1 và 2 -->
          <td width="3.5%">&nbsp;</td>
          <!-- Cột 2: DONE -->
          <td width="31%" align="center" style="vertical-align: top;">
            <div class="stat-card-done" style="background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 14px; padding: 14px 6px; text-align: center;">
              <div class="stat-label-done" style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">DONE</div>
              <div class="stat-num-done" style="font-size: 26px; font-weight: 900; color: #065f46; margin-top: 4px;">${completedCount}</div>
            </div>
          </td>
          <!-- Khoảng cách giữa cột 2 và 3 -->
          <td width="3.5%">&nbsp;</td>
          <!-- Cột 3: ƯU TIÊN CAO -->
          <td width="31%" align="center" style="vertical-align: top;">
            <div class="stat-card-high" style="background-color: #fff1f2; border: 1.5px solid #fda4af; border-radius: 14px; padding: 14px 6px; text-align: center;">
              <div class="stat-label-high" style="font-size: 11px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 0.5px;">ƯU TIÊN CAO</div>
              <div class="stat-num-high" style="font-size: 26px; font-weight: 900; color: #9f1239; margin-top: 4px;">${highPriorityCount}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 16px;">
        ${todayTasks.map((t) => {
          const parent = t.parentId ? parentTasksMap[t.parentId] : null;
          const parentTag = parent ? (parent.tag || parent.title.slice(0, 5).toUpperCase()) : '';
          const parentColor = (parent && parent.color) ? parent.color : '#2563eb';
          const isDone = !!t.completed;
          const statusIcon = isDone ? '✅' : (t.priority === 'high' ? '🔥' : '📌');
          const borderStyle = isDone ? 'border-left: 4px solid #10b981;' : (t.priority === 'high' ? 'border-left: 4px solid #ef4444;' : 'border-left: 4px solid #3b82f6;');

          return `
            <div class="task-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; ${borderStyle} border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
              <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div style="flex: 1;">
                  <div class="${isDone ? 'task-title-done' : 'task-title'}" style="font-size: 15px; font-weight: 700; color: ${isDone ? '#94a3b8; text-decoration: line-through;' : '#0f172a;'}; line-height: 1.4;">
                    ${statusIcon} ${escapeHtml(t.title)}
                  </div>
                  <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${parentTag ? `
                      <span class="tag-badge" style="font-family: monospace; font-size: 10px; font-weight: 800; background-color: #f1f5f9; color: ${parentColor}; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; display: inline-block;">
                        [${escapeHtml(parentTag)}]
                      </span>
                    ` : ''}
                    ${t.priority === 'high' ? `
                      <span style="font-size: 10px; font-weight: 800; background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecdd3; border-radius: 6px; padding: 3px 8px; display: inline-block;">
                        🔥 Ưu tiên cao
                      </span>
                    ` : ''}
                    ${t.document && t.document.contentHtml ? `
                      <span style="font-size: 10px; font-weight: 800; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; border-radius: 6px; padding: 3px 8px; display: inline-block;">
                        📄 Có tài liệu DOCX
                      </span>
                    ` : ''}
                  </div>
                  ${t.note ? `
                    <div class="task-note-box" style="margin-top: 8px; font-size: 12px; color: #334155; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; line-height: 1.5;">
                      <strong class="task-note-label" style="color: #0f172a;">Ghi chú:</strong> ${escapeHtml(t.note)}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  const appUrl = window.location.href;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Xem trước: ${escapeHtml(headerTitle)}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0b0f19 !important; }
      .main-card { background-color: #111827 !important; border-color: #1f2937 !important; }
      .content-text { color: #f3f4f6 !important; }
      .header-date { color: #ffffff !important; }
      .stat-card-total { background-color: #172554 !important; border-color: #3b82f6 !important; }
      .stat-label-total { color: #93c5fd !important; }
      .stat-num-total { color: #bfdbfe !important; }
      .stat-card-done { background-color: #064e3b !important; border-color: #10b981 !important; }
      .stat-label-done { color: #6ee7b7 !important; }
      .stat-num-done { color: #a7f3d0 !important; }
      .stat-card-high { background-color: #4c0519 !important; border-color: #f43f5e !important; }
      .stat-label-high { color: #fda4af !important; }
      .stat-num-high { color: #fecdd3 !important; }
      .task-card { background-color: #1f2937 !important; border-color: #374151 !important; }
      .task-title { color: #f9fafb !important; }
      .task-title-done { color: #9ca3af !important; }
      .tag-badge { background-color: #111827 !important; border-color: #475569 !important; }
      .task-note-box { background-color: #111827 !important; border-color: #374151 !important; color: #d1d5db !important; }
      .task-note-label { color: #93c5fd !important; }
      .footer-bg { background-color: #0b0f19 !important; border-color: #1f2937 !important; }
      .footer-text { color: #9ca3af !important; }
      .empty-card { background-color: #1f2937 !important; border-color: #374151 !important; }
      .empty-title { color: #f9fafb !important; }
      .empty-text { color: #9ca3af !important; }
    }
    /* Gmail App Dark Mode selectors */
    [data-ogsc] .content-text { color: #f3f4f6 !important; }
    [data-ogsc] .header-date { color: #ffffff !important; }
    [data-ogsc] .stat-label-total { color: #93c5fd !important; }
    [data-ogsc] .stat-num-total { color: #bfdbfe !important; }
    [data-ogsc] .stat-label-done { color: #6ee7b7 !important; }
    [data-ogsc] .stat-num-done { color: #a7f3d0 !important; }
    [data-ogsc] .stat-label-high { color: #fda4af !important; }
    [data-ogsc] .stat-num-high { color: #fecdd3 !important; }
    [data-ogsc] .task-title { color: #f9fafb !important; }
    [data-ogsc] .task-title-done { color: #9ca3af !important; }
    [data-ogsc] .task-note-box { color: #d1d5db !important; }
    [data-ogsc] .task-note-label { color: #93c5fd !important; }
    [data-ogsc] .footer-text { color: #9ca3af !important; }
    [data-ogsb] .stat-card-total { background-color: #172554 !important; }
    [data-ogsb] .stat-card-done { background-color: #064e3b !important; }
    [data-ogsb] .stat-card-high { background-color: #4c0519 !important; }
    [data-ogsb] .task-card { background-color: #1f2937 !important; }
    [data-ogsb] .task-note-box { background-color: #111827 !important; }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background: #1e293b; color: #ffffff; padding: 10px 16px; font-size: 13px; text-align: center; font-weight: 600;">
    🔍 BẢN XEM TRƯỚC (PREVIEW) MẪU EMAIL TỰ ĐỘNG GỬI VÀO BUỔI SÁNG VÀ BUỔI TỐI
  </div>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;" class="email-bg">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 24px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <img src="logo/logo_idv_planner.png" width="48" height="48" alt="Logo" style="width: 48px; height: 48px; border-radius: 14px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.35); background-color: #ffffff;" />
              </div>
              <div style="display: inline-block; background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 6px 14px; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 800; color: #ffffff !important; letter-spacing: 1.2px; text-transform: uppercase;">STUDY & LIFE PLANNER</span>
              </div>
              <h1 style="margin: 0; color: #ffffff !important; font-size: 22px; font-weight: 800; line-height: 1.3;">${escapeHtml(headerTitle)}</h1>
              <p class="header-date" style="margin: 8px 0 0 0; color: #ffffff !important; opacity: 0.95; font-size: 14px; font-weight: 600;">
                <span style="color: #ffffff !important;">${escapeHtml(formattedDate)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <p class="content-text" style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; line-height: 1.6;">
                ${greeting}
              </p>
              ${tasksHtml}
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${appUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 12px; box-shadow: 0 3px 12px rgba(37,99,235,0.35);">
                  🚀 Mở ứng dụng Study & Life Planner
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="footer-bg" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p class="footer-text" style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                Email này được gửi tự động bởi hệ thống nhắc việc Study & Life Planner qua GitHub Actions.
              </p>
              <p class="footer-text" style="margin: 0; font-size: 11px; color: #94a3b8;">
                Thời gian: ${new Date().toLocaleTimeString('vi-VN')} • Múi giờ Việt Nam (ICT)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// --- 10. INITIALIZATION & EVENT LISTENERS ---
function renderApp() {
  updateAuthUI();
  updateHeaderDisplay();
  updateNotificationBell();

  // Chỉ render các views task nếu người dùng đã đăng nhập (tránh render lộ thông tin cho khách)
  if (state.isAdmin || state.currentUser) {
    if (state.currentView === 'day') renderDayView();
    else if (state.currentView === 'week') renderWeekView();
    else if (state.currentView === 'month') renderMonthView();
    else if (state.currentView === 'year') renderYearView();
  }
  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthStatus();
  loadTasks();
  loadParentTasks();

  // Nút chuyển Dark / Light Mode
  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);

  // Chuyển view (Desktop & Tablet)
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
  });

  // Chuyển view từ thanh Mobile Bottom Nav Dock (Dành cho iPhone & Mobile)
  document.querySelectorAll('.mobile-dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-mobile-view');
      if (view) switchView(view);
    });
  });

  // Nút Thêm nhanh Task ở giữa thanh Mobile Bottom Dock
  const btnMobileAdd = document.getElementById('btnMobileQuickAdd');
  if (btnMobileAdd) {
    btnMobileAdd.addEventListener('click', () => openAddTaskModal());
  }

  // Khởi tạo cử chỉ vuốt chạm iPhone & Mobile
  initMobileTouchGestures();

  // Điều hướng ngày
  document.getElementById('btnPrevDate').addEventListener('click', () => navigateDate(-1));
  document.getElementById('btnNextDate').addEventListener('click', () => navigateDate(1));
  document.getElementById('btnToday').addEventListener('click', goToToday);

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

  // Nút mở Quản lý nhiệm vụ tổng
  const btnTaskMgr = document.getElementById('btnOpenTaskManager');
  if (btnTaskMgr) {
    btnTaskMgr.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
      if (typeof openTaskManagerModal === 'function') {
        openTaskManagerModal();
      } else {
        console.log('Mở trung tâm Quản lý nhiệm vụ');
      }
    });
  }

  // Nút mở Cài đặt Email nhắc việc tự động
  const btnOpenReminder = document.getElementById('btnOpenReminderSettings');
  if (btnOpenReminder) {
    btnOpenReminder.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
      openReminderSettingsModal();
    });
  }

  const btnCloseReminder = document.getElementById('btnCloseReminderModal');
  if (btnCloseReminder) btnCloseReminder.addEventListener('click', closeReminderSettingsModal);
  const btnCancelReminder = document.getElementById('btnCancelReminderModal');
  if (btnCancelReminder) btnCancelReminder.addEventListener('click', closeReminderSettingsModal);

  const btnSaveReminder = document.getElementById('btnSaveReminderSettings');
  if (btnSaveReminder) btnSaveReminder.addEventListener('click', handleSaveReminderSettings);

  const btnPreviewReminder = document.getElementById('btnPreviewReminderEmail');
  if (btnPreviewReminder) {
    btnPreviewReminder.addEventListener('click', () => {
      const html = generateReminderEmailPreviewHtml('morning');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      showToast({
        type: 'info',
        title: 'Xem trước Email',
        message: 'Đã mở giao diện email trong tab mới để bạn kiểm tra mẫu.'
      });
    });
  }

  const chkMasterReminder = document.getElementById('chkReminderMaster');
  const chkMorningReminder = document.getElementById('chkReminderMorning');
  const chkEveningReminder = document.getElementById('chkReminderEvening');
  if (chkMasterReminder && chkMorningReminder && chkEveningReminder) {
    chkMasterReminder.addEventListener('change', () => {
      const enabled = chkMasterReminder.checked;
      chkMorningReminder.disabled = !enabled;
      chkEveningReminder.disabled = !enabled;
      if (chkMorningReminder.parentElement) chkMorningReminder.parentElement.classList.toggle('opacity-50', !enabled);
      if (chkEveningReminder.parentElement) chkEveningReminder.parentElement.classList.toggle('opacity-50', !enabled);
    });
  }

  // Đổi mật khẩu Local (Nếu có trong DOM)
  const btnChangePw = document.getElementById('btnOpenChangePwModal');
  if (btnChangePw) btnChangePw.addEventListener('click', openChangePwModal);
  const btnCloseChangePw = document.getElementById('btnCloseChangePwModal');
  if (btnCloseChangePw) btnCloseChangePw.addEventListener('click', closeChangePwModal);
  const btnCancelChangePw = document.getElementById('btnCancelChangePwModal');
  if (btnCancelChangePw) btnCancelChangePw.addEventListener('click', closeChangePwModal);

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

  // Modal thêm task (Hỗ trợ 2 tab: Defined và Others)
  const btnOpenAdd = document.getElementById('btnOpenAddModal');
  if (btnOpenAdd) btnOpenAdd.addEventListener('click', () => openAddTaskModal());
  const btnQuickAddDay = document.getElementById('btnQuickAddTaskDay');
  if (btnQuickAddDay) btnQuickAddDay.addEventListener('click', () => openAddTaskModal());
  const btnCloseModal = document.getElementById('btnCloseModal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeTaskModal);
  const btnCancelModal = document.getElementById('btnCancelModal');
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeTaskModal);

  // Tab switching trong Task Modal
  const tabBtnDef = document.getElementById('tabBtnAddDefined');
  if (tabBtnDef) tabBtnDef.addEventListener('click', () => switchAddTaskTypeTab('defined'));
  const tabBtnOth = document.getElementById('tabBtnAddOthers');
  if (tabBtnOth) tabBtnOth.addEventListener('click', () => switchAddTaskTypeTab('others'));

  // Form 1: Thêm Defined Task từ kho vào ngày
  if (formAddDefinedTask) {
    formAddDefinedTask.addEventListener('submit', handleAddDefinedTaskSubmit);
  }
  const btnCancelDef = document.getElementById('btnCancelDefinedModal');
  if (btnCancelDef) btnCancelDef.addEventListener('click', closeTaskModal);

  // Form 2: Thêm mới trực tiếp / Chỉnh sửa task
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const parentSel = document.getElementById('taskParentSelect');
    const tagInput = document.getElementById('taskFormTagInput');
    const titleVal = document.getElementById('taskTitle').value.trim();
    const tagVal = (tagInput ? tagInput.value.trim() : '') || generateParentTaskTag(titleVal) || 'TASK';
    await saveTaskFromForm({
      id: document.getElementById('taskId').value,
      title: titleVal,
      date: document.getElementById('taskDate').value,
      priority: document.getElementById('taskPriority').value,
      parentId: parentSel ? parentSel.value : '',
      note: document.getElementById('taskNote').value.trim(),
      tag: tagVal.toUpperCase().slice(0, 5)
    });
    closeTaskModal();
  });

  const taskParentSel = document.getElementById('taskParentSelect');
  if (taskParentSel) {
    taskParentSel.addEventListener('change', toggleTaskFormTagRow);
  }

  const taskTitleInput = document.getElementById('taskTitle');
  const taskFormTagInput = document.getElementById('taskFormTagInput');
  const btnRegenSubtaskParentTag = document.getElementById('btnRegenSubtaskParentTag');

  if (taskTitleInput && taskFormTagInput) {
    taskTitleInput.addEventListener('input', () => {
      const parentSel = document.getElementById('taskParentSelect');
      if (parentSel && !parentSel.value && (!isTaskFormTagManuallyEdited || !taskFormTagInput.value.trim())) {
        taskFormTagInput.value = generateParentTaskTag(taskTitleInput.value);
        updateTaskFormTagCount();
      }
    });

    taskFormTagInput.addEventListener('input', () => {
      taskFormTagInput.value = taskFormTagInput.value.toUpperCase().slice(0, 5);
      isTaskFormTagManuallyEdited = true;
      updateTaskFormTagCount();
    });
  }

  if (btnRegenSubtaskParentTag && taskFormTagInput && taskTitleInput) {
    btnRegenSubtaskParentTag.addEventListener('click', () => {
      taskFormTagInput.value = generateParentTaskTag(taskTitleInput.value);
      isTaskFormTagManuallyEdited = false;
      updateTaskFormTagCount();
      taskFormTagInput.focus();
    });
  }

  // --- TASK MANAGER MODAL LISTENERS ---
  const btnOpenAddParent = document.getElementById('btnOpenAddParentModal');
  if (btnOpenAddParent) btnOpenAddParent.addEventListener('click', openAddParentTaskModal);

  const btnCloseTaskMgr = document.getElementById('btnCloseTaskManagerModal');
  if (btnCloseTaskMgr) btnCloseTaskMgr.addEventListener('click', closeTaskManagerModal);

  const btnCloseTaskMgrBtm = document.getElementById('btnCloseTaskManagerModalBtm');
  if (btnCloseTaskMgrBtm) btnCloseTaskMgrBtm.addEventListener('click', closeTaskManagerModal);

  document.querySelectorAll('.tm-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTaskManagerFilter(btn.getAttribute('data-filter'));
    });
  });

  const searchInput = document.getElementById('searchTaskManagerInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.taskManagerSearch = e.target.value;
      renderTaskManagerContent();
    });
  }

  // --- PARENT TASK MODAL LISTENERS ---
  const btnCloseParent = document.getElementById('btnCloseParentTaskModal');
  if (btnCloseParent) btnCloseParent.addEventListener('click', closeParentTaskModal);
  const btnCancelParent = document.getElementById('btnCancelParentTaskModal');
  if (btnCancelParent) btnCancelParent.addEventListener('click', closeParentTaskModal);

  const parentTitleInput = document.getElementById('parentTaskTitleInput');
  const parentTagInput = document.getElementById('parentTaskTagInput');
  const btnRegenParentTag = document.getElementById('btnRegenParentTag');

  if (parentTitleInput && parentTagInput) {
    // Khi gõ tên Task tổng -> Tự động sinh mã Tag nếu chưa bị người dùng sửa tay
    parentTitleInput.addEventListener('input', () => {
      if (!isParentTagManuallyEdited || !parentTagInput.value.trim()) {
        parentTagInput.value = generateParentTaskTag(parentTitleInput.value);
        updateParentTagCharCount();
      }
    });

    // Khi người dùng tự tay sửa mã Tag
    parentTagInput.addEventListener('input', () => {
      parentTagInput.value = parentTagInput.value.toUpperCase().slice(0, 5);
      isParentTagManuallyEdited = true;
      updateParentTagCharCount();
    });
  }

  // Nút bấm Tự sinh lại (Gợi ý tự động)
  if (btnRegenParentTag && parentTagInput && parentTitleInput) {
    btnRegenParentTag.addEventListener('click', () => {
      parentTagInput.value = generateParentTaskTag(parentTitleInput.value);
      isParentTagManuallyEdited = false;
      updateParentTagCharCount();
      parentTagInput.focus();
    });
  }

  // --- RGB & HEX COLOR PICKER LISTENERS ---
  const customColorInput = document.getElementById('parentCustomColorPicker');
  const hexColorInput = document.getElementById('parentColorHexInput');

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      const hex = e.target.value;
      if (hexColorInput) hexColorInput.value = hex.replace('#', '').toUpperCase();
      selectParentColor(hex);
    });
  }

  if (hexColorInput) {
    hexColorInput.addEventListener('input', () => {
      let val = hexColorInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
      hexColorInput.value = val;
      if (val.length === 6 || val.length === 3) {
        let fullHex = '#' + (val.length === 3 ? val.split('').map(c => c + c).join('') : val);
        if (customColorInput) customColorInput.value = fullHex;
        const hiddenInput = document.getElementById('selectedParentColor');
        if (hiddenInput) hiddenInput.value = fullHex;
        updateParentTagPreview(fullHex);
        renderQuickColorPresets(fullHex);
      }
    });
  }

  if (formParentTask) {
    formParentTask.addEventListener('submit', handleSaveParentTask);
  }

  // --- QUICK SCHEDULE MODAL LISTENERS ---
  const btnCloseQuickSch = document.getElementById('btnCloseQuickScheduleModal');
  if (btnCloseQuickSch) btnCloseQuickSch.addEventListener('click', closeQuickScheduleModal);
  const btnCancelQuickSch = document.getElementById('btnCancelQuickSchedule');
  if (btnCancelQuickSch) btnCancelQuickSch.addEventListener('click', closeQuickScheduleModal);

  if (formQuickSchedule) {
    formQuickSchedule.addEventListener('submit', handleQuickScheduleSubmit);
  }

  // Replan Center Modal
  document.getElementById('btnCloseReplanModal').addEventListener('click', closeReplanModal);
  document.getElementById('btnReplanAllToToday').addEventListener('click', replanAllOverdueToToday);
  document.getElementById('btnReplanAllToNextWeek').addEventListener('click', replanAllOverdueToNextWeek);

  // Export / Import JSON
  const btnExport = document.getElementById('btnExport');
  if (btnExport) btnExport.addEventListener('click', exportData);
  const btnImportTrigger = document.getElementById('btnImportTrigger');
  if (btnImportTrigger) {
    btnImportTrigger.addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });
  }
  const btnDropdownExport = document.getElementById('btnDropdownExport');
  if (btnDropdownExport) {
    btnDropdownExport.addEventListener('click', () => {
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown) userDropdown.classList.add('hidden');
      exportData();
    });
  }
  const btnDropdownImport = document.getElementById('btnDropdownImport');
  if (btnDropdownImport) {
    btnDropdownImport.addEventListener('click', () => {
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown) userDropdown.classList.add('hidden');
      document.getElementById('importFileInput').click();
    });
  }
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importData(e.target.files[0]);
    }
  });

  // --- TASK DETAIL & DOCUMENT EVENT LISTENERS ---
  const btnDetailToggle = document.getElementById('btnDetailToggleComplete');
  if (btnDetailToggle) {
    btnDetailToggle.addEventListener('click', () => {
      if (state.activeDetailTaskId) {
        toggleTaskComplete(state.activeDetailTaskId);
      }
    });
  }

  const btnDetailEdit = document.getElementById('btnDetailEditTask');
  if (btnDetailEdit) {
    btnDetailEdit.addEventListener('click', () => {
      if (state.activeDetailTaskId) {
        const id = state.activeDetailTaskId;
        closeTaskDetailModal();
        openEditTaskModal(id);
      }
    });
  }

  const btnDetailDelete = document.getElementById('btnDetailDeleteTask');
  if (btnDetailDelete) {
    btnDetailDelete.addEventListener('click', () => {
      if (state.activeDetailTaskId) {
        deleteTask(state.activeDetailTaskId);
      }
    });
  }

  const btnCloseDetail = document.getElementById('btnCloseDetailModal');
  if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeTaskDetailModal);
  const btnCloseDetailBtm = document.getElementById('btnCloseDetailBottom');
  if (btnCloseDetailBtm) btnCloseDetailBtm.addEventListener('click', closeTaskDetailModal);

  const btnToggleFs = document.getElementById('btnToggleDetailFullscreen');
  if (btnToggleFs) btnToggleFs.addEventListener('click', toggleDetailFullscreen);
  const btnExitFs = document.getElementById('btnExitFullscreen');
  if (btnExitFs) btnExitFs.addEventListener('click', toggleDetailFullscreen);

  // Điều khiển khổ giấy (A4 Dọc / A4 Ngang) & Thước đo (Ruler)
  const btnPortrait = document.getElementById('btnPagePortrait');
  if (btnPortrait) btnPortrait.addEventListener('click', () => applyDocOrientation('portrait'));
  const btnLandscape = document.getElementById('btnPageLandscape');
  if (btnLandscape) btnLandscape.addEventListener('click', () => applyDocOrientation('landscape'));

  const btnToggleRuler = document.getElementById('btnToggleRuler');
  if (btnToggleRuler) {
    btnToggleRuler.addEventListener('click', () => {
      const ruler = document.getElementById('docRulerContainer');
      if (ruler) {
        ruler.classList.toggle('hidden');
        btnToggleRuler.classList.toggle('text-blue-600', !ruler.classList.contains('hidden'));
        btnToggleRuler.classList.toggle('text-slate-400', ruler.classList.contains('hidden'));
      }
    });
  }

  // Nút chèn ngắt trang
  const btnPageBreak = document.getElementById('btnInsertPageBreak');
  if (btnPageBreak) {
    btnPageBreak.addEventListener('mousedown', (e) => e.preventDefault());
    btnPageBreak.addEventListener('click', insertPageBreakIntoEditor);
  }

  // Tabs
  const tabDoc = document.getElementById('tabBtnDocument');
  if (tabDoc) tabDoc.addEventListener('click', () => switchDetailTab('document'));
  const tabLnk = document.getElementById('tabBtnLinks');
  if (tabLnk) tabLnk.addEventListener('click', () => switchDetailTab('links'));

  // File Bar (DOCX Import, Export, Drive Upload)
  const btnTrigDocx = document.getElementById('btnTriggerImportDocx');
  const docxFileInput = document.getElementById('docxFileInput');
  if (btnTrigDocx && docxFileInput) {
    btnTrigDocx.addEventListener('click', () => docxFileInput.click());
    docxFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleImportDocx(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  const btnExportDocx = document.getElementById('btnExportDocx');
  if (btnExportDocx) btnExportDocx.addEventListener('click', handleExportDocx);

  const btnSaveDrive = document.getElementById('btnSaveToGoogleDrive');
  if (btnSaveDrive) btnSaveDrive.addEventListener('click', handleSaveToGoogleDrive);

  // Quản lý selection để áp dụng màu sắc và chèn ảnh chính xác vị trí con trỏ
  let savedEditorSelection = null;
  function saveEditorSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedEditorSelection = sel.getRangeAt(0);
    }
  }
  function restoreEditorSelection() {
    if (savedEditorSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedEditorSelection);
    }
  }

  // WYSIWYG Editor Toolbar
  const formatSelect = document.getElementById('editorFormatBlock');
  if (formatSelect) {
    formatSelect.addEventListener('change', (e) => {
      const editor = document.getElementById('taskDocEditor');
      editor.focus();
      document.execCommand('formatBlock', false, e.target.value);
      triggerDocAutoSave();
    });
  }

  document.querySelectorAll('#tabContentDocument button[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      document.execCommand(cmd, false, null);
      triggerDocAutoSave();
    });
  });

  // --- XỬ LÝ ĐA DẠNG KIỂU DANH SÁCH (STAR, CHECKMARK, SQUARE, ARROW, A-B-C, I-II-III) ---
  function applyBulletStyle(styleType) {
    const editor = document.getElementById('taskDocEditor');
    editor.focus();

    const sel = window.getSelection();
    let listEl = null;
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      listEl = node.closest('ul');
    }

    if (!listEl) {
      document.execCommand('insertUnorderedList', false, null);
      const newSel = window.getSelection();
      if (newSel && newSel.anchorNode) {
        let node = newSel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;
        listEl = node.closest('ul');
      }
    }

    if (listEl) {
      listEl.removeAttribute('data-bullet');
      listEl.removeAttribute('type');

      if (styleType === 'star') {
        listEl.setAttribute('data-bullet', 'star');
        listEl.style.listStyleType = "'★  '";
      } else if (styleType === 'check') {
        listEl.setAttribute('data-bullet', 'check');
        listEl.style.listStyleType = "'✔  '";
      } else if (styleType === 'arrow') {
        listEl.setAttribute('data-bullet', 'arrow');
        listEl.style.listStyleType = "'➔  '";
      } else if (styleType === 'square') {
        listEl.setAttribute('type', 'square');
        listEl.setAttribute('data-bullet', 'square');
        listEl.style.listStyleType = 'square';
      } else if (styleType === 'circle') {
        listEl.setAttribute('type', 'circle');
        listEl.setAttribute('data-bullet', 'circle');
        listEl.style.listStyleType = 'circle';
      } else {
        listEl.setAttribute('type', 'disc');
        listEl.style.listStyleType = 'disc';
      }
      triggerDocAutoSave();
    }
  }

  function applyNumberStyle(numberType) {
    const editor = document.getElementById('taskDocEditor');
    editor.focus();

    const sel = window.getSelection();
    let listEl = null;
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;
      listEl = node.closest('ol');
    }

    if (!listEl) {
      document.execCommand('insertOrderedList', false, null);
      const newSel = window.getSelection();
      if (newSel && newSel.anchorNode) {
        let node = newSel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;
        listEl = node.closest('ol');
      }
    }

    if (listEl) {
      listEl.setAttribute('type', numberType);
      const styleMap = {
        '1': 'decimal',
        'a': 'lower-alpha',
        'A': 'upper-alpha',
        'i': 'lower-roman',
        'I': 'upper-roman'
      };
      listEl.style.listStyleType = styleMap[numberType] || 'decimal';
      triggerDocAutoSave();
    }
  }

  // Toggle dropdown Bullet Styles
  const btnToggleBullet = document.getElementById('btnToggleBulletMenu');
  const dropdownBullet = document.getElementById('dropdownBulletMenu');
  if (btnToggleBullet && dropdownBullet) {
    btnToggleBullet.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdownBullet.classList.contains('hidden');
      closeAllEditorListDropdowns();
      if (isHidden) dropdownBullet.classList.remove('hidden');
    });
  }

  // Toggle dropdown Number Styles
  const btnToggleNumber = document.getElementById('btnToggleNumberMenu');
  const dropdownNumber = document.getElementById('dropdownNumberMenu');
  if (btnToggleNumber && dropdownNumber) {
    btnToggleNumber.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdownNumber.classList.contains('hidden');
      closeAllEditorListDropdowns();
      if (isHidden) dropdownNumber.classList.remove('hidden');
    });
  }

  function closeAllEditorListDropdowns() {
    if (dropdownBullet) dropdownBullet.classList.add('hidden');
    if (dropdownNumber) dropdownNumber.classList.add('hidden');
  }

  document.addEventListener('click', () => {
    closeAllEditorListDropdowns();
  });

  // Xử lý click chọn kiểu Bullet (Disc, Star, Checkmark, Square, Arrow, Circle)
  document.querySelectorAll('#dropdownBulletMenu [data-bullet-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const bType = btn.getAttribute('data-bullet-type');
      applyBulletStyle(bType);
      closeAllEditorListDropdowns();
    });
  });

  // Xử lý click chọn kiểu Number (1, 2, 3 / a, b, c / A, B, C / i, ii, iii / I, II, III)
  document.querySelectorAll('#dropdownNumberMenu [data-number-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const nType = btn.getAttribute('data-number-type');
      applyNumberStyle(nType);
      closeAllEditorListDropdowns();
    });
  });

  // Chọn màu chữ (Text Color)
  const textColorPicker = document.getElementById('editorTextColorPicker');
  if (textColorPicker) {
    textColorPicker.addEventListener('click', saveEditorSelection);
    textColorPicker.addEventListener('input', (e) => {
      restoreEditorSelection();
      document.getElementById('taskDocEditor').focus();
      document.execCommand('foreColor', false, e.target.value);
      triggerDocAutoSave();
    });
  }

  // Tô sáng văn bản (Highlighter / Background Color)
  const bgColorPicker = document.getElementById('editorBgColorPicker');
  if (bgColorPicker) {
    bgColorPicker.addEventListener('click', saveEditorSelection);
    bgColorPicker.addEventListener('input', (e) => {
      restoreEditorSelection();
      document.getElementById('taskDocEditor').focus();
      const ok = document.execCommand('hiliteColor', false, e.target.value);
      if (!ok) document.execCommand('backColor', false, e.target.value);
      triggerDocAutoSave();
    });
  }

  // Nút chèn ảnh từ máy tính (chuẩn hóa kích thước tương thích Google Docs)
  const btnInsertImg = document.getElementById('btnInsertImageDoc');
  const imgFileInput = document.getElementById('editorImageInput');
  if (btnInsertImg && imgFileInput) {
    btnInsertImg.addEventListener('click', () => {
      saveEditorSelection();
      imgFileInput.click();
    });
    imgFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        try {
          restoreEditorSelection();
          const opt = await processAndOptimizeImageFile(e.target.files[0]);
          insertOptimizedImageIntoEditor(opt);
          showToast({
            type: 'success',
            title: 'Đã chèn hình ảnh',
            message: `Hình ảnh đã được co chuẩn khổ trang (${opt.width}px) khớp với Google Docs.`,
            duration: 3000
          });
        } catch (err) {
          console.error('Lỗi khi chèn ảnh:', err);
          showToast({
            type: 'error',
            title: 'Lỗi chèn ảnh',
            message: err.message
          });
        } finally {
          e.target.value = '';
        }
      }
    });
  }

  const btnTable = document.getElementById('btnInsertTable');
  if (btnTable) {
    btnTable.addEventListener('mousedown', (e) => e.preventDefault());
    btnTable.addEventListener('click', () => insertTableIntoEditor(3, 3));
  }

  const btnQuote = document.getElementById('btnInsertQuote');
  if (btnQuote) {
    btnQuote.addEventListener('mousedown', (e) => e.preventDefault());
    btnQuote.addEventListener('click', () => {
      document.getElementById('taskDocEditor').focus();
      document.execCommand('formatBlock', false, 'blockquote');
      triggerDocAutoSave();
    });
  }

  const btnLinkDoc = document.getElementById('btnInsertLinkDoc');
  if (btnLinkDoc) {
    btnLinkDoc.addEventListener('mousedown', (e) => e.preventDefault());
    btnLinkDoc.addEventListener('click', () => {
      const editor = document.getElementById('taskDocEditor');
      const url = prompt('Nhập địa chỉ URL của liên kết:', 'https://');
      if (url && url.trim()) {
        editor.focus();
        document.execCommand('createLink', false, url.trim());
        triggerDocAutoSave();
      }
    });
  }

  // Editor Input, Paste & Keydown Listener
  const docEditor = document.getElementById('taskDocEditor');
  if (docEditor) {
    docEditor.addEventListener('mouseup', saveEditorSelection);
    docEditor.addEventListener('keyup', saveEditorSelection);

    // Xử lý dán hình ảnh (Paste Image) thông minh & tự động tối ưu tỉ lệ chuẩn Google Docs
    docEditor.addEventListener('paste', async (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault(); // Chặn hành vi dán ảnh thô nguyên gốc làm tràn lề văn bản
          const file = item.getAsFile();
          if (file) {
            try {
              const opt = await processAndOptimizeImageFile(file);
              insertOptimizedImageIntoEditor(opt);
              showToast({
                type: 'success',
                title: 'Đã tối ưu hình ảnh',
                message: `Hình ảnh đã được co chuẩn theo khổ trang Google Docs (${opt.width}px).`,
                duration: 3000
              });
            } catch (err) {
              console.error('Lỗi khi tối ưu ảnh dán:', err);
            }
          }
          return;
        }
      }
    });

    // Phím tắt: Multi-level Indent với Tab / Shift+Tab và Ngắt trang với Ctrl+Enter / Cmd+Enter
    docEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          document.execCommand('outdent', false, null);
        } else {
          document.execCommand('indent', false, null);
        }
        triggerDocAutoSave();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        insertPageBreakIntoEditor();
      }
    });

    // Thoát chế độ toàn màn hình (Full Screen) khi nhấn phím Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDetailFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        toggleDetailFullscreen();
      }
    });

    docEditor.addEventListener('input', () => {
      updateDocCounts();
      triggerDocAutoSave();
    });
  }

  const docNameInput = document.getElementById('docFileNameInput');
  if (docNameInput) {
    docNameInput.addEventListener('input', () => {
      triggerDocAutoSave();
    });
  }

  // --- TẢI TỆP LÊN GOOGLE DRIVE (DROPZONE & FILE INPUT) ---
  const resourceDropzone = document.getElementById('resourceDriveDropzone');
  const resourceFileInput = document.getElementById('resourceDriveFileInput');

  if (resourceDropzone && resourceFileInput) {
    resourceDropzone.addEventListener('click', () => {
      resourceFileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      resourceDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        resourceDropzone.classList.add('border-blue-500', 'bg-blue-100/70', 'dark:bg-blue-900/40');
      });
    });

    ['dragleave', 'dragend'].forEach(eventName => {
      resourceDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        resourceDropzone.classList.remove('border-blue-500', 'bg-blue-100/70', 'dark:bg-blue-900/40');
      });
    });

    resourceDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resourceDropzone.classList.remove('border-blue-500', 'bg-blue-100/70', 'dark:bg-blue-900/40');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleUploadResourceFilesToDrive(e.dataTransfer.files);
      }
    });

    resourceFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleUploadResourceFilesToDrive(e.target.files);
        e.target.value = '';
      }
    });
  }

  // Thu gọn / Mở rộng Form Thêm Link ngoài
  const toggleHeader = document.getElementById('toggleAddLinkFormHeader');
  const btnToggleForm = document.getElementById('btnToggleAddLinkForm');
  const formAddLink = document.getElementById('formAddDetailLink');
  const toggleText = document.getElementById('toggleAddLinkFormText');
  const toggleIcon = document.getElementById('toggleAddLinkFormIcon');

  const toggleLinkForm = () => {
    if (!formAddLink) return;
    const isHidden = formAddLink.classList.toggle('hidden');
    if (toggleText) toggleText.textContent = isHidden ? 'Mở rộng' : 'Thu gọn';
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
    lucide.createIcons();
  };

  if (btnToggleForm) {
    btnToggleForm.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLinkForm();
    });
  }
  if (toggleHeader) {
    toggleHeader.addEventListener('click', toggleLinkForm);
  }

  // Form Add Link
  if (formAddLink) {
    formAddLink.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('linkTitleInput').value.trim();
      const url = document.getElementById('linkUrlInput').value.trim();
      const note = document.getElementById('linkNoteInput').value.trim();
      if (title && url) {
        addDetailLink(title, url, note);
        formAddLink.reset();
      }
    });
  }

  // --- GOOGLE AUTH & FIREBASE EVENT LISTENERS ---
  const btnGoogleSign = document.getElementById('btnGoogleSignIn');
  if (btnGoogleSign) {
    btnGoogleSign.addEventListener('click', async () => {
      if (window.StudyPlannerFirebase) {
        try {
          await window.StudyPlannerFirebase.signInWithGoogle();
        } catch (err) {
          console.warn('Đăng nhập Google:', err);
        }
      } else {
        alert('Module Firebase chưa sẵn sàng!');
      }
    });
  }

  const btnPortalGoogle = document.getElementById('btnPortalGoogleSignIn');
  if (btnPortalGoogle) {
    btnPortalGoogle.addEventListener('click', async () => {
      if (window.StudyPlannerFirebase) {
        try {
          await window.StudyPlannerFirebase.signInWithGoogle();
        } catch (err) {
          console.warn('Đăng nhập Google:', err);
        }
      } else {
        alert('Module Firebase chưa sẵn sàng!');
      }
    });
  }

  const btnPortalAdmin = document.getElementById('btnPortalAdminLogin');
  if (btnPortalAdmin) {
    btnPortalAdmin.addEventListener('click', openLoginModal);
  }

  const btnOpenFbModal = document.getElementById('btnOpenFirebaseModal');
  if (btnOpenFbModal) btnOpenFbModal.addEventListener('click', openFirebaseSetupModal);

  const btnOpenFbMenu = document.getElementById('btnOpenFirebaseSetupFromMenu');
  if (btnOpenFbMenu) {
    btnOpenFbMenu.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
      openFirebaseSetupModal();
    });
  }

  const btnCloseFb = document.getElementById('btnCloseFirebaseModal');
  if (btnCloseFb) btnCloseFb.addEventListener('click', closeFirebaseSetupModal);
  const btnCancelFb = document.getElementById('btnCancelFirebaseModal');
  if (btnCancelFb) btnCancelFb.addEventListener('click', closeFirebaseSetupModal);

  const btnLocalDemo = document.getElementById('btnUseLocalDemo');
  if (btnLocalDemo) {
    btnLocalDemo.addEventListener('click', () => {
      closeFirebaseSetupModal();
      alert('Đang chạy ở chế độ Offline Local Sandbox. Mọi dữ liệu được lưu trên trình duyệt của bạn.');
    });
  }

  const fbForm = document.getElementById('firebaseConfigForm');
  if (fbForm) fbForm.addEventListener('submit', handleSaveFirebaseConfig);

  const btnDriveFolder = document.getElementById('btnOpenDriveFolder');
  if (btnDriveFolder) {
    btnDriveFolder.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
      window.open('https://drive.google.com/drive/u/0/search?q=study_idv_planning', '_blank');
    });
  }

  // Tự động khởi tạo Firebase nếu đã có cấu hình trong localStorage
  if (window.StudyPlannerFirebase) {
    window.StudyPlannerFirebase.initFirebaseApp();
  }

  // Render khởi động
  renderApp();
  lucide.createIcons();
});
