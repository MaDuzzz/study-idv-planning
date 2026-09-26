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
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  if (!state.isAdmin) return;
  const dropZone = e.currentTarget.closest('.day-dropzone') || e.currentTarget;
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

  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.date !== targetDateStr) {
    if (task.date < getTodayStr() && targetDateStr >= getTodayStr()) {
      task.replanCount = (task.replanCount || 0) + 1;
    }
    task.date = targetDateStr;
    saveCurrentTasks();
    renderApp();
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

// --- 5. TASK CRUD (Chỉ Admin) ---
function toggleTaskComplete(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveSingleTask(task);
    if (state.activeDetailTaskId === taskId) {
      updateDetailModalCompletion(task.completed);
    }
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
    deleteSingleTask(taskId);
    if (state.activeDetailTaskId === taskId) {
      closeTaskDetailModal();
    }
    renderApp();
    renderReplanModalContent();
  }
}

async function saveTaskFromForm(formData) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const { id, title, date, priority, parentId: initialParentId, note, tag } = formData;
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
}

// --- 6. RENDER VIEWS & UI UPDATE ---

function updateAuthUI() {
  const adminGroup = document.getElementById('adminActionGroup');
  const guestGroup = document.getElementById('guestActionGroup');
  const btnQuickAdd = document.getElementById('btnQuickAddTaskDay');
  const emptyHint = document.getElementById('emptyStateAdminHint');
  const dragDropTip = document.getElementById('dragDropTip');

  const userAvatarImg = document.getElementById('userAvatarImg');
  const userFallbackIcon = document.getElementById('userFallbackIcon');
  const userNameLabel = document.getElementById('userNameLabel');
  const userDropdownName = document.getElementById('userDropdownName');
  const userDropdownEmail = document.getElementById('userDropdownEmail');
  const userCloudTag = document.getElementById('userCloudTag');

  if (state.isAdmin) {
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
      high: '<span class="px-2 py-0.5 text-xs font-bold rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700">🔥 Ưu tiên cao</span>',
      medium: '<span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">Bình thường</span>',
      low: '<span class="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">Thấp</span>'
    }[task.priority] || '';

    const replanBadge = (task.replanCount && task.replanCount > 0)
      ? `<span class="inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-help shrink-0" title="Nhiệm vụ này đã được dời lịch ${task.replanCount} lần. Cố gắng hoàn thành sớm nhé!">
          <i data-lucide="alert-triangle" class="w-4 h-4"></i>
        </span>`
      : '';

    const checkboxHtml = state.isAdmin
      ? `<button onclick="toggleTaskComplete('${task.id}')" title="Bấm để đánh dấu hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition ${task.completed ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 bg-white dark:bg-slate-700'}">
          ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
        </button>`
      : `<button onclick="openLoginModal()" title="Chỉ đọc - Đăng nhập Admin để tích hoàn thành" class="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border ${task.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-750 hover:border-blue-400'} cursor-pointer">
          ${task.completed ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
        </button>`;

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
          <button onclick="openEditTaskModal('${task.id}')" title="Chỉnh sửa" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" title="Xóa" class="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
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
    const tasks = state.tasks.filter(t => t.date === dateStr);
    const completedCount = tasks.filter(t => t.completed).length;

    const addBtnHtml = state.isAdmin
      ? `<div class="p-3 border-t border-slate-200 dark:border-slate-700/80 mt-auto bg-slate-100/70 dark:bg-slate-800/50 rounded-b-2xl">
          <button onclick="openAddTaskModalForDate('${dateStr}')" class="w-full py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/60 border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs">
            <i data-lucide="plus" class="w-4 h-4"></i> Thêm nhiệm vụ
          </button>
        </div>`
      : '';

    return `
      <!-- Cột ngày Elastic: min-height 540px trên màn hình lớn 2K/27" và tự do co giãn -->
      <div 
        class="day-dropzone bg-slate-50/40 dark:bg-slate-900/90 rounded-2xl border transition-all duration-200 flex flex-col min-h-[520px] 2xl:min-h-[600px] ${isToday ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-md' : 'border-slate-200 dark:border-slate-750 shadow-xs'}"
        ondragover="handleDragOver(event)"
        ondragenter="handleDragEnter(event)"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event, '${dateStr}')"
      >
        
        <!-- Day Column Header -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between ${isToday ? 'bg-blue-100/80 dark:bg-blue-950/70' : 'bg-slate-100 dark:bg-slate-800'} rounded-t-2xl pointer-events-none">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider ${idx >= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}">${dayNames[idx]}</span>
            <div class="text-xl 2xl:text-2xl font-black text-slate-900 dark:text-white leading-tight">${dayDate.getDate()}/${dayDate.getMonth() + 1}</div>
          </div>
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full ${isToday ? 'bg-blue-600 text-white font-black' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-bold'} shadow-2xs">
            ${completedCount}/${tasks.length}
          </span>
        </div>

        <!-- Task List inside day -->
        <div class="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[500px] 2xl:max-h-[650px]">
          ${tasks.length === 0 ? `
            <div class="text-xs text-slate-400 dark:text-slate-500 text-center py-16 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <i data-lucide="clipboard-check" class="w-8 h-8 text-slate-300 dark:text-slate-700"></i>
              <span>Không có task</span>
            </div>` : ''}
          
          ${tasks.map(t => {
            const taskIsOverdue = isOverdue(t);

            return `
              <div 
                draggable="${state.isAdmin ? 'true' : 'false'}"
                ondragstart="handleDragStart(event, '${t.id}')"
                ondragend="handleDragEnd(event)"
                onclick="openTaskDetailModal('${t.id}')" 
                class="task-card p-3 rounded-xl border transition-all duration-150 select-none ${state.isAdmin ? 'cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md' : 'cursor-pointer hover:border-slate-300'} ${taskIsOverdue ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-600/80' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:dark:border-slate-600'} ${t.completed ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60' : ''}"
                title="${state.isAdmin ? 'Bấm để xem chi tiết & tài liệu, hoặc kéo thả để đổi ngày' : 'Bấm để xem chi tiết'}"
              >
                <div class="flex items-start gap-2.5">
                  <!-- Checkbox -->
                  ${state.isAdmin ? `
                    <button onclick="event.stopPropagation(); toggleTaskComplete('${t.id}')" title="Tích hoàn thành" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${t.completed ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 bg-white dark:bg-slate-700'}">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>
                  ` : `
                    <button onclick="event.stopPropagation(); openLoginModal()" title="Chỉ đọc - Đăng nhập để hoàn thành task" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${t.completed ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-750 hover:border-blue-400'} cursor-pointer">
                      ${t.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                    </button>
                  `}
                  
                  <!-- Nội dung task -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs sm:text-sm font-semibold leading-snug break-words ${t.completed ? 'line-through text-slate-500 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100 font-bold'}">
                        ${escapeHtml(t.title)}
                      </span>
                      ${t.replanCount > 0 ? `<span class="inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-help shrink-0" title="Nhiệm vụ này đã được dời lịch ${t.replanCount} lần. Cố gắng hoàn thành sớm nhé!"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i></span>` : ''}
                    </div>
                    
                    <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                      ${getParentBadgeHtml(t)}
                      ${t.document && t.document.contentHtml ? `<span class="text-[10px] px-1.5 py-0.5 font-semibold rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/80 inline-flex items-center gap-0.5 shrink-0" title="Có tài liệu soạn thảo (.docx)"><i data-lucide="file-text" class="w-3 h-3"></i> DOCX</span>` : ''}
                      ${t.links && t.links.length > 0 ? `<span class="text-[10px] px-1.5 py-0.5 font-semibold rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/80 inline-flex items-center gap-0.5 shrink-0" title="${t.links.length} tài nguyên đính kèm"><i data-lucide="link" class="w-3 h-3"></i> ${t.links.length}</span>` : ''}
                      ${taskIsOverdue ? `<span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 shrink-0"><i data-lucide="clock-alert" class="w-3 h-3"></i> Trễ hạn</span>` : ''}
                    </div>
                  </div>

                  <!-- Grip Handle Icon -->
                  ${state.isAdmin ? `
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
      const tasks = state.tasks.filter(t => t.date === dateStr);
      const overdueTasks = tasks.filter(t => isOverdue(t));
      const completedCount = tasks.filter(t => t.completed).length;
      const isAllDone = tasks.length > 0 && completedCount === tasks.length;

      html += `
        <div 
          class="day-dropzone min-h-[115px] 2xl:min-h-[140px] p-2.5 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
            isToday 
              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm' 
              : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-xs'
          }"
          onclick="openDayFromGrid('${dateStr}')"
          ondragover="handleDragOver(event)"
          ondragenter="handleDragEnter(event)"
          ondragleave="handleDragLeave(event)"
          ondrop="handleDrop(event, '${dateStr}')"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-extrabold ${
              isToday 
                ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-xs' 
                : 'text-slate-800 dark:text-slate-100'
            }">${dayNum}</span>
            ${overdueTasks.length > 0 ? `<span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" title="Có task trễ hạn"></span>` : ''}
          </div>
          
          <div class="space-y-1.5 my-1.5 overflow-hidden">
            ${tasks.slice(0, 3).map(t => {
              let pillClasses = '';
              let prefixIcon = '';

              const parent = t.parentId ? getParentTask(t.parentId) : null;
              const palette = parent ? getParentColorConfig(parent.color) : null;
              const parentTag = parent ? getParentTag(parent) : '';

              if (t.completed) {
                pillClasses = 'bg-slate-100 dark:bg-slate-700/90 text-slate-600 dark:text-slate-200 line-through border border-slate-200 dark:border-slate-600 font-medium';
                prefixIcon = '<i data-lucide="check" class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mr-1 inline-block"></i>';
              } else if (isOverdue(t)) {
                pillClasses = 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-100 font-bold border border-amber-300 dark:border-amber-600/90 shadow-2xs';
                prefixIcon = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mr-1 inline-block"></span>';
              } else if (palette) {
                pillClasses = `${palette.badge} font-bold shadow-2xs`;
                prefixIcon = `<span class="w-1.5 h-1.5 rounded-full ${palette.dot} shrink-0 mr-1 inline-block"></span>`;
              } else if (t.priority === 'high') {
                pillClasses = 'bg-rose-100 dark:bg-rose-950 text-rose-950 dark:text-rose-100 font-bold border border-rose-300 dark:border-rose-600/90 shadow-2xs';
                prefixIcon = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mr-1 inline-block"></span>';
              } else {
                pillClasses = 'bg-blue-100 dark:bg-blue-950 text-blue-950 dark:text-blue-100 font-bold border border-blue-300 dark:border-blue-600/90 shadow-2xs';
                prefixIcon = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mr-1 inline-block"></span>';
              }

              const docIndicator = (t.document && t.document.contentHtml) ? '<i data-lucide="file-text" class="w-3 h-3 ml-1 shrink-0 text-emerald-600 dark:text-emerald-400"></i>' : '';
              const linkIndicator = (t.links && t.links.length > 0) ? '<i data-lucide="link" class="w-3 h-3 ml-0.5 shrink-0 text-purple-600 dark:text-purple-400"></i>' : '';

              return `
                <div 
                  draggable="${state.isAdmin ? 'true' : 'false'}"
                  ondragstart="handleDragStart(event, '${t.id}')"
                  ondragend="handleDragEnd(event)"
                  onclick="event.stopPropagation(); openTaskDetailModal('${t.id}')"
                  class="text-[11px] px-2 py-0.5 rounded-md truncate transition-colors flex items-center cursor-pointer hover:opacity-85 ${pillClasses}"
                  title="${escapeHtml(t.title)}${parent ? ` [${escapeHtml(parent.title)}]` : ''} (Bấm để xem chi tiết & tài liệu)"
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

// --- 7. SWITCH & NAVIGATE ---
function switchView(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.view-btn').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.className = 'view-btn px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-xs';
    } else {
      btn.className = 'view-btn px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent';
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

  const targetDate = initialDate || formatDate(state.currentDate);

  // Hiển thị thanh tabs
  const tabsContainer = document.getElementById('addTaskTypeTabs');
  if (tabsContainer) tabsContainer.classList.remove('hidden');

  // Chuẩn bị Form 1: Defined Tasks (chưa có ngày)
  const unscheduledTasks = state.tasks.filter(t => !t.date || !t.date.trim());
  const selectDefined = document.getElementById('selectDefinedTaskId');
  const emptyHint = document.getElementById('emptyDefinedHint');
  const dateInputDefined = document.getElementById('definedTaskDate');
  const btnSubmitDefined = document.getElementById('btnSubmitDefined');

  if (dateInputDefined) dateInputDefined.value = targetDate;

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
  document.getElementById('taskDate').value = targetDate;
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

function openEditTaskModal(taskId) {
  if (!state.isAdmin) {
    openLoginModal();
    return;
  }
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!taskManagerModal.classList.contains('hidden')) {
    pushModalStack('taskManagerDialog');
  }

  // Ẩn tabs chọn defined (vì đang edit trực tiếp task này)
  const tabsContainer = document.getElementById('addTaskTypeTabs');
  if (tabsContainer) tabsContainer.classList.add('hidden');
  
  document.getElementById('formAddDefinedTask').classList.add('hidden');
  taskForm.classList.remove('hidden');

  document.getElementById('taskId').value = task.id;
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDate').value = task.date || '';
  document.getElementById('taskPriority').value = task.priority || 'medium';
  document.getElementById('taskNote').value = task.note || '';
  document.getElementById('modalTitle').textContent = 'Chỉnh sửa nhiệm vụ';

  const parentSelect = document.getElementById('taskParentSelect');
  if (parentSelect) {
    populateParentSelectOptions(parentSelect, task.parentId || '');
    parentSelect.value = task.parentId || '';
  }

  const formTagInput = document.getElementById('taskFormTagInput');
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
                <p>Chưa có nhiệm vụ con nào thuộc mục tiêu này.</p>
                <button onclick="openAddTaskModalForParent('${parent.id}')" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  + Thêm nhiệm vụ con ngay
                </button>
              ` : `
                <p>Không có nhiệm vụ con nào thỏa mãn bộ lọc hiện tại.</p>
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
  const isTaskOverdue = isOverdue(task);
  const priorityBadge = {
    high: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700 shrink-0">🔥 Cao</span>',
    medium: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">Bình thường</span>',
    low: '<span class="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">Thấp</span>'
  }[task.priority] || '';

  const scheduleBadge = task.date && task.date.trim() !== ''
    ? `<span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
        <i data-lucide="calendar" class="w-3.5 h-3.5 text-blue-500"></i> ${task.date}
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

  return `
    <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${task.completed ? 'bg-slate-50/40 dark:bg-slate-850/40' : ''}">
      <div class="flex items-start gap-3 flex-1 min-w-0">
        <button onclick="toggleTaskComplete('${task.id}')" title="Đánh dấu hoàn thành" class="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${task.completed ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-500'}">
          ${task.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
        </button>

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
          </div>
          ${task.note ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">${escapeHtml(task.note)}</p>` : ''}
        </div>
      </div>

      <div class="flex items-center gap-2.5 self-end sm:self-center shrink-0">
        ${scheduleBadge}
        <button onclick="openEditTaskModal('${task.id}')" title="Chỉnh sửa nhiệm vụ" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>
        <button onclick="deleteTask('${task.id}')" title="Xóa nhiệm vụ" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
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

  document.getElementById('quickScheduleTaskId').value = task.id;
  document.getElementById('quickScheduleTaskTitle').textContent = task.title;
  document.getElementById('quickScheduleDateInput').value = formatDate(state.currentDate);
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

  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.date = date;
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
  if (isCompleted) {
    checkIcon.classList.remove('hidden');
    btnToggle.className = 'mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 bg-blue-600 border-blue-600 text-white shadow-2xs';
  } else {
    checkIcon.classList.add('hidden');
    btnToggle.className = 'mt-1 w-6 h-6 rounded-lg flex items-center justify-center border transition shrink-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-500 shadow-2xs';
  }
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
    driveSyncStatus.classList.remove('hidden');
    driveSyncStatus.classList.add('flex');
    btnOpenDocs.href = task.document.driveWebViewLink;
    btnOpenDocs.classList.remove('hidden');
    btnOpenDocs.classList.add('flex');
  } else {
    driveSyncStatus.classList.add('hidden');
    driveSyncStatus.classList.remove('flex');
    btnOpenDocs.classList.add('hidden');
    btnOpenDocs.classList.remove('flex');
  }

  updateDocCounts();

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

function toggleDetailFullscreen() {
  const modalDialog = document.getElementById('taskDetailDialog');
  const modalBackdrop = document.getElementById('taskDetailModal');
  const iconFs = document.getElementById('iconFullscreen');
  isDetailFullscreen = !isDetailFullscreen;

  if (isDetailFullscreen) {
    modalBackdrop.className = 'fixed inset-0 bg-slate-950 z-[75] modal-layer-detail flex p-0';
    modalDialog.className = 'bg-white dark:bg-slate-900 w-full h-full rounded-none flex flex-col transition-all duration-150 overflow-hidden';
    if (iconFs) iconFs.setAttribute('data-lucide', 'minimize-2');
  } else {
    modalBackdrop.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[75] modal-layer-detail flex items-center justify-center p-1 sm:p-2.5 2xl:p-4';
    modalDialog.className = 'bg-white dark:bg-slate-900 rounded-2xl w-full h-[96vh] 2xl:h-[97vh] max-w-[98vw] 2xl:max-w-[1950px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-200 overflow-hidden modal-dialog-animated';
    if (iconFs) iconFs.setAttribute('data-lucide', 'maximize-2');
  }
  lucide.createIcons();
}

function closeTaskDetailModal() {
  if (state.activeDetailTaskId) {
    flushSaveTaskDoc(state.activeDetailTaskId);
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

  const charEl = document.getElementById('editorCharCount');
  const wordEl = document.getElementById('editorWordCount');
  if (charEl) charEl.textContent = `${charCount} ký tự`;
  if (wordEl) wordEl.textContent = `${wordCount} từ`;
}

function flushSaveTaskDoc(taskId) {
  if (!taskId) return;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const editor = document.getElementById('taskDocEditor');
  const fileNameInput = document.getElementById('docFileNameInput');
  if (!editor || !fileNameInput) return;

  if (!task.document) task.document = {};
  task.document.contentHtml = editor.innerHTML;
  let fname = fileNameInput.value.trim();
  if (fname && !fname.endsWith('.docx')) fname += '.docx';
  task.document.fileName = fname || 'Tai_lieu.docx';
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
  const statusEl = document.getElementById('editorSaveStatus');
  if (statusEl) {
    statusEl.innerHTML = '<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Đang lưu...';
    statusEl.className = 'flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium';
    lucide.createIcons();
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

function buildTaskDocxHtml(task, editorHtml) {
  const parent = task.parentId ? getParentTask(task.parentId) : null;
  const parentTitle = parent ? parent.title : (task.category || 'Không');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(task.title)}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; padding: 10pt; }
    h1 { font-size: 20pt; color: #1e40af; margin-top: 18pt; margin-bottom: 6pt; }
    h2 { font-size: 16pt; color: #1e3a8a; margin-top: 14pt; margin-bottom: 5pt; }
    h3 { font-size: 13pt; color: #2563eb; margin-top: 10pt; margin-bottom: 4pt; }
    p { margin-bottom: 8pt; line-height: 1.6; }
    ul, ol { margin-left: 24pt; margin-bottom: 8pt; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    th, td { border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: left; }
    th { background-color: #f1f5f9; font-weight: bold; }
    blockquote { border-left: 3pt solid #3b82f6; padding-left: 10pt; margin: 10pt 0; color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  <h1 style="color: #1e40af; border-bottom: 2pt solid #2563eb; padding-bottom: 4pt;">${escapeHtml(task.title)}</h1>
  <p style="color: #64748b; font-size: 9pt;">
    <strong>Kế hoạch:</strong> ${task.date || 'Chưa lên lịch'} &nbsp;|&nbsp; 
    <strong>Parent Task:</strong> ${escapeHtml(parentTitle)} &nbsp;|&nbsp; 
    <strong>Mức độ:</strong> ${task.priority === 'high' ? '🔥 Ưu tiên cao' : (task.priority === 'low' ? 'Thấp' : 'Bình thường')}
  </p>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 14pt;" />
  ${editorHtml || '<p></p>'}
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

// Lưu tài liệu vào Google Drive
async function handleSaveToGoogleDrive() {
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task) return;

  if (!state.currentUser || !window.StudyPlannerFirebase) {
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

  // Nếu token Google Drive đã hết hạn, tự động nhắc gia hạn
  if (window.StudyPlannerFirebase.isGoogleAccessTokenExpired && window.StudyPlannerFirebase.isGoogleAccessTokenExpired()) {
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
  const originalHtml = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin inline mr-1"></i> Đang tải lên...';
  lucide.createIcons();

  try {
    const editor = document.getElementById('taskDocEditor');
    const fileNameInput = document.getElementById('docFileNameInput');
    let fileName = fileNameInput.value.trim() || 'Tai_lieu.docx';
    if (!fileName.endsWith('.docx')) fileName += '.docx';

    const editorHtml = editor.innerHTML || '<p></p>';
    const fullHtml = buildTaskDocxHtml(task, editorHtml);

    // Cấu trúc phân cấp 4 tầng: study_idv_planning / [Năm] / [Task tổng] / [Task con]
    // 1. Phân cấp Năm
    const yearStr = (task.date && task.date.trim()) 
      ? task.date.split('-')[0] 
      : new Date().getFullYear().toString();

    // 2. Phân cấp Task tổng
    let parentTitle = 'Nhiệm vụ độc lập';
    if (task.parentId) {
      const parent = getParentTask(task.parentId);
      if (parent && parent.title) {
        parentTitle = parent.title.trim();
      }
    } else if (task.category) {
      parentTitle = task.category.trim();
    }

    // 3. Phân cấp Task con
    const subtaskTitle = (task.title || 'Nhiệm vụ').trim();

    const folderPath = ['study_idv_planning', yearStr, parentTitle, subtaskTitle];

    // Gửi trực tiếp fullHtml chuẩn hóa để Google Drive tự động chuyển đổi thành tài liệu Google Docs
    const driveResult = await window.StudyPlannerFirebase.uploadFileToGoogleDrive({
      fileName: fileName,
      content: fullHtml,
      mimeType: 'text/html',
      existingFileId: task.document?.driveFileId || null,
      folderPath: folderPath
    });

    if (!task.document) task.document = {};
    task.document.driveFileId = driveResult.fileId;
    task.document.driveWebViewLink = driveResult.googleDocsUrl || driveResult.webViewLink;
    task.document.driveFolderId = driveResult.folderId || null;
    task.document.fileName = fileName;
    task.document.contentHtml = editorHtml;
    task.document.lastSaved = new Date().toISOString();

    await saveSingleTask(task);

    const driveSyncStatus = document.getElementById('driveSyncStatus');
    const btnOpenDocs = document.getElementById('btnOpenInGoogleDocsLink');
    driveSyncStatus.classList.remove('hidden');
    driveSyncStatus.classList.add('flex');
    btnOpenDocs.href = driveResult.googleDocsUrl || driveResult.webViewLink;
    btnOpenDocs.classList.remove('hidden');
    btnOpenDocs.classList.add('flex');

    const displayPath = `study_idv_planning / ${yearStr} / ${parentTitle} / ${subtaskTitle}`;
    showToast({
      type: 'success',
      title: 'Đã lưu vào Google Drive!',
      message: `Tài liệu <strong>"${escapeHtml(fileName)}"</strong> đã được đồng bộ.<br><span class="font-mono text-[11px] opacity-85 text-slate-500 dark:text-slate-400">📂 ${escapeHtml(displayPath)}</span>`,
      actionText: 'Mở Google Docs ↗',
      actionUrl: driveResult.googleDocsUrl || driveResult.webViewLink,
      duration: 5000
    });
  } catch (err) {
    console.error('Lỗi khi lưu lên Google Drive:', err);
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
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = originalHtml;
    lucide.createIcons();
  }
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

// --- QUẢN LÝ LIÊN KẾT & TÀI NGUYÊN (RELATED LINKS) ---

function renderTaskDetailLinks(task) {
  const container = document.getElementById('detailLinksList');
  const countEl = document.getElementById('detailLinkCount');
  const links = task.links || [];

  countEl.textContent = links.length;

  if (links.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 dark:text-slate-500">
        <i data-lucide="link" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="text-xs sm:text-sm">Chưa có liên kết hay tài liệu ngoài nào được đính kèm vào nhiệm vụ này.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = links.map(link => {
    let hostname = '';
    try {
      hostname = new URL(link.url).hostname;
    } catch (e) {
      hostname = link.url;
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

    return `
      <div class="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-3 shadow-2xs hover:border-blue-400 dark:hover:border-blue-400 transition">
        <div class="flex items-start gap-3 min-w-0 flex-1">
          <img src="${faviconUrl}" alt="" class="w-5 h-5 rounded-sm mt-0.5 shrink-0" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          <div class="min-w-0 flex-1">
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline break-words flex items-center gap-1">
              <span>${escapeHtml(link.title)}</span>
              <i data-lucide="external-link" class="w-3.5 h-3.5 shrink-0 inline"></i>
            </a>
            <div class="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">${escapeHtml(link.url)}</div>
            ${link.note ? `<p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${escapeHtml(link.note)}</p>` : ''}
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button onclick="navigator.clipboard.writeText('${escapeHtml(link.url)}'); alert('Đã sao chép link!');" title="Sao chép link" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          ${state.isAdmin ? `
            <button onclick="deleteDetailLink('${link.id}')" title="Xóa liên kết" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
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

function deleteDetailLink(linkId) {
  if (!state.activeDetailTaskId) return;
  const task = state.tasks.find(t => t.id === state.activeDetailTaskId);
  if (!task || !task.links) return;

  task.links = task.links.filter(l => l.id !== linkId);
  saveSingleTask(task);
  renderTaskDetailLinks(task);
  renderApp();
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

// --- 10. INITIALIZATION & EVENT LISTENERS ---
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
  initTheme();
  checkAuthStatus();
  loadTasks();
  loadParentTasks();

  // Nút chuyển Dark / Light Mode
  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);

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
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnImportTrigger').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
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

  const btnCloseDetail = document.getElementById('btnCloseDetailModal');
  if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeTaskDetailModal);
  const btnCloseDetailBtm = document.getElementById('btnCloseDetailBottom');
  if (btnCloseDetailBtm) btnCloseDetailBtm.addEventListener('click', closeTaskDetailModal);

  const btnToggleFs = document.getElementById('btnToggleDetailFullscreen');
  if (btnToggleFs) btnToggleFs.addEventListener('click', toggleDetailFullscreen);

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

  // Editor Input Listener
  const docEditor = document.getElementById('taskDocEditor');
  if (docEditor) {
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

  // Form Add Link
  const formAddLink = document.getElementById('formAddDetailLink');
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
