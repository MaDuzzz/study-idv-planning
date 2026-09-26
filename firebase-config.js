/**
 * Study & Life Planner - Firebase & Google Drive Integration Module
 * Hỗ trợ: Multi-tenant Firestore, Google Authentication (Scope: drive.file), và Google Drive API
 */

// Cấu hình Firebase mặc định (Người dùng có thể ghi đè qua Modal Cài đặt hoặc lưu trong localStorage)
const DEFAULT_FIREBASE_CONFIG_KEY = 'study_planner_firebase_config_v1';

// Lấy cấu hình Firebase đã lưu hoặc trả về null nếu chưa cấu hình
function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(DEFAULT_FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
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

// --- MULTI-TENANT FIRESTORE REPOSITORY ---

/**
 * Lắng nghe danh sách tasks của người dùng hiện tại theo thời gian thực (Realtime Multi-tenant)
 * Đường dẫn: users/{uid}/tasks
 */
function listenToUserTasks(userId, onUpdateCallback, onErrorCallback) {
  if (!firebaseDb || !userId) return () => {};

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
 * Lưu hoặc cập nhật một task lên Firestore của người dùng hiện tại
 */
async function saveTaskToFirestore(userId, task) {
  if (!firebaseDb || !userId) return false;

  const taskRef = firebaseDb.collection('users').doc(userId).collection('tasks').doc(task.id);
  const taskData = { ...task };
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

// --- GOOGLE DRIVE API INTEGRATION ---

const GOOGLE_DRIVE_FOLDER_NAME = 'Study-Planner-Documents';

/**
 * Tìm hoặc tạo thư mục 'Study-Planner-Documents' trên Google Drive của người dùng
 */
async function getOrCreateDriveFolder(token) {
  if (!token) throw new Error('Chưa có Google Access Token.');

  // 1. Tìm thư mục đã tồn tại chưa
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)`;
  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // 2. Nếu chưa có, tạo thư mục mới
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Tải file văn bản hoặc docx lên thư mục Google Drive của người dùng
 * @param {string} fileName - Tên file (ví dụ: 'On_tap_IELTS.docx')
 * @param {Blob|string} content - Nội dung (Blob DOCX hoặc HTML text)
 * @param {string} mimeType - Kiểu MIME
 * @param {string|null} existingFileId - ID file nếu cập nhật
 */
async function uploadFileToGoogleDrive({ fileName, content, mimeType = 'text/html', existingFileId = null }) {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Bạn cần đăng nhập Google để lưu file vào Google Drive.');
  }

  const folderId = await getOrCreateDriveFolder(token);

  const metadata = {
    name: fileName,
    mimeType: mimeType
  };
  if (!existingFileId) {
    metadata.parents = [folderId];
  }

  // Sử dụng Multipart Upload của Drive API v3
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let bodyData;
  if (content instanceof Blob) {
    const arrayBuffer = await content.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    bodyData = binary;
  } else {
    bodyData = content;
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    (content instanceof Blob ? 'Content-Transfer-Encoding: base64\r\n' : '') +
    '\r\n' +
    (content instanceof Blob ? btoa(bodyData) : bodyData) +
    closeDelimiter;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,modifiedTime`;

  const response = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error?.message || 'Lỗi khi upload lên Google Drive.');
  }

  const fileData = await response.json();
  return {
    fileId: fileData.id,
    fileName: fileData.name,
    webViewLink: fileData.webViewLink,
    modifiedTime: fileData.modifiedTime
  };
}

// Export các hàm và biến ra window để app.js truy cập trực tiếp
window.StudyPlannerFirebase = {
  getStoredFirebaseConfig,
  saveFirebaseConfig,
  initFirebaseApp,
  signInWithGoogle,
  signOutUser,
  getGoogleAccessToken,
  getCurrentUser: () => currentUser,
  listenToUserTasks,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  uploadFileToGoogleDrive
};
