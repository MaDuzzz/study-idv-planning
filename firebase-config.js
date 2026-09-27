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
      if (user) {
        syncUserProfileToFirestore(user);
      }
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

// --- USER PROFILE & REMINDER SETTINGS (HỖ TRỢ GITHUB ACTIONS GỬI MAIL) ---

/**
 * Tự động đồng bộ hồ sơ user & cài đặt email vào Firestore để phục vụ GitHub Actions nhắc việc
 */
async function syncUserProfileToFirestore(user) {
  if (!firebaseDb || !user || !user.uid) return;
  try {
    const userRef = firebaseDb.collection('users').doc(user.uid);
    const snap = await userRef.get();
    const updateData = {
      email: user.email,
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
      photoURL: user.photoURL || '',
      lastActiveAt: new Date().toISOString()
    };
    if (!snap.exists || !snap.data().remindSettings) {
      updateData.remindSettings = {
        enabled: true,
        morning: true, // 7:00 AM
        evening: true  // 18:00 PM
      };
    }
    await userRef.set(updateData, { merge: true });
    console.log('✅ Đã đồng bộ hồ sơ người dùng lên Firestore:', user.email);
  } catch (err) {
    console.warn('Lỗi khi đồng bộ hồ sơ user:', err);
  }
}

/**
 * Đọc cài đặt nhận email nhắc nhở
 */
async function getUserRemindSettings(userId) {
  if (!firebaseDb || !userId) return { enabled: true, morning: true, evening: true };
  try {
    const snap = await firebaseDb.collection('users').doc(userId).get();
    if (snap.exists && snap.data().remindSettings) {
      return snap.data().remindSettings;
    }
  } catch (e) {
    console.warn('Lỗi đọc remindSettings:', e);
  }
  return { enabled: true, morning: true, evening: true };
}

/**
 * Lưu cài đặt nhận email nhắc nhở
 */
async function saveUserRemindSettings(userId, settings) {
  if (!firebaseDb || !userId) return false;
  try {
    await firebaseDb.collection('users').doc(userId).set({
      remindSettings: settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Lỗi lưu remindSettings:', e);
    return false;
  }
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
 * Tìm ID thư mục theo tên và thư mục cha (không tự động tạo nếu chưa có)
 */
async function findDriveFolder(token, folderName, parentFolderId = null) {
  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`;
  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Tìm ID của thư mục theo chuỗi phân cấp (trả về null nếu không tồn tại)
 * pathSegments: ['study_idv_planning', '2026', 'Nghiên cứu', 'Đọc Chapter 1']
 */
async function findDriveFolderPath(token, pathSegments) {
  let currentParentId = null;
  for (const segment of pathSegments) {
    if (!segment || !segment.trim()) continue;
    currentParentId = await findDriveFolder(token, segment.trim(), currentParentId);
    if (!currentParentId) return null;
  }
  return currentParentId;
}

/**
 * Xóa vĩnh viễn một tệp hoặc thư mục khỏi Google Drive
 * (Nếu xóa thư mục, toàn bộ tài liệu & tệp con bên trong cũng sẽ được xóa sạch)
 */
async function deleteDriveFileOrFolder(fileOrFolderId) {
  let token = await ensureValidGoogleAccessToken();
  if (!token || !fileOrFolderId) return false;

  const executeDelete = async (authToken) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileOrFolderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 401) {
      const authErr = new Error('Invalid authentication credentials');
      authErr.status = 401;
      throw authErr;
    }
    // 204 No Content hoặc 404 Not Found (đã bị xóa) đều coi là thành công
    return res.status === 204 || res.status === 200 || res.status === 404;
  };

  try {
    return await executeDelete(token);
  } catch (err) {
    if (err.status === 401) {
      token = await ensureValidGoogleAccessToken(true);
      if (!token) return false;
      return await executeDelete(token);
    }
    console.warn('Lỗi khi xóa file/folder trên Drive:', err);
    return false;
  }
}

/**
 * Xóa toàn bộ thư mục Google Drive của một subtask (dọn sạch tài liệu & tệp đính kèm)
 * Tìm theo folderId đã lưu hoặc theo đường dẫn folderPath
 */
async function deleteSubtaskDriveFolder({ folderId = null, folderPath = [] }) {
  let token = await ensureValidGoogleAccessToken();
  if (!token) return false;

  let targetFolderId = folderId;

  // Nếu chưa có targetFolderId, tìm theo chuỗi phân cấp folderPath
  if (!targetFolderId && folderPath && folderPath.length > 0) {
    try {
      targetFolderId = await findDriveFolderPath(token, folderPath);
    } catch (e) {
      console.warn('Không thể tìm thư mục subtask theo đường dẫn:', e);
    }
  }

  if (!targetFolderId) {
    console.log('Không tìm thấy thư mục Google Drive tương ứng của subtask (có thể chưa từng tạo trên Drive).');
    return false;
  }

  console.log(`Đang xóa thư mục Google Drive của subtask (Folder ID: ${targetFolderId})...`);
  const success = await deleteDriveFileOrFolder(targetFolderId);
  if (success) {
    console.log(`Đã xóa sạch thư mục Google Drive của subtask ID: ${targetFolderId}`);
  }
  return success;
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
 * @param {string} [orientation='portrait'] - Khổ giấy ('portrait' | 'landscape')
 */
async function uploadFileToGoogleDrive({ fileName, content, mimeType = 'text/html', existingFileId = null, folderPath = [], orientation = 'portrait' }) {
  let token = await ensureValidGoogleAccessToken();
  if (!token) {
    throw new Error('Bạn cần đăng nhập Google để lưu file vào Google Drive.');
  }

  const executeUpload = async (authToken) => {
    // 1. Tạo hoặc lấy thư mục đích theo chuỗi phân cấp
    let targetFolderId = null;
    if (folderPath && folderPath.length > 0) {
      targetFolderId = await getOrCreateDriveFolderPath(authToken, folderPath);
    } else {
      targetFolderId = await getOrCreateDriveFolder(authToken, GOOGLE_DRIVE_ROOT_FOLDER);
    }

    const cleanDocName = (fileName || 'Tai_lieu').replace(/\.docx$/i, '');

    // Chuẩn bị nội dung HTML text UTF-8
    let htmlString = '';
    if (typeof content === 'string') {
      htmlString = content;
    } else if (content instanceof Blob) {
      htmlString = await content.text();
    } else {
      htmlString = String(content || '');
    }

    // Sử dụng Multipart Upload chuẩn của Google Drive API v3 (RFC 2387)
    // Tự động chuyển đổi HTML thành tài liệu Google Docs nguyên bản (hiển thị đầy đủ chữ, bảng, định dạng)
    const boundary = '-------314159265358979323846';

    const buildMultipartBlob = (metaObj) => {
      const metadataHeader = 
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metaObj) +
        `\r\n--${boundary}\r\n` +
        'Content-Type: text/html; charset=UTF-8\r\n\r\n';

      const closeFooter = `\r\n--${boundary}--`;

      return new Blob([
        metadataHeader,
        htmlString,
        closeFooter
      ], { type: `multipart/related; boundary=${boundary}` });
    };

    // Metadata khi tạo mới (POST): bao gồm mimeType và parents
    const createMetadata = {
      name: cleanDocName,
      mimeType: 'application/vnd.google-apps.document'
    };
    if (targetFolderId) {
      createMetadata.parents = [targetFolderId];
    }

    // Metadata khi cập nhật file cũ (PATCH): tuyệt đối KHÔNG chứa 'parents' hoặc 'mimeType'
    // vì Drive API v3 nghiêm cấm trường parents trong body request PATCH (gây lỗi 400 Bad Request)
    const updateMetadata = {
      name: cleanDocName
    };

    let response;
    const isUpdate = Boolean(existingFileId);

    if (isUpdate) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`;
      response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: buildMultipartBlob(updateMetadata)
      });

      if (response.status === 401) {
        const authErr = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
        authErr.status = 401;
        authErr.code = 'UNAUTHENTICATED';
        throw authErr;
      }

      // Nếu cập nhật file cũ thất bại (404: file đã bị xóa trên Drive, hoặc 400: file cũ lỗi không cập nhật được)
      // Tự động tạo file mới thay thế để người dùng không bị mất dữ liệu và không bị gián đoạn công việc
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        console.warn(`Cập nhật file Drive cũ (${existingFileId}) thất bại (HTTP ${response.status}), tự động tạo file mới thay thế...`);
        const createUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`;
        response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: buildMultipartBlob(createMetadata)
        });

        if (response.status === 401) {
          const authErr = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
          authErr.status = 401;
          authErr.code = 'UNAUTHENTICATED';
          throw authErr;
        }
      }
    } else {
      // Tạo mới tài liệu lần đầu
      const createUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`;
      response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: buildMultipartBlob(createMetadata)
      });

      if (response.status === 401) {
        const authErr = new Error('Request had invalid authentication credentials. Expected OAuth 2 access token');
        authErr.status = 401;
        authErr.code = 'UNAUTHENTICATED';
        throw authErr;
      }
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Lỗi khi upload lên Google Drive (HTTP ${response.status}).`);
    }

    const fileData = await response.json();
    const finalFileId = fileData.id;
    const docEditLink = `https://docs.google.com/document/d/${finalFileId}/edit`;

    // Cấu hình lề mặc định chuẩn 1 inch (72pt / 2.54cm) và kích thước trang (A4 dọc / ngang) qua Google Docs API
    try {
      const isLandscape = orientation === 'landscape';
      // Khổ A4 theo đơn vị PT: Chiều rộng 595.28pt, Chiều cao 841.89pt
      const docWidth = isLandscape ? 841.89 : 595.28;
      const docHeight = isLandscape ? 595.28 : 841.89;

      await fetch(`https://docs.googleapis.com/v1/documents/${finalFileId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            updateDocumentStyle: {
              documentStyle: {
                marginTop: { magnitude: 72, unit: 'PT' },
                marginBottom: { magnitude: 72, unit: 'PT' },
                marginLeft: { magnitude: 72, unit: 'PT' },
                marginRight: { magnitude: 72, unit: 'PT' },
                pageSize: {
                  width: { magnitude: docWidth, unit: 'PT' },
                  height: { magnitude: docHeight, unit: 'PT' }
                }
              },
              fields: 'marginTop,marginBottom,marginLeft,marginRight,pageSize'
            }
          }]
        })
      });
    } catch (e) {
      console.warn('Cập nhật cấu hình lề và kích thước qua Docs API (bỏ qua):', e);
    }

    return {
      fileId: finalFileId,
      fileName: fileData.name,
      webViewLink: fileData.webViewLink || docEditLink,
      googleDocsUrl: docEditLink,
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

/**
 * Tải file nhị phân bất kỳ (PDF, MP4, hình ảnh, slide, tài liệu, zip...) lên Google Drive
 * theo cấu trúc phân cấp thư mục của subtask: study_idv_planning / [Năm] / [Task tổng] / [Task con]
 * @param {Object} params
 * @param {File|Blob} params.file - File được chọn từ máy
 * @param {string} [params.fileName] - Tên file tùy chọn
 * @param {string} [params.mimeType] - MimeType tùy chọn
 * @param {Array<string>} [params.folderPath] - Mảng đường dẫn thư mục phân cấp
 */
async function uploadBinaryFileToGoogleDrive({ file, fileName, mimeType, folderPath = [] }) {
  let token = await ensureValidGoogleAccessToken();
  if (!token) {
    throw new Error('Bạn cần đăng nhập Google để lưu tệp vào Google Drive.');
  }

  const effectiveFileName = fileName || file.name || 'Tep_dinh_kem';
  const effectiveMimeType = mimeType || file.type || 'application/octet-stream';

  const executeUpload = async (authToken) => {
    // 1. Tạo hoặc lấy thư mục đích theo chuỗi phân cấp
    let targetFolderId = null;
    if (folderPath && folderPath.length > 0) {
      targetFolderId = await getOrCreateDriveFolderPath(authToken, folderPath);
    } else {
      targetFolderId = await getOrCreateDriveFolder(authToken, GOOGLE_DRIVE_ROOT_FOLDER);
    }

    const metadata = {
      name: effectiveFileName,
      mimeType: effectiveMimeType
    };
    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const boundary = '-------314159265358979323846';
    const metadataHeader = 
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${effectiveMimeType}\r\n\r\n`;

    const closeFooter = `\r\n--${boundary}--`;

    const multipartBlob = new Blob([
      metadataHeader,
      file,
      closeFooter
    ], { type: `multipart/related; boundary=${boundary}` });

    const url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,modifiedTime`;

    const response = await fetch(url, {
      method: 'POST',
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
      throw new Error(errJson.error?.message || `Lỗi khi upload tệp lên Google Drive (HTTP ${response.status}).`);
    }

    const fileData = await response.json();
    return {
      fileId: fileData.id,
      fileName: fileData.name,
      mimeType: fileData.mimeType || effectiveMimeType,
      size: fileData.size ? parseInt(fileData.size, 10) : (file.size || 0),
      webViewLink: fileData.webViewLink,
      webContentLink: fileData.webContentLink || fileData.webViewLink,
      folderId: targetFolderId || null
    };
  };

  try {
    return await executeUpload(token);
  } catch (err) {
    if (err.status === 401 || err.code === 'UNAUTHENTICATED' || (err.message && err.message.includes('authentication credentials'))) {
      console.warn('Google Access Token hết hạn, đang tự động yêu cầu xác thực mới và thử lại upload tệp...');
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
  findDriveFolder,
  findDriveFolderPath,
  deleteDriveFileOrFolder,
  deleteSubtaskDriveFolder,
  uploadFileToGoogleDrive,
  uploadBinaryFileToGoogleDrive,
  syncUserProfileToFirestore,
  getUserRemindSettings,
  saveUserRemindSettings
};
