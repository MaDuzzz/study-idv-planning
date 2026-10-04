/**
 * Study & Life Planner - Daily Task Reminder Script
 * Chạy tự động qua GitHub Actions vào 7:00 sáng và 18:00 tối hàng ngày
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// 1. Cấu hình múi giờ Việt Nam (UTC+7)
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

function getYesterdayDateVietnam() {
  const vnDate = getVietnamNow();
  vnDate.setDate(vnDate.getDate() - 1);
  return vnDate;
}

function getYesterdayStrVietnam() {
  const vnDate = getYesterdayDateVietnam();
  const year = vnDate.getFullYear();
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatVietnameseDate(dateObj) {
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = days[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  return `${dayName}, ngày ${day}/${month}/${year}`;
}

// 2. Xác định ca gửi (Sáng ~6h / Chiều ~18h)
function getReminderShift() {
  const explicit = (process.env.REMINDER_SHIFT || 'auto').toLowerCase();
  if (explicit === 'morning' || explicit === 'evening') {
    return explicit;
  }
  const vnHour = getVietnamNow().getHours();
  // Trước 13h trưa coi là ca sáng (6h), sau 13h trưa coi là ca chiều (18h)
  return vnHour < 13 ? 'morning' : 'evening';
}

// 3. Khởi tạo Firebase Admin SDK
function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountRaw) {
    throw new Error(
      'Thiếu GitHub Secret "FIREBASE_SERVICE_ACCOUNT"!\n' +
      'Vui lòng vào Firebase Console -> Project Settings -> Service Accounts -> "Generate new private key", ' +
      'sau đó copy nội dung file JSON và paste vào GitHub Repo -> Settings -> Secrets and variables -> Actions.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountRaw);
  } catch (err) {
    // Thử giải mã nếu user lưu dưới dạng Base64
    try {
      const decoded = Buffer.from(serviceAccountRaw, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (e) {
      throw new Error('Nội dung FIREBASE_SERVICE_ACCOUNT không phải JSON hợp lệ: ' + err.message);
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin đã kết nối thành công với Project:', serviceAccount.project_id);
  return admin.firestore();
}

// 4. Khởi tạo Email Transporter (Hỗ trợ Gmail SMTP hoặc Resend API)
function createEmailTransporter() {
  // Ưu tiên 1: Resend REST API (Nếu user cấu hình RESEND_API_KEY - không bao giờ bị Google chặn SMTP)
  if (process.env.RESEND_API_KEY) {
    const resendKey = process.env.RESEND_API_KEY.trim();
    console.log('📧 Sử dụng Resend REST API (Gửi trực tiếp qua HTTPS, 100% không bị chặn)');
    return {
      type: 'resend',
      verify: async () => true,
      sendMail: async (options) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Study & Life Planner <onboarding@resend.dev>',
            to: [options.to],
            subject: options.subject,
            html: options.html
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || (typeof data === 'object' ? JSON.stringify(data) : 'Lỗi gửi email qua Resend'));
        }
        return { messageId: data.id };
      }
    };
  }

  let gmailUser = (process.env.GMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  let gmailAppPw = (process.env.GMAIL_APP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');

  if (gmailUser && gmailAppPw) {
    if (!gmailUser.includes('@')) {
      gmailUser += '@gmail.com';
    }

    // Google App Password chuẩn chỉ gồm 16 chữ cái tiếng Anh viết thường
    const cleanPass = gmailAppPw.replace(/[^a-zA-Z]/g, '').toLowerCase();

    console.log(`📧 Cấu hình Gmail SMTP: ${gmailUser}`);
    console.log(`🔑 Kiểm tra Mật khẩu ứng dụng: Độ dài: ${cleanPass.length} ký tự (chuẩn của Google là đúng 16 chữ cái)`);

    if (cleanPass.length !== 16) {
      console.warn(`\n⚠️ CẢNH BÁO: Mật khẩu của bạn có độ dài ${cleanPass.length} ký tự (Google App Password chuẩn là ĐÚNG 16 CHỮ CÁI).`);
      console.warn(`   Nếu bạn đang nhập mật khẩu đăng nhập Gmail thông thường (có số, ký tự đặc biệt) thay vì Mật khẩu ứng dụng 16 chữ cái, Google SMTP chắc chắn sẽ báo lỗi 534!`);
      console.warn(`   Hãy truy cập https://myaccount.google.com/apppasswords để tạo đúng Mật khẩu ứng dụng.\n`);
    }

    // Sử dụng kết nối bảo mật smtp.gmail.com cổng 465 SSL với cơ chế AUTH LOGIN
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: cleanPass
      },
      authMethod: 'LOGIN',
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Hỗ trợ SMTP tùy chỉnh khác nếu có
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`📧 Sử dụng Custom SMTP Host: ${process.env.SMTP_HOST}`);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  throw new Error(
    'Thiếu cấu hình gửi email!\n' +
    'Vui lòng thêm các Secret sau vào GitHub Actions:\n' +
    '- GMAIL_USER: Địa chỉ Gmail của bạn (vd: your-email@gmail.com)\n' +
    '- GMAIL_APP_PASSWORD: Mật khẩu ứng dụng 16 ký tự tạo từ Google Account (Security -> 2-Step Verification -> App passwords)\n' +
    'HOẶC thêm RESEND_API_KEY nếu sử dụng dịch vụ Resend.'
  );
}

// 5. Render thẻ nhiệm vụ (dùng chung cho cả hôm qua và hôm nay)
function renderTaskCard(t, parentTasksMap, { isYesterday = false } = {}) {
  const parent = t.parentId ? parentTasksMap[t.parentId] : null;
  const parentTag = parent ? (parent.tag || parent.title.slice(0, 5).toUpperCase()) : '';
  const parentColor = (parent && parent.color) ? parent.color : '#2563eb';
  
  const isDone = !!t.completed;
  let statusIcon = '📌';
  let borderStyle = 'border-left: 4px solid #3b82f6;';

  if (isDone) {
    statusIcon = '✅';
    borderStyle = 'border-left: 4px solid #10b981;';
  } else if (isYesterday) {
    statusIcon = '⚠️';
    borderStyle = 'border-left: 4px solid #f59e0b;';
  } else if (t.priority === 'high') {
    statusIcon = '🔥';
    borderStyle = 'border-left: 4px solid #ef4444;';
  }

  return `
    <div class="task-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; ${borderStyle} border-radius: 12px; padding: 13px 14px; margin-bottom: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; align-items: flex-start; justify-content: space-between;">
        <div style="flex: 1;">
          <div class="${isDone ? 'task-title-done' : 'task-title'}" style="font-size: 14.5px; font-weight: 700; color: ${isDone ? '#94a3b8; text-decoration: line-through' : '#0f172a'}; line-height: 1.4; word-break: break-word;">
            ${statusIcon} ${escapeHtml(t.title)}
          </div>
          
          <div style="margin-top: 7px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${parentTag ? `
              <span class="tag-badge" style="font-family: monospace; font-size: 10px; font-weight: 800; background-color: #f1f5f9; color: ${parentColor}; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                [${escapeHtml(parentTag)}]
              </span>
            ` : ''}

            ${isDone ? `
              <span class="badge-done" style="font-size: 10px; font-weight: 800; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                ✅ Đã xong
              </span>
            ` : (isYesterday ? `
              <span class="badge-missed" style="font-size: 10px; font-weight: 800; background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                ⚠️ Chưa xong
              </span>
            ` : '')}

            ${(!isDone && t.priority === 'high') ? `
              <span class="badge-priority" style="font-size: 10px; font-weight: 800; background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecdd3; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                🔥 Ưu tiên cao
              </span>
            ` : ''}

            ${t.document && t.document.contentHtml ? `
              <span class="badge-doc" style="font-size: 10px; font-weight: 800; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                📄 DOCX
              </span>
            ` : ''}

            ${t.replanCount > 0 ? `
              <span class="badge-replan" style="font-size: 10px; font-weight: 800; background-color: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; border-radius: 6px; padding: 2.5px 7px; display: inline-block;">
                🔄 Dời ${t.replanCount} lần
              </span>
            ` : ''}
          </div>

          ${(isYesterday && !isDone) ? `
            <div class="yesterday-tip" style="margin-top: 7px; font-size: 11.5px; color: #b45309; font-weight: 600;">
              👉 Chưa hoàn thành hôm qua. Bạn có thể mở web kéo thả hoặc Replan sang hôm nay.
            </div>
          ` : ''}

          ${t.note ? `
            <div class="task-note-box" style="margin-top: 7px; font-size: 12px; color: #334155; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 11px; line-height: 1.45;">
              <strong class="task-note-label" style="color: #0f172a;">Ghi chú:</strong> ${escapeHtml(t.note)}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// 6. Tạo Template HTML Email hiện đại, chuẩn Responsive & tương thích hoàn hảo Dark Mode
function generateEmailHtml({ user, shift, todayStr, formattedDate, tasks, yesterdayTasks = [], yesterdayFormattedDate, parentTasksMap, appUrl }) {
  const isMorning = shift === 'morning';
  const completedCount = tasks.filter(t => t.completed).length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const totalTasks = tasks.length;

  const headerTitle = isMorning
    ? '🌅 Báo cáo & Kế hoạch ngày\u00A0mới'
    : '🌙 Tổng kết & Nhắc nhở buổi\u00A0tối';

  const greeting = isMorning
    ? `Chào buổi sáng <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Dưới đây là <strong>chốt kết quả hôm qua</strong> và <strong>danh sách nhiệm vụ kế hoạch hôm nay</strong>:`
    : `Chào buổi tối <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Cùng điểm lại tiến độ hoàn thành các mục tiêu hôm nay nhé:`;

  // Sắp xếp tasks hôm nay: chưa xong lên trước, ưu tiên cao lên trước
  const sortedTodayTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pOrder = { high: 3, medium: 2, low: 1 };
    return (pOrder[b.priority] || 2) - (pOrder[a.priority] || 2);
  });

  // KHỐI 1: CHỐT KẾT QUẢ HÔM QUA (Chỉ hiển thị vào ca sáng 6h)
  let yesterdaySectionHtml = '';
  if (isMorning) {
    const yTotal = yesterdayTasks.length;
    const yDone = yesterdayTasks.filter(t => t.completed).length;
    const yMissed = yTotal - yDone;
    const yPercent = yTotal > 0 ? Math.round((yDone / yTotal) * 100) : 0;

    let yContentHtml = '';
    if (yTotal === 0) {
      yContentHtml = `
        <div class="empty-card" style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 18px; text-align: center; margin: 10px 0 16px 0;">
          <span style="font-size: 20px; vertical-align: middle; margin-right: 6px;">🏖️</span>
          <span class="empty-text" style="color: #64748b; font-size: 13px; font-weight: 600;">Hôm qua bạn không có nhiệm vụ nào được lên lịch.</span>
        </div>
      `;
    } else {
      const sortedYesterdayTasks = [...yesterdayTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pOrder = { high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 2) - (pOrder[a.priority] || 2);
      });

      yContentHtml = `
        <!-- Thống kê kết quả hôm qua: 3 cột đồng đều -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0 16px 0; table-layout: fixed;">
          <tr>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-yesterday-total stat-box" style="background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-yesterday-total stat-label" style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">HÔM QUA</div>
                <div class="stat-num-yesterday-total stat-num" style="font-size: 22px; font-weight: 900; color: #1e293b; margin-top: 3px; line-height: 1.1;">${yTotal}</div>
              </div>
            </td>
            <td width="3.5%">&nbsp;</td>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-done stat-box" style="background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-done stat-label" style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">ĐÃ XONG</div>
                <div class="stat-num-done stat-num" style="font-size: 22px; font-weight: 900; color: #065f46; margin-top: 3px; line-height: 1.1;">${yDone}</div>
              </div>
            </td>
            <td width="3.5%">&nbsp;</td>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-missed stat-box" style="background-color: ${yMissed > 0 ? '#fffbeb' : '#f8fafc'}; border: 1.5px solid ${yMissed > 0 ? '#fcd34d' : '#e2e8f0'}; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-missed stat-label" style="font-size: 10px; font-weight: 800; color: ${yMissed > 0 ? '#b45309' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">CHƯA XONG</div>
                <div class="stat-num-missed stat-num" style="font-size: 22px; font-weight: 900; color: ${yMissed > 0 ? '#92400e' : '#475569'}; margin-top: 3px; line-height: 1.1;">${yMissed}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Danh sách chi tiết nhiệm vụ hôm qua -->
        <div style="margin-bottom: 6px;">
          ${sortedYesterdayTasks.map(t => renderTaskCard(t, parentTasksMap, { isYesterday: true })).join('')}
        </div>
      `;
    }

    yesterdaySectionHtml = `
      <!-- KHỐI 1: CHỐT KẾT QUẢ CÔNG VIỆC HÔM QUA -->
      <div style="margin-top: 20px;">
        <div class="section-banner-yesterday" style="padding: 9px 12px; background-color: #f1f5f9; border-left: 4px solid #64748b; border-radius: 8px; margin-bottom: 12px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" style="vertical-align: middle;">
                <span class="section-title-yesterday" style="font-size: 12.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.4px;">
                  📊 Kết quả hôm qua
                </span>
              </td>
              <td align="right" style="vertical-align: middle; white-space: nowrap;">
                <span class="section-date-yesterday" style="font-size: 11px; font-weight: 700; color: #64748b;">
                  ${escapeHtml(yesterdayFormattedDate)}
                </span>
              </td>
            </tr>
          </table>
        </div>
        ${yContentHtml}
      </div>

      <!-- Đường kẻ phân cách giữa Hôm qua và Hôm nay -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0 20px 0;">
        <tr>
          <td style="border-bottom: 2px dashed #cbd5e1; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
        </tr>
      </table>
    `;
  }

  // KHỐI 2: KẾ HOẠCH NHIỆM VỤ HÔM NAY
  let todaySectionHtml = '';
  const todayHeaderTitle = isMorning
    ? '🎯 Nhiệm vụ hôm nay'
    : '🌙 Tổng kết hôm nay';

  if (totalTasks === 0) {
    todaySectionHtml = `
      <div style="margin-top: ${isMorning ? '0' : '16px'};">
        <div class="section-banner-today" style="padding: 9px 12px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px; margin-bottom: 12px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" style="vertical-align: middle;">
                <span class="section-title-today" style="font-size: 12.5px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.4px;">
                  ${todayHeaderTitle}
                </span>
              </td>
              <td align="right" style="vertical-align: middle; white-space: nowrap;">
                <span class="section-date-today" style="font-size: 11px; font-weight: 700; color: #3b82f6;">
                  ${escapeHtml(formattedDate)}
                </span>
              </td>
            </tr>
          </table>
        </div>
        <div class="empty-card" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 28px 16px; text-align: center; margin: 12px 0;">
          <div style="font-size: 36px; margin-bottom: 10px;">🏖️</div>
          <h3 class="empty-title" style="margin: 0 0 6px 0; color: #0f172a; font-size: 17px; font-weight: 700;">Hôm nay không có nhiệm vụ nào cả!</h3>
          <p class="empty-text" style="margin: 0; color: #475569; font-size: 13.5px; line-height: 1.5;">
            ${isMorning 
              ? 'Bạn không có task nào được lên lịch cho ngày hôm nay. Hãy tận hưởng ngày nghỉ hoặc click vào nút bên dưới để lên kế hoạch mới.' 
              : 'Toàn bộ ngày hôm nay bạn không có nhiệm vụ nào tồn đọng. Chúc bạn có một buổi tối thật thư giãn và nạp đầy năng lượng!'}
          </p>
        </div>
      </div>
    `;
  } else {
    todaySectionHtml = `
      <div style="margin-top: ${isMorning ? '0' : '16px'};">
        <div class="section-banner-today" style="padding: 9px 12px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px; margin-bottom: 12px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" style="vertical-align: middle;">
                <span class="section-title-today" style="font-size: 12.5px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.4px;">
                  ${todayHeaderTitle}
                </span>
              </td>
              <td align="right" style="vertical-align: middle; white-space: nowrap;">
                <span class="section-date-today" style="font-size: 11px; font-weight: 700; color: #3b82f6;">
                  ${escapeHtml(formattedDate)}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Thống kê nhanh hôm nay -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0 16px 0; table-layout: fixed;">
          <tr>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-total stat-box" style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-total stat-label" style="font-size: 10px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">TỔNG TASK</div>
                <div class="stat-num-total stat-num" style="font-size: 22px; font-weight: 900; color: #1e3a8a; margin-top: 3px; line-height: 1.1;">${totalTasks}</div>
              </div>
            </td>
            <td width="3.5%">&nbsp;</td>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-done stat-box" style="background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-done stat-label" style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">ĐÃ XONG</div>
                <div class="stat-num-done stat-num" style="font-size: 22px; font-weight: 900; color: #065f46; margin-top: 3px; line-height: 1.1;">${completedCount}</div>
              </div>
            </td>
            <td width="3.5%">&nbsp;</td>
            <td width="31%" align="center" style="vertical-align: top;">
              <div class="stat-card-high stat-box" style="background-color: #fff1f2; border: 1.5px solid #fda4af; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                <div class="stat-label-high stat-label" style="font-size: 10px; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">ƯU TIÊN</div>
                <div class="stat-num-high stat-num" style="font-size: 22px; font-weight: 900; color: #9f1239; margin-top: 3px; line-height: 1.1;">${highPriorityCount}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Danh sách chi tiết các thẻ Task hôm nay -->
        <div style="margin-top: 12px;">
          ${sortedTodayTasks.map(t => renderTaskCard(t, parentTasksMap, { isYesterday: false })).join('')}
        </div>
      </div>
    `;
  }

  // Khung HTML Email chuẩn với hỗ trợ Dark Mode & iPhone Mobile Frame tối ưu
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${escapeHtml(headerTitle)}</title>
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }

        /* 1. Mobile Responsive: iPhone & Android frame optimization */
        @media only screen and (max-width: 600px) {
          .email-table { padding: 8px 4px !important; }
          .main-card { border-radius: 14px !important; }
          .header-td { padding: 22px 14px !important; }
          .header-title { font-size: 18px !important; line-height: 1.35 !important; }
          .header-date { font-size: 12.5px !important; }
          .content-td { padding: 16px 10px !important; }
          .content-text { font-size: 14px !important; line-height: 1.5 !important; margin-bottom: 12px !important; }
          .stat-box { min-height: 56px !important; padding: 8px 2px !important; border-radius: 10px !important; }
          .stat-label { font-size: 9px !important; letter-spacing: 0.2px !important; }
          .stat-num { font-size: 20px !important; margin-top: 2px !important; }
          .task-card { padding: 11px 11px !important; margin-bottom: 9px !important; border-radius: 10px !important; }
          .task-title { font-size: 14px !important; line-height: 1.35 !important; }
          .task-title-done { font-size: 14px !important; line-height: 1.35 !important; }
          .cta-button { font-size: 13.5px !important; padding: 12px 14px !important; }
          .footer-td { padding: 16px 12px !important; }
        }

        /* 2. Chuẩn Dark Mode (Apple Mail, iOS, Outlook Dark, WebKit) */
        @media (prefers-color-scheme: dark) {
          .email-bg { background-color: #0b0f19 !important; }
          .main-card { background-color: #111827 !important; border-color: #1f2937 !important; }
          .content-text { color: #f3f4f6 !important; }
          
          .header-td {
            background-color: #1e40af !important;
            background: linear-gradient(135deg, #1e40af 0%, #172554 100%) !important;
          }
          .force-white, .force-white * {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }
          .header-title { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
          .header-date { color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; }
          .header-pill {
            background-color: rgba(0, 0, 0, 0.35) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
          }
          .header-pill span { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }

          .section-banner-yesterday { background-color: #1e293b !important; border-color: #64748b !important; }
          .section-title-yesterday { color: #e2e8f0 !important; }
          .section-date-yesterday { color: #94a3b8 !important; }
          
          .section-banner-today { background-color: #172554 !important; border-color: #3b82f6 !important; }
          .section-title-today { color: #bfdbfe !important; }
          .section-date-today { color: #60a5fa !important; }

          .stat-card-yesterday-total { background-color: #1e293b !important; border-color: #475569 !important; }
          .stat-label-yesterday-total { color: #94a3b8 !important; }
          .stat-num-yesterday-total { color: #f1f5f9 !important; }

          .stat-card-missed { background-color: #451a03 !important; border-color: #d97706 !important; }
          .stat-label-missed { color: #fcd34d !important; }
          .stat-num-missed { color: #fef3c7 !important; }

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
          
          .tag-badge { background-color: #1e293b !important; border-color: #475569 !important; color: #93c5fd !important; }
          .badge-done { background-color: #064e3b !important; border-color: #059669 !important; color: #6ee7b7 !important; }
          .badge-missed { background-color: #451a03 !important; border-color: #d97706 !important; color: #fcd34d !important; }
          .badge-priority { background-color: #4c0519 !important; border-color: #e11d48 !important; color: #fda4af !important; }
          .badge-doc { background-color: #172554 !important; border-color: #2563eb !important; color: #93c5fd !important; }
          .badge-replan { background-color: #2e1065 !important; border-color: #7c3aed !important; color: #c4b5fd !important; }
          .yesterday-tip { color: #fbbf24 !important; }

          .task-note-box { background-color: #111827 !important; border-color: #374151 !important; color: #d1d5db !important; }
          .task-note-label { color: #93c5fd !important; }
          
          .cta-button {
            background-color: #3b82f6 !important;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }

          .footer-bg { background-color: #0b0f19 !important; border-color: #1f2937 !important; }
          .footer-text { color: #9ca3af !important; }
          .empty-card { background-color: #1f2937 !important; border-color: #374151 !important; }
          .empty-title { color: #f9fafb !important; }
          .empty-text { color: #9ca3af !important; }
        }

        /* 3. Gmail iOS App Dark Mode targeting */
        u + .body .force-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        u + .body .header-title { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        u + .body .header-date { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        u + .body .header-pill span { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        u + .body .cta-button { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }

        [data-ogsc] .force-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .header-title { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .header-date { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .header-pill span { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .content-text { color: #f3f4f6 !important; }
        [data-ogsc] .section-title-yesterday { color: #e2e8f0 !important; }
        [data-ogsc] .section-date-yesterday { color: #94a3b8 !important; }
        [data-ogsc] .section-title-today { color: #bfdbfe !important; }
        [data-ogsc] .section-date-today { color: #60a5fa !important; }
        [data-ogsc] .stat-label-yesterday-total { color: #94a3b8 !important; }
        [data-ogsc] .stat-num-yesterday-total { color: #f1f5f9 !important; }
        [data-ogsc] .stat-label-missed { color: #fcd34d !important; }
        [data-ogsc] .stat-num-missed { color: #fef3c7 !important; }
        [data-ogsc] .stat-label-total { color: #93c5fd !important; }
        [data-ogsc] .stat-num-total { color: #bfdbfe !important; }
        [data-ogsc] .stat-label-done { color: #6ee7b7 !important; }
        [data-ogsc] .stat-num-done { color: #a7f3d0 !important; }
        [data-ogsc] .stat-label-high { color: #fda4af !important; }
        [data-ogsc] .stat-num-high { color: #fecdd3 !important; }
        [data-ogsc] .task-title { color: #f9fafb !important; }
        [data-ogsc] .task-title-done { color: #9ca3af !important; }
        [data-ogsc] .tag-badge { background-color: #1e293b !important; color: #93c5fd !important; }
        [data-ogsc] .badge-done { background-color: #064e3b !important; color: #6ee7b7 !important; }
        [data-ogsc] .badge-missed { background-color: #451a03 !important; color: #fcd34d !important; }
        [data-ogsc] .badge-priority { background-color: #4c0519 !important; color: #fda4af !important; }
        [data-ogsc] .badge-doc { background-color: #172554 !important; color: #93c5fd !important; }
        [data-ogsc] .badge-replan { background-color: #2e1065 !important; color: #c4b5fd !important; }
        [data-ogsc] .yesterday-tip { color: #fbbf24 !important; }
        [data-ogsc] .task-note-box { color: #d1d5db !important; }
        [data-ogsc] .task-note-label { color: #93c5fd !important; }
        [data-ogsc] .cta-button { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .footer-text { color: #9ca3af !important; }

        [data-ogsb] .header-td { background-color: #1e40af !important; }
        [data-ogsb] .header-pill { background-color: rgba(0, 0, 0, 0.35) !important; }
        [data-ogsb] .section-banner-yesterday { background-color: #1e293b !important; }
        [data-ogsb] .section-banner-today { background-color: #172554 !important; }
        [data-ogsb] .stat-card-yesterday-total { background-color: #1e293b !important; }
        [data-ogsb] .stat-card-missed { background-color: #451a03 !important; }
        [data-ogsb] .stat-card-total { background-color: #172554 !important; }
        [data-ogsb] .stat-card-done { background-color: #064e3b !important; }
        [data-ogsb] .stat-card-high { background-color: #4c0519 !important; }
        [data-ogsb] .task-card { background-color: #1f2937 !important; }
        [data-ogsb] .tag-badge { background-color: #1e293b !important; }
        [data-ogsb] .badge-done { background-color: #064e3b !important; }
        [data-ogsb] .badge-missed { background-color: #451a03 !important; }
        [data-ogsb] .badge-priority { background-color: #4c0519 !important; }
        [data-ogsb] .badge-doc { background-color: #172554 !important; }
        [data-ogsb] .badge-replan { background-color: #2e1065 !important; }
        [data-ogsb] .task-note-box { background-color: #111827 !important; }
        [data-ogsb] .cta-button { background-color: #2563eb !important; }
      </style>
    </head>
    <body class="email-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 8px;" class="email-bg email-table">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header Gradient -->
              <tr>
                <td bgcolor="#1d4ed8" class="header-td" style="background-color: #1d4ed8; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 26px 20px; text-align: center;">
                  <div style="margin-bottom: 10px;">
                    <img src="${appUrl}/logo/logo_idv_planner.png" width="46" height="46" alt="Logo" style="width: 46px; height: 46px; border-radius: 12px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.4); background-color: #ffffff;" />
                  </div>
                  <div class="header-pill" style="display: inline-block; background-color: #172554; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.35); border-radius: 12px; padding: 5px 12px; margin-bottom: 10px;">
                    <span class="force-white" style="font-size: 10.5px; font-weight: 800; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; letter-spacing: 1px; text-transform: uppercase;">STUDY &amp; LIFE PLANNER</span>
                  </div>
                  <h1 class="header-title force-white" style="margin: 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 21px; font-weight: 800; line-height: 1.35;">${escapeHtml(headerTitle)}</h1>
                  <p class="header-date force-white" style="margin: 7px 0 0 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; opacity: 0.95; font-size: 13.5px; font-weight: 600;">
                    <span class="force-white" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;">${escapeHtml(formattedDate)}</span>
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td class="content-td" style="padding: 24px 18px;">
                  <p class="content-text" style="margin: 0 0 14px 0; color: #0f172a; font-size: 14.5px; line-height: 1.6;">
                    ${greeting}
                  </p>

                  ${yesterdaySectionHtml}

                  ${todaySectionHtml}

                  <!-- Call to action button -->
                  <div style="text-align: center; margin: 28px 0 14px 0;">
                    <a href="${appUrl}" target="_blank" class="cta-button force-white" style="display: block; width: 100%; max-width: 320px; margin: 0 auto; box-sizing: border-box; text-align: center; background-color: #2563eb; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 13.5px; font-weight: 700; text-decoration: none; padding: 13px 18px; border-radius: 12px; box-shadow: 0 3px 12px rgba(37,99,235,0.35);">
                      🚀 Mở ứng dụng Study &amp; Life Planner
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-bg footer-td" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 18px; text-align: center;">
                  <p class="footer-text" style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                    Email này được gửi tự động bởi hệ thống nhắc việc Study &amp; Life Planner qua GitHub Actions.
                  </p>
                  <p class="footer-text" style="margin: 0; font-size: 11px; color: #94a3b8;">
                    Thời gian: ${getVietnamNow().toLocaleTimeString('vi-VN')} • Múi giờ Việt Nam (ICT)
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 6. Hàm xử lý chính (Main Workflow)
async function main() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU CHẠY REMINDER STUDY & LIFE PLANNER');
  const vnNow = getVietnamNow();
  const todayStr = getTodayStrVietnam();
  const formattedDate = formatVietnameseDate(vnNow);
  const yesterdayDate = getYesterdayDateVietnam();
  const yesterdayStr = getYesterdayStrVietnam();
  const yesterdayFormattedDate = formatVietnameseDate(yesterdayDate);
  const shift = getReminderShift();
  const appUrl = process.env.APP_URL || 'https://dungtm.github.io/study-idv-planning';

  console.log(`⏰ Thời gian: ${formattedDate} (${vnNow.toLocaleTimeString('vi-VN')})`);
  console.log(`📌 Ca nhắc việc: ${shift.toUpperCase()} (Hôm nay: ${todayStr} | Hôm qua: ${yesterdayStr})`);
  console.log(`🔗 App URL: ${appUrl}`);
  console.log('========================================================');

  // Khởi tạo Firestore và Email Transporter
  const db = initFirebase();
  const transporter = createEmailTransporter();

  // Kiểm tra kết nối SMTP
  try {
    await transporter.verify();
    console.log('✅ Kết nối Email SMTP thành công và sẵn sàng gửi!');
  } catch (err) {
    console.error('❌ Lỗi kết nối Email SMTP:', err.message);
    throw err;
  }

  // 1. Quét toàn bộ người dùng trong collection 'users'
  const usersSnapshot = await db.collection('users').get();
  console.log(`👥 Tìm thấy ${usersSnapshot.size} tài khoản trong hệ thống.`);

  if (usersSnapshot.empty) {
    console.log('⚠️ Không có người dùng nào trong Firestore để gửi thông báo.');
    return;
  }

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const user = { uid: userDoc.id, ...userDoc.data() };
    const email = user.email;

    if (!email) {
      console.log(`⏩ Bỏ qua User ${user.uid}: Chưa có email.`);
      skippedCount++;
      continue;
    }

    // Kiểm tra cài đặt nhắc nhở của user
    const settings = user.remindSettings || { enabled: true, morning: true, evening: true };
    if (settings.enabled === false) {
      console.log(`⏩ Bỏ qua User ${email}: Đã tắt tính năng nhắc nhở.`);
      skippedCount++;
      continue;
    }
    if (shift === 'morning' && settings.morning === false) {
      console.log(`⏩ Bỏ qua User ${email}: Đã tắt ca sáng 6h.`);
      skippedCount++;
      continue;
    }
    if (shift === 'evening' && settings.evening === false) {
      console.log(`⏩ Bỏ qua User ${email}: Đã tắt ca tối 18h.`);
      skippedCount++;
      continue;
    }

    try {
      // 2. Lấy danh sách task của user trong ngày hôm nay
      const tasksSnapshot = await db
        .collection('users')
        .doc(user.uid)
        .collection('tasks')
        .where('date', '==', todayStr)
        .get();

      const tasks = [];
      tasksSnapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });

      // 2b. Lấy danh sách task của ngày hôm qua nếu là ca sáng
      let yesterdayTasks = [];
      if (shift === 'morning') {
        const yesterdaySnapshot = await db
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .where('date', '==', yesterdayStr)
          .get();

        yesterdaySnapshot.forEach(doc => {
          yesterdayTasks.push({ id: doc.id, ...doc.data() });
        });
      }

      // 3. Lấy danh sách Parent Tasks để map mã tag & màu sắc
      const parentTasksSnapshot = await db
        .collection('users')
        .doc(user.uid)
        .collection('parentTasks')
        .get();

      const parentTasksMap = {};
      parentTasksSnapshot.forEach(doc => {
        parentTasksMap[doc.id] = doc.data();
      });

      console.log(`\n📋 Người dùng ${email}: Hôm nay (${todayStr}) có ${tasks.length} task${shift === 'morning' ? ` | Hôm qua (${yesterdayStr}) có ${yesterdayTasks.length} task` : ''}`);

      // 4. Tạo nội dung email HTML
      const htmlContent = generateEmailHtml({
        user,
        shift,
        todayStr,
        formattedDate,
        yesterdayStr,
        yesterdayFormattedDate,
        tasks,
        yesterdayTasks,
        parentTasksMap,
        appUrl
      });

      let subject = '';
      if (shift === 'morning') {
        const yDone = yesterdayTasks.filter(t => t.completed).length;
        const yTotal = yesterdayTasks.length;
        const yInfo = yTotal > 0 ? `Hôm qua: ${yDone}/${yTotal} xong` : 'Hôm qua: 0 task';
        if (tasks.length > 0) {
          subject = `[Planner 6h Sáng] 🌅 ${tasks.length} nhiệm vụ hôm nay (${todayStr}) • ${yInfo}`;
        } else {
          subject = `[Planner 6h Sáng] 🏖️ Hôm nay không có task (${todayStr}) • ${yInfo}`;
        }
      } else {
        const completedCount = tasks.filter(t => t.completed).length;
        if (tasks.length > 0) {
          subject = `[Planner 18h Tối] 🌙 Tổng kết ngày: ${completedCount}/${tasks.length} nhiệm vụ hoàn thành (${todayStr})`;
        } else {
          subject = `[Planner 18h Tối] 🌙 Không có nhiệm vụ nào hôm nay (${todayStr})`;
        }
      }

      // 5. Gửi email
      const mailOptions = {
        from: `"Study & Life Planner" <${process.env.GMAIL_USER || 'no-reply@study-planner.app'}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Đã gửi email thành công đến ${email}! (Message ID: ${info.messageId})`);
      successCount++;
    } catch (err) {
      console.error(`❌ Gửi email thất bại cho ${email}:`, err.message);
      failCount++;
    }
  }

  console.log('\n========================================================');
  console.log(`🏁 HOÀN THÀNH: Gửi thành công: ${successCount} | Bỏ qua: ${skippedCount} | Thất bại: ${failCount}`);
  console.log('========================================================');
}

main().catch(err => {
  console.error('💥 Lỗi nghiêm trọng khi thực thi script:', err);
  process.exit(1);
});
