/**
 * Study & Life Planner - Firebase & Google Drive Integration Module
 * Hỗ trợ: Multi-tenant Firestore, Google Authentication (Scope: drive.file), và Google Drive API
 */

// Cấu hình Firebase mặc định (Lưu trong localStorage của trình duyệt)
const DEFAULT_FIREBASE_CONFIG_KEY = 'study_planner_firebase_config_v1';

// Cấu hình Firebase nhúng sẵn của hệ thống (Admin cấu hình 1 lần ở đây để TẤT CẢ người dùng truy cập web đều tự động dùng chung)
const BUILTIN_FIREBASE_CONFIG = {
  // Điền cấu hình Firebase của project ở đây (nếu muốn nhúng vĩnh viễn vào web)
  apiKey: "AIzaSyDny5JhUubqG4Y27cn5Jt05o4_N4emb_tU",
  authDomain: "study-idv-planning.firebaseapp.com",
  projectId: "study-idv-planning",
  storageBucket: "study-idv-planning.firebasestorage.app",
  messagingSenderId: "232038577340",
  appId: "1:232038577340:web:b7e2b4389339b9b62e0cb9",
  measurementId: "G-ZXP3MVFH3Y"
};

// Lấy cấu hình Firebase đã lưu hoặc trả về null nếu chưa cấu hình
function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(DEFAULT_FIREBASE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
    if (BUILTIN_FIREBASE_CONFIG && BUILTIN_FIREBASE_CONFIG.apiKey && BUILTIN_FIREBASE_CONFIG.projectId) {
      return BUILTIN_FIREBASE_CONFIG;
    }
    return null;
  } catch (e) {
    console.error('Lỗi khi đọc cấu hình Firebase:', e);
    return null;
  }
}

// Lưu cấu hình Firebase vào localStorage
function saveFirebaseConfig(configObj) {
  localStorage.setItem(DEFAULT_FIREBASE_CONFIG_KEY, JSON.stringify(configObj));
}

// Biến quản lý trạng thái Firebase
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let googleAccessToken = null; // Dùng để gọi Google Drive API
let currentUser = null; // Thông tin user đang đăng nhập { uid, email, displayName, photoURL }

/**
 * Khởi tạo Firebase SDK
 */
function initFirebaseApp() {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    console.log('Firebase chưa được cấu hình. Hệ thống sẽ hoạt động ở chế độ Local / Sandbox.');
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();

    // Lắng nghe trạng thái đăng nhập
    firebaseAuth.onAuthStateChanged((user) => {
      currentUser = user;
      if (typeof window.handleAuthStateChange === 'function') {
        window.handleAuthStateChange(user);
      }
    });

    console.log('Firebase đã khởi tạo thành công với Project:', config.projectId);
    return true;
  } catch (err) {
    console.error('Không thể khởi tạo Firebase:', err);
    return false;
  }
}

/**
 * Đăng nhập bằng Google kèm quyền Google Drive (drive.file)
 */
async function signInWithGoogle() {
  if (!firebaseAuth) {
    alert('Vui lòng nhập cấu hình Firebase của bạn trong mục Cài đặt trước khi đăng nhập Google!');
    if (typeof window.openFirebaseSetupModal === 'function') {
      window.openFirebaseSetupModal();
    }
    return null;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  // Quyền drive.file: Chỉ truy cập và quản lý các file do chính ứng dụng này tạo ra (Bảo mật tuyệt đối)
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  try {
    const result = await firebaseAuth.signInWithPopup(provider);
    currentUser = result.user;

    // Lưu OAuth access token để gọi Google Drive API
    if (result.credential) {
      googleAccessToken = result.credential.accessToken;
      sessionStorage.setItem('study_planner_google_access_token', googleAccessToken);
      sessionStorage.setItem('study_planner_google_token_time', Date.now().toString());
    }

    console.log('Đăng nhập thành công:', currentUser.email, 'UID:', currentUser.uid);
    return currentUser;
  } catch (error) {
    console.error('Lỗi đăng nhập Google:', error);
    alert('Đăng nhập Google thất bại: ' + error.message);
    throw error;
  }
}

/**
 * Đăng xuất
 */
async function signOutUser() {
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
  currentUser = null;
  googleAccessToken = null;
  sessionStorage.removeItem('study_planner_google_access_token');
  sessionStorage.removeItem('study_planner_google_token_time');
  console.log('Đã đăng xuất người dùng.');
}

/**
 * Lấy Access Token Google hiện tại (phục vụ gọi Drive API)
 */
function getGoogleAccessToken() {
  if (!googleAccessToken) {
    googleAccessToken = sessionStorage.getItem('study_planner_google_access_token');
  }
  return googleAccessToken;
}

/**
 * Kiểm tra xem Google OAuth Access Token đã hết hạn chưa (Google token hết hạn sau 3600s)
 */
function isGoogleAccessTokenExpired() {
  const token = getGoogleAccessToken();
  if (!token) return true;
  const timeStr = sessionStorage.getItem('study_planner_google_token_time');
  if (!timeStr) return false;
  const tokenTime = parseInt(timeStr, 10);
  return (Date.now() - tokenTime) > (50 * 60 * 1000); // 50 phút
}

/**
 * Đảm bảo Google OAuth Access Token còn hiệu lực, tự động yêu cầu xác thực nếu hết hạn
 */
async function ensureValidGoogleAccessToken(forceReauth = false) {
  if (forceReauth || isGoogleAccessTokenExpired()) {
    console.log('Google OAuth token đã hết hạn hoặc chưa có. Đang yêu cầu xác thực...');
    const user = await signInWithGoogle();
    if (!user) throw new Error('Không thể đăng nhập Google để lấy token Drive.');
    return getGoogleAccessToken();
  }
  return getGoogleAccessToken();
}

// --- MULTI-TENANT FIRESTORE REPOSITORY ---

/**
 * Lắng nghe danh sách tasks của người dùng hiện tại theo thời gian thực (Realtime Multi-tenant)
 * Đường dẫn: users/{uid}/tasks
 */
function listenToUserTasks(userId, onUpdateCallback, onErrorCallback) {
  if (!firebaseDb || !userId) return () => { };

  return firebaseDb
    .collection('users')
    .doc(userId)
    .collection('tasks')
    .onSnapshot(
      (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        onUpdateCallback(tasks);
      },
      (error) => {
        console.error('Lỗi khi lắng nghe Firestore:', error);
        if (onErrorCallback) onErrorCallback(error);
      }
    );
}

/**
 * Hàm làm sạch dữ liệu trước khi lưu Firestore (loại bỏ hoàn toàn các trường undefined tránh gây lỗi SDK)
 */
function sanitizeForFirestore(data) {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

/**
 * Lưu hoặc cập nhật một task lên Firestore của người dùng hiện tại
 */
async function saveTaskToFirestore(userId, task) {
  if (!firebaseDb || !userId) return false;

  const taskRef = firebaseDb.collection('users').doc(userId).collection('tasks').doc(task.id);
  const taskData = sanitizeForFirestore(task);
  delete taskData.id; // ID đã nằm trong doc key

  await taskRef.set(taskData, { merge: true });
  return true;
}

/**
 * Xóa một task khỏi Firestore
 */
async function deleteTaskFromFirestore(userId, taskId) {
  if (!firebaseDb || !userId) return false;
  await firebaseDb.collection('users').doc(userId).collection('tasks').doc(taskId).delete();
  return true;
}

/**
 * Lắng nghe danh sách Task tổng (Parent Tasks) của người dùng theo thời gian thực
 * Đường dẫn: users/{uid}/parentTasks
 */
function listenToUserParentTasks(userId, onUpdateCallback, onErrorCallback) {
  if (!firebaseDb || !userId) return () => {};

  return firebaseDb
    .collection('users')
    .doc(userId)
    .collection('parentTasks')
    .onSnapshot(
      (snapshot) => {
        const pTasks = [];
        snapshot.forEach((doc) => {
          pTasks.push({ id: doc.id, ...doc.data() });
        });
        onUpdateCallback(pTasks);
      },
      (error) => {
        console.error('Lỗi khi lắng nghe Parent Tasks từ Firestore:', error);
        if (onErrorCallback) onErrorCallback(error);
      }
    );
}

/**
 * Lưu hoặc cập nhật một Task tổng lên Firestore
 */
async function saveParentTaskToFirestore(userId, parentTask) {
  if (!firebaseDb || !userId) return false;

  const pRef = firebaseDb.collection('users').doc(userId).collection('parentTasks').doc(parentTask.id);
  const pData = sanitizeForFirestore(parentTask);
  delete pData.id;

  await pRef.set(pData, { merge: true });
  return true;
}

/**
 * Xóa một Task tổng khỏi Firestore
 */
async function deleteParentTaskFromFirestore(userId, parentTaskId) {
  if (!firebaseDb || !userId) return false;
  await firebaseDb.collection('users').doc(userId).collection('parentTasks').doc(parentTaskId).delete();
  return true;
}

// --- GOOGLE DRIVE API INTEGRATION ---

const GOOGLE_DRIVE_ROOT_FOLDER = 'study_idv_planning';

/**
 * Tìm hoặc tạo thư mục trên Google Drive của người dùng
 * Hỗ trợ tạo thư mục con bên trong thư mục cha (parentFolderId)
 */
async function getOrCreateDriveFolder(token, folderName = GOOGLE_DRIVE_ROOT_FOLDER, parentFolderId = null) {
  if (!token) throw new Error('Chưa có Google Access Token.');

  const safeFolderName = folderName.replace(/'/g, "\\'");
  let query = `name='${safeFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  // 1. Tìm thư mục đã tồn tại chưa
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`;
  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 401) {
    const err = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  const data = await res.json();
  if (data.error && data.error.code === 401) {
    const err = new Error(data.error.message || 'Request had invalid authentication credentials.');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // 2. Nếu chưa có, tạo thư mục mới
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    folderMetadata.parents = [parentFolderId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(folderMetadata)
  });

  if (createRes.status === 401) {
    const err = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }

  const newFolder = await createRes.json();
  if (newFolder.error) {
    if (newFolder.error.code === 401) {
      const err = new Error(newFolder.error.message);
      err.status = 401;
      err.code = 'UNAUTHENTICATED';
      throw err;
    }
    throw new Error(newFolder.error.message || 'Lỗi khi tạo thư mục trên Google Drive');
  }
  return newFolder.id;
}

/**
 * Đảm bảo toàn bộ chuỗi phân cấp thư mục tồn tại trên Drive:
 * pathSegments: ['study_idv_planning', '2026', 'Nghiên cứu & Học thuật', 'Đọc Chapter 1']
 * Trả về ID của thư mục lá cuối cùng để lưu file vào đó.
 */
async function getOrCreateDriveFolderPath(token, pathSegments) {
  let currentParentId = null;
  for (const segment of pathSegments) {
    if (!segment || !segment.trim()) continue;
    currentParentId = await getOrCreateDriveFolder(token, segment.trim(), currentParentId);
  }
  return currentParentId;
}

/**
 * Tải file văn bản hoặc docx lên thư mục Google Drive của người dùng
 * theo đúng cấu trúc: study_idv_planning / [Năm] / [Task tổng] / [Task con] / [File]
 * Tự động phát hiện token hết hạn (401 UNAUTHENTICATED) và cấp mới token để retry.
 * @param {string} fileName - Tên file (ví dụ: 'Tai_lieu.docx')
 * @param {Blob|string} content - Nội dung (Blob DOCX hoặc HTML text)
 * @param {string} mimeType - Kiểu MIME
 * @param {string|null} existingFileId - ID file nếu cập nhật
 * @param {Array<string>} folderPath - Mảng chuỗi phân cấp thư mục
 */
async function uploadFileToGoogleDrive({ fileName, content, mimeType = 'text/html', existingFileId = null, folderPath = [] }) {
  let token = await ensureValidGoogleAccessToken();
  if (!token) {
    throw new Error('Bạn cần đăng nhập Google để lưu file vào Google Drive.');
  }

  const executeUpload = async (authToken) => {
    // Tạo hoặc lấy thư mục đích theo chuỗi phân cấp
    let targetFolderId = null;
    if (folderPath && folderPath.length > 0) {
      targetFolderId = await getOrCreateDriveFolderPath(authToken, folderPath);
    } else {
      targetFolderId = await getOrCreateDriveFolder(authToken, GOOGLE_DRIVE_ROOT_FOLDER);
    }

    const metadata = {
      name: fileName,
      mimeType: mimeType
    };
    if (!existingFileId && targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    // Sử dụng Multipart Upload chuẩn của Google Drive API v3 (RFC 2387)
    const boundary = '-------314159265358979323846';

    let fileBlob;
    if (content instanceof Blob) {
      fileBlob = content;
    } else if (typeof content === 'string') {
      fileBlob = new Blob([content], { type: mimeType });
    } else {
      fileBlob = new Blob([content], { type: mimeType });
    }

    const metadataHeader = 
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`;

    const closeFooter = `\r\n--${boundary}--`;

    // Ghép các phần thành một Blob nhị phân nguyên bản (giữ nguyên cấu trúc file Word .docx / zip)
    const multipartBlob = new Blob([
      metadataHeader,
      fileBlob,
      closeFooter
    ], { type: `multipart/related; boundary=${boundary}` });

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`;

    const response = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBlob
    });

    if (response.status === 401) {
      const authErr = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
      authErr.status = 401;
      authErr.code = 'UNAUTHENTICATED';
      throw authErr;
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Lỗi khi upload lên Google Drive (HTTP ${response.status}).`);
    }

    const fileData = await response.json();
    return {
      fileId: fileData.id,
      fileName: fileData.name,
      webViewLink: fileData.webViewLink,
      modifiedTime: fileData.modifiedTime,
      folderId: targetFolderId || null
    };
  };

  try {
    return await executeUpload(token);
  } catch (err) {
    // Nếu token hết hạn hoặc lỗi xác thực (401), làm mới token và thử lại lần 2
    if (err.status === 401 || err.code === 'UNAUTHENTICATED' || (err.message && err.message.includes('authentication credentials'))) {
      console.warn('Google Access Token hết hạn, đang tự động yêu cầu xác thực mới và thử lại upload...');
      token = await ensureValidGoogleAccessToken(true);
      if (!token) throw new Error('Không thể làm mới phiên xác thực Google Drive.');
      return await executeUpload(token);
    }
    throw err;
  }
}

// Export các hàm và biến ra window để app.js truy cập trực tiếp
window.StudyPlannerFirebase = {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  initFirebaseApp,
  signInWithGoogle,
  signOutUser,
  getGoogleAccessToken,
  isGoogleAccessTokenExpired,
  ensureValidGoogleAccessToken,
  getCurrentUser: () => currentUser,
  listenToUserTasks,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  listenToUserParentTasks,
  saveParentTaskToFirestore,
  deleteParentTaskFromFirestore,
  getOrCreateDriveFolder,
  getOrCreateDriveFolderPath,
  uploadFileToGoogleDrive
};
