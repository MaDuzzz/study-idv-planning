/**
 * Study & Life Planner - Nightly Web Push Reminder Script
 * Chạy lúc 23h30 hàng ngày qua cron-job.org / GitHub Actions
 * Kiểm tra các nhiệm vụ chưa hoàn thành hôm nay và gửi thông báo Web Push tới iPhone.
 */

const admin = require('firebase-admin');
const webpush = require('web-push');
const crypto = require('crypto');

// 1. Múi giờ Việt Nam (UTC+7)
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

function getVietnamNow() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
}

function getTodayStrVietnam() {
  const vnDate = getVietnamNow();
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 2. Khởi tạo Firebase Admin SDK
function initFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error('Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountRaw);
  } catch (err) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT không phải chuỗi JSON hợp lệ: ' + err.message);
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 3. Giải mã token Push Subscription (AES-256-GCM)
function decryptPushSubscription(encryptedPayloadStr, keyHex) {
  if (!encryptedPayloadStr || !keyHex) return null;

  try {
    const parts = encryptedPayloadStr.split(':');
    if (parts.length !== 2) {
      throw new Error('Định dạng chuỗi mã hóa không đúng (cần iv:ciphertext)');
    }

    const ivBuf = Buffer.from(parts[0], 'hex');
    const dataBuf = Buffer.from(parts[1], 'hex');
    const keyBuf = Buffer.from(keyHex, 'hex');

    // 16 bytes cuối là Authentication Tag
    const tagBuf = dataBuf.slice(dataBuf.length - 16);
    const encTextBuf = dataBuf.slice(0, dataBuf.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(tagBuf);

    let decrypted = decipher.update(encTextBuf, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (err) {
    console.error('❌ Lỗi khi giải mã Push Subscription:', err.message);
    return null;
  }
}

// 4. Hàm chính chạy gửi thông báo
async function main() {
  console.log('=== BẮT ĐẦU CHU KỲ NHẮC VIỆC CUỐI NGÀY (23H30 VN) ===');
  const todayStr = getTodayStrVietnam();
  console.log(`📅 Ngày thực hiện: ${todayStr} (Giờ VN: ${getVietnamNow().toLocaleTimeString('vi-VN')})`);

  // Kiểm tra VAPID Keys
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@study-planner.app';
  const encryptionKey = process.env.PUSH_ENCRYPTION_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('❌ Thiếu VAPID_PUBLIC_KEY hoặc VAPID_PRIVATE_KEY!');
    process.exit(1);
  }

  if (!encryptionKey) {
    console.error('❌ Thiếu PUSH_ENCRYPTION_KEY dùng để giải mã token!');
    process.exit(1);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  initFirebaseAdmin();
  const db = admin.firestore();

  // Đọc danh sách users
  const usersSnap = await db.collection('users').get();
  if (usersSnap.empty) {
    console.log('ℹ️ Không có người dùng nào trong hệ thống.');
    return;
  }

  let totalSent = 0;
  let totalSkipped = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const userEmail = userData.email || userId;

    // Kiểm tra cài đặt push
    if (userData.pushEnabled === false) {
      console.log(`⏩ [${userEmail}]: Đã tắt nhận thông báo push. Bỏ qua.`);
      continue;
    }

    const encryptedToken = userData.pushSubscriptionEncrypted;
    if (!encryptedToken) {
      console.log(`ℹ️ [${userEmail}]: Chưa đăng ký nhận thông báo Web Push trên iPhone.`);
      continue;
    }

    // Giải mã subscription
    const subscription = decryptPushSubscription(encryptedToken, encryptionKey);
    if (!subscription || !subscription.endpoint) {
      console.warn(`⚠️ [${userEmail}]: Không giải mã được subscription hoặc subscription không hợp lệ.`);
      continue;
    }

    // Đọc danh sách tasks của user trong ngày hôm nay
    const tasksSnap = await db.collection('users').doc(userId).collection('tasks').get();
    const allTasks = [];
    tasksSnap.forEach(doc => allTasks.push({ id: doc.id, ...doc.data() }));

    const todayTasks = allTasks.filter(t => t.date === todayStr);
    const uncompletedTasks = todayTasks.filter(t => !t.completed);

    if (uncompletedTasks.length === 0) {
      console.log(`🎉 [${userEmail}]: Hôm nay có ${todayTasks.length} task, tất cả đã hoàn thành! Bỏ qua thông báo để user nghỉ ngơi.`);
      totalSkipped++;
      continue;
    }

    console.log(`🔔 [${userEmail}]: Hôm nay còn ${uncompletedTasks.length}/${todayTasks.length} task chưa xong. Đang gửi Web Push tới iPhone...`);

    // Soạn nội dung thông báo
    const taskTitles = uncompletedTasks.slice(0, 2).map(t => `• ${t.title}`).join('\n');
    const moreText = uncompletedTasks.length > 2 ? ` và ${uncompletedTasks.length - 2} việc khác...` : '';
    const bodyText = `Bạn còn ${uncompletedTasks.length} nhiệm vụ chưa tick hoàn thành:\n${taskTitles}${moreText}\nChạm để vào app kiểm tra nhé!`;

    const payload = JSON.stringify({
      title: 'Study & Life Planner ⏰ (23h30)',
      body: bodyText,
      icon: './logo/logo_idv_planner.png',
      badge: './logo/logo_idv_planner.png',
      data: {
        url: process.env.APP_URL || 'https://maduzzz.github.io/study-idv-planning/'
      }
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`✅ [${userEmail}]: Gửi Web Push thành công!`);
      totalSent++;

      // Cập nhật log gửi vào Firestore
      await db.collection('users').doc(userId).set({
        lastPushSentAt: new Date().toISOString(),
        lastPushTaskCount: uncompletedTasks.length
      }, { merge: true });

    } catch (err) {
      console.error(`❌ [${userEmail}]: Lỗi gửi Web Push:`, err.message);
      // Nếu token hết hạn (410 Gone / 404 Not Found), xóa subscription cũ
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn(`🗑️ Token thiết bị của [${userEmail}] đã hết hạn. Đang dọn dẹp khỏi Firestore...`);
        await db.collection('users').doc(userId).set({
          pushSubscriptionEncrypted: admin.firestore.FieldValue.delete(),
          pushEnabled: false
        }, { merge: true });
      }
    }
  }

  console.log(`\n=== TỔNG KẾT: Đã gửi ${totalSent} thông báo, Bỏ qua ${totalSkipped} (đã hoàn thành hết) ===`);
}

main().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
