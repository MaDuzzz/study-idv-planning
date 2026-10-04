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

// 1b. Tính toán ranh giới tuần cũ và tuần mới (Múi giờ Việt Nam)
function getWeekBoundariesVietnam(vnNow = getVietnamNow()) {
  const dayOfWeek = vnNow.getDay(); // 0: Chủ nhật, 1: Thứ hai, ...
  
  // Tuần vừa qua: từ Thứ 2 đến Chủ nhật hôm nay
  const pastWeekEnd = new Date(vnNow);
  const pastWeekStart = new Date(vnNow);
  if (dayOfWeek === 0) { // Chủ nhật
    pastWeekStart.setDate(vnNow.getDate() - 6);
  } else {
    pastWeekStart.setDate(vnNow.getDate() - (dayOfWeek - 1));
  }
  
  // Tuần tiếp theo: từ Thứ 2 ngày mai đến Chủ nhật tuần sau
  const nextWeekStart = new Date(vnNow);
  if (dayOfWeek === 0) { // Chủ nhật -> ngày mai là Thứ 2 tuần mới
    nextWeekStart.setDate(vnNow.getDate() + 1);
  } else {
    nextWeekStart.setDate(vnNow.getDate() + (8 - dayOfWeek));
  }
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

  const formatDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    pastWeekStartStr: formatDateStr(pastWeekStart),
    pastWeekEndStr: formatDateStr(pastWeekEnd),
    nextWeekStartStr: formatDateStr(nextWeekStart),
    nextWeekEndStr: formatDateStr(nextWeekEnd),
    pastWeekStart,
    pastWeekEnd,
    nextWeekStart,
    nextWeekEnd
  };
}

// 2. Xác định ca gửi (Sáng ~6h / Chiều ~18h / Tối Chủ nhật ~20h30)
function getReminderShift() {
  const explicit = (process.env.REMINDER_SHIFT || 'auto').toLowerCase();
  if (explicit === 'morning' || explicit === 'evening' || explicit === 'weekly') {
    return explicit;
  }
  const vnNow = getVietnamNow();
  const vnHour = vnNow.getHours();
  const vnDay = vnNow.getDay(); // 0 là Chủ nhật

  // Tối Chủ Nhật từ 19h30 trở đi coi là ca nhắc lên kế hoạch tuần mới (weekly)
  if (vnDay === 0 && vnHour >= 19) {
    return 'weekly';
  }

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

// 7. Render thẻ nhiệm vụ tuần tới (gọn gàng, kèm ngày và nhãn)
function renderWeeklyTaskCard(t, parentTasksMap) {
  const parent = t.parentId ? parentTasksMap[t.parentId] : null;
  const parentTag = parent ? (parent.tag || parent.title.slice(0, 5).toUpperCase()) : '';
  const parentColor = (parent && parent.color) ? parent.color : '#7c3aed';
  const isHigh = t.priority === 'high';
  const priorityIcon = isHigh ? '🔥 ' : '📌 ';
  const borderLeft = isHigh ? 'border-left: 3.5px solid #ef4444;' : 'border-left: 3.5px solid #7c3aed;';

  // Định dạng ngày hiển thị (VD: '2026-10-05' -> 'T2 (05/10)')
  let dateBadge = '';
  if (t.date) {
    const parts = t.date.split('-');
    if (parts.length === 3) {
      dateBadge = `${parts[2]}/${parts[1]}`;
    }
  }

  return `
    <div class="weekly-task-card" style="background-color: #ffffff; border: 1px solid #e2e8f0; ${borderLeft} border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <div style="flex: 1;">
          <div class="task-title" style="font-size: 13.5px; font-weight: 700; color: #1e293b; line-height: 1.35; word-break: break-word;">
            ${priorityIcon}${escapeHtml(t.title)}
          </div>
          <div style="margin-top: 5px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${parentTag ? `
              <span class="tag-badge" style="font-family: monospace; font-size: 9.5px; font-weight: 800; background-color: #f1f5f9; color: ${parentColor}; border: 1px solid #cbd5e1; border-radius: 5px; padding: 2px 6px; display: inline-block;">
                [${escapeHtml(parentTag)}]
              </span>
            ` : ''}
            ${isHigh ? `
              <span class="badge-priority" style="font-size: 9.5px; font-weight: 800; background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecdd3; border-radius: 5px; padding: 2px 6px; display: inline-block;">
                🔥 Ưu tiên cao
              </span>
            ` : ''}
          </div>
        </div>
        ${dateBadge ? `
          <div style="text-align: right;">
            <span class="weekly-date-badge" style="font-size: 10px; font-weight: 800; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 7px; display: inline-block; white-space: nowrap;">
              📅 ${dateBadge}
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// 8. Tạo Template HTML Email Lời nhắc Lên kế hoạch tuần mới tối Chủ nhật
function generateWeeklyEmailHtml({ user, formattedDate, pastWeekSummary, nextWeekSummary, parentTasksMap, appUrl }) {
  const headerTitle = '🌿 Lời nhắc Lên kế hoạch tuần\u00A0mới';
  const previewTasks = nextWeekSummary.tasks.slice(0, 6);
  const remainingCount = nextWeekSummary.tasks.length - previewTasks.length;

  const formatShortRange = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const s = startStr.split('-');
    const e = endStr.split('-');
    if (s.length === 3 && e.length === 3) {
      return `${s[2]}/${s[1]} → ${e[2]}/${e[1]}`;
    }
    return `${startStr} → ${endStr}`;
  };

  const headerDateStr = formattedDate.includes('Chủ nhật')
    ? formattedDate.replace('Chủ nhật', 'Tối Chủ nhật')
    : `Tối, ${formattedDate}`;

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

        /* 1. Mobile Responsive cho iPhone & thiết bị di động */
        @media only screen and (max-width: 600px) {
          .email-table { padding: 8px 4px !important; }
          .main-card { border-radius: 14px !important; }
          .header-td { padding: 22px 14px !important; }
          .header-title { font-size: 18px !important; line-height: 1.35 !important; }
          .header-date { font-size: 12px !important; }
          .content-td { padding: 16px 10px !important; }
          .content-text { font-size: 14px !important; line-height: 1.55 !important; margin-bottom: 12px !important; }
          .quote-card { padding: 12px 12px !important; margin: 14px 0 16px 0 !important; }
          .quote-text { font-size: 13px !important; }
          .stat-box { min-height: 56px !important; padding: 8px 2px !important; border-radius: 10px !important; }
          .stat-label { font-size: 9px !important; letter-spacing: 0.2px !important; }
          .stat-num { font-size: 20px !important; margin-top: 2px !important; }
          .weekly-task-card { padding: 9px 10px !important; margin-bottom: 7px !important; }
          .tips-box { padding: 12px 12px !important; }
          .tips-item { font-size: 12px !important; }
          .cta-button { font-size: 13.5px !important; padding: 12px 14px !important; }
          .footer-td { padding: 16px 12px !important; }
        }

        /* 2. Dark Mode hoàn hảo cho Apple Mail, Outlook Dark, Android & Gmail */
        @media (prefers-color-scheme: dark) {
          .email-bg { background-color: #0b0f19 !important; }
          .main-card { background-color: #111827 !important; border-color: #1f2937 !important; }
          .content-text { color: #f3f4f6 !important; }

          .header-td {
            background-color: #3730a3 !important;
            background: linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%) !important;
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

          .quote-card {
            background-color: #2e1065 !important;
            border-color: #7c3aed !important;
          }
          .quote-text { color: #d8b4fe !important; }

          .section-banner-past { background-color: #1e293b !important; border-color: #64748b !important; }
          .section-title-past { color: #e2e8f0 !important; }
          .section-date-past { color: #94a3b8 !important; }

          .section-banner-next { background-color: #2e1065 !important; border-color: #7c3aed !important; }
          .section-title-next { color: #d8b4fe !important; }
          .section-date-next { color: #c4b5fd !important; }

          .stat-card-past-total { background-color: #1e293b !important; border-color: #475569 !important; }
          .stat-label-past-total { color: #94a3b8 !important; }
          .stat-num-past-total { color: #f1f5f9 !important; }

          .stat-card-done { background-color: #064e3b !important; border-color: #10b981 !important; }
          .stat-label-done { color: #6ee7b7 !important; }
          .stat-num-done { color: #a7f3d0 !important; }

          .stat-card-missed { background-color: #451a03 !important; border-color: #d97706 !important; }
          .stat-label-missed { color: #fcd34d !important; }
          .stat-num-missed { color: #fef3c7 !important; }

          .empty-plan-card {
            background-color: #451a03 !important;
            border-color: #d97706 !important;
          }
          .empty-plan-title { color: #fde68a !important; }
          .empty-plan-text { color: #fcd34d !important; }

          .weekly-task-card {
            background-color: #1f2937 !important;
            border-color: #374151 !important;
          }
          .task-title { color: #f9fafb !important; }
          .weekly-date-badge {
            background-color: #111827 !important;
            border-color: #374151 !important;
            color: #cbd5e1 !important;
          }
          .tag-badge {
            background-color: #1e293b !important;
            border-color: #475569 !important;
            color: #c4b5fd !important;
          }
          .badge-priority {
            background-color: #4c0519 !important;
            border-color: #e11d48 !important;
            color: #fda4af !important;
          }

          .tips-box {
            background-color: #111827 !important;
            border-color: #374151 !important;
          }
          .tips-header { color: #d8b4fe !important; }
          .tips-item { color: #cbd5e1 !important; }
          .tips-item strong { color: #a78bfa !important; }

          .cta-button {
            background-color: #7c3aed !important;
            background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%) !important;
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
          }

          .footer-bg { background-color: #0b0f19 !important; border-color: #1f2937 !important; }
          .footer-text { color: #9ca3af !important; }
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
        [data-ogsc] .quote-text { color: #d8b4fe !important; }
        [data-ogsc] .section-title-past { color: #e2e8f0 !important; }
        [data-ogsc] .section-date-past { color: #94a3b8 !important; }
        [data-ogsc] .section-title-next { color: #d8b4fe !important; }
        [data-ogsc] .section-date-next { color: #c4b5fd !important; }
        [data-ogsc] .stat-label-past-total { color: #94a3b8 !important; }
        [data-ogsc] .stat-num-past-total { color: #f1f5f9 !important; }
        [data-ogsc] .stat-label-done { color: #6ee7b7 !important; }
        [data-ogsc] .stat-num-done { color: #a7f3d0 !important; }
        [data-ogsc] .stat-label-missed { color: #fcd34d !important; }
        [data-ogsc] .stat-num-missed { color: #fef3c7 !important; }
        [data-ogsc] .empty-plan-title { color: #fde68a !important; }
        [data-ogsc] .empty-plan-text { color: #fcd34d !important; }
        [data-ogsc] .task-title { color: #f9fafb !important; }
        [data-ogsc] .tag-badge { background-color: #1e293b !important; color: #c4b5fd !important; }
        [data-ogsc] .badge-priority { background-color: #4c0519 !important; color: #fda4af !important; }
        [data-ogsc] .tips-header { color: #d8b4fe !important; }
        [data-ogsc] .tips-item { color: #cbd5e1 !important; }
        [data-ogsc] .tips-item strong { color: #a78bfa !important; }
        [data-ogsc] .cta-button { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
        [data-ogsc] .footer-text { color: #9ca3af !important; }

        [data-ogsb] .header-td { background-color: #3730a3 !important; }
        [data-ogsb] .header-pill { background-color: rgba(0, 0, 0, 0.35) !important; }
        [data-ogsb] .quote-card { background-color: #2e1065 !important; }
        [data-ogsb] .section-banner-past { background-color: #1e293b !important; }
        [data-ogsb] .section-banner-next { background-color: #2e1065 !important; }
        [data-ogsb] .stat-card-past-total { background-color: #1e293b !important; }
        [data-ogsb] .stat-card-done { background-color: #064e3b !important; }
        [data-ogsb] .stat-card-missed { background-color: #451a03 !important; }
        [data-ogsb] .empty-plan-card { background-color: #451a03 !important; }
        [data-ogsb] .weekly-task-card { background-color: #1f2937 !important; }
        [data-ogsb] .tag-badge { background-color: #1e293b !important; }
        [data-ogsb] .badge-priority { background-color: #4c0519 !important; }
        [data-ogsb] .tips-box { background-color: #111827 !important; }
        [data-ogsb] .cta-button { background-color: #7c3aed !important; }
      </style>
    </head>
    <body class="email-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 8px;" class="email-bg email-table">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header Gradient (Tím Indigo thư giãn & truyền cảm hứng) -->
              <tr>
                <td bgcolor="#4338ca" class="header-td" style="background-color: #4338ca; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 26px 20px; text-align: center;">
                  <div style="margin-bottom: 10px;">
                    <img src="${appUrl}/logo/logo_idv_planner.png" width="46" height="46" alt="Logo" style="width: 46px; height: 46px; border-radius: 12px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.4); background-color: #ffffff;" />
                  </div>
                  <div class="header-pill" style="display: inline-block; background-color: #312e81; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.35); border-radius: 12px; padding: 5px 12px; margin-bottom: 10px;">
                    <span class="force-white" style="font-size: 10.5px; font-weight: 800; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; letter-spacing: 1px; text-transform: uppercase;">✨ STUDY &amp; LIFE PLANNER</span>
                  </div>
                  <h1 class="header-title force-white" style="margin: 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 21px; font-weight: 800; line-height: 1.35;">${escapeHtml(headerTitle)}</h1>
                  <p class="header-date force-white" style="margin: 7px 0 0 0; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; opacity: 0.95; font-size: 13.5px; font-weight: 600;">
                    <span class="force-white" style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;">${escapeHtml(headerDateStr)} • Khởi đầu tuần mới chủ động</span>
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td class="content-td" style="padding: 24px 18px;">
                  <!-- Lời chúc & thông điệp chính -->
                  <p class="content-text" style="margin: 0 0 14px 0; color: #0f172a; font-size: 14.5px; line-height: 1.65;">
                    Chào buổi tối <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Chúc bạn có một buổi tối Chủ nhật thật vui vẻ, ấm áp và thư giãn bên gia đình hoặc người thân nhé. 🍵
                  </p>
                  <p class="content-text" style="margin: 0 0 14px 0; color: #0f172a; font-size: 14.5px; line-height: 1.65;">
                    Chỉ còn vài giờ nữa là tuần mới sẽ bắt đầu. Nếu được, bạn hãy dành một chút thời gian thảnh thơi tối nay để <strong>lên kế hoạch làm việc cho tuần tiếp theo</strong> nhé. Khi các mục tiêu được sắp xếp trước, chúng ta sẽ luôn ở thế <strong>hoàn toàn chủ động trong công việc</strong>, tâm lý nhẹ nhàng và làm việc hiệu quả hơn rất nhiều.
                  </p>

                  <!-- Hộp thông điệp truyền cảm hứng (Quote) -->
                  <div class="quote-card" style="background-color: #f5f3ff; border: 1.5px solid #ddd6fe; border-left: 4px solid #7c3aed; border-radius: 12px; padding: 13px 15px; margin: 16px 0 20px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="vertical-align: top; font-size: 20px; line-height: 1;">🌱</td>
                        <td style="padding-left: 8px;">
                          <div class="quote-text" style="font-size: 13px; font-weight: 600; color: #5b21b6; line-height: 1.5; font-style: italic;">
                            &ldquo;Hãy cố gắng để ngày mai sẽ là một phiên bản tốt hơn của hôm nay. Mỗi kế hoạch rõ ràng tối nay là một bước đệm vững chắc cho tuần mới đầy tự tin và thành công.&rdquo;
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- KHỐI 1: ĐIỂM LẠI TUẦN VỪA QUA -->
                  <div style="margin-top: 18px;">
                    <div class="section-banner-past" style="padding: 9px 12px; background-color: #f1f5f9; border-left: 4px solid #64748b; border-radius: 8px; margin-bottom: 12px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left" style="vertical-align: middle;">
                            <span class="section-title-past" style="font-size: 12.5px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.4px;">
                              📊 Điểm lại tuần qua
                            </span>
                          </td>
                          <td align="right" style="vertical-align: middle; white-space: nowrap;">
                            <span class="section-date-past" style="font-size: 10.5px; font-weight: 700; color: #64748b;">
                              ${escapeHtml(formatShortRange(pastWeekSummary.startStr, pastWeekSummary.endStr))}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- 3 thẻ thống kê tuần qua -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 12px 0 14px 0; table-layout: fixed;">
                      <tr>
                        <td width="31%" align="center" style="vertical-align: top;">
                          <div class="stat-card-past-total stat-box" style="background-color: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                            <div class="stat-label-past-total stat-label" style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">TỔNG TUẦN</div>
                            <div class="stat-num-past-total stat-num" style="font-size: 22px; font-weight: 900; color: #1e293b; margin-top: 3px; line-height: 1.1;">${pastWeekSummary.total}</div>
                          </div>
                        </td>
                        <td width="3.5%">&nbsp;</td>
                        <td width="31%" align="center" style="vertical-align: top;">
                          <div class="stat-card-done stat-box" style="background-color: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                            <div class="stat-label-done stat-label" style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">ĐÃ XONG</div>
                            <div class="stat-num-done stat-num" style="font-size: 22px; font-weight: 900; color: #065f46; margin-top: 3px; line-height: 1.1;">${pastWeekSummary.done}</div>
                          </div>
                        </td>
                        <td width="3.5%">&nbsp;</td>
                        <td width="31%" align="center" style="vertical-align: top;">
                          <div class="stat-card-missed stat-box" style="background-color: ${pastWeekSummary.missed > 0 ? '#fffbeb' : '#f8fafc'}; border: 1.5px solid ${pastWeekSummary.missed > 0 ? '#fcd34d' : '#e2e8f0'}; border-radius: 12px; padding: 10px 4px; text-align: center; min-height: 58px; box-sizing: border-box;">
                            <div class="stat-label-missed stat-label" style="font-size: 10px; font-weight: 800; color: ${pastWeekSummary.missed > 0 ? '#b45309' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;">TỒN ĐỌNG</div>
                            <div class="stat-num-missed stat-num" style="font-size: 22px; font-weight: 900; color: ${pastWeekSummary.missed > 0 ? '#92400e' : '#475569'}; margin-top: 3px; line-height: 1.1;">${pastWeekSummary.missed}</div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="font-size: 12.5px; color: #64748b; margin-bottom: 18px; text-align: center;">
                      ${pastWeekSummary.done > 0
                        ? `👏 Bạn đã hoàn thành <strong>${pastWeekSummary.done}/${pastWeekSummary.total}</strong> nhiệm vụ trong tuần (${pastWeekSummary.percent}%). Rất tuyệt vời, hãy tiếp tục phát huy nhé!`
                        : (pastWeekSummary.total === 0 
                            ? 'Tuần vừa qua bạn chưa lưu nhiệm vụ nào trên hệ thống. Hãy ghi lại kế hoạch tuần mới để theo dõi tiến độ tốt hơn nhé.' 
                            : 'Đừng bận lòng nếu còn việc dang dở, tuần mới là một khởi đầu mới để bạn bứt phá!')}
                    </div>
                  </div>

                  <!-- Đường kẻ phân cách -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 18px 0 20px 0;">
                    <tr>
                      <td style="border-bottom: 2px dashed #cbd5e1; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- KHỐI 2: CHUẨN BỊ CHO TUẦN TỚI -->
                  <div>
                    <div class="section-banner-next" style="padding: 9px 12px; background-color: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 8px; margin-bottom: 12px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left" style="vertical-align: middle;">
                            <span class="section-title-next" style="font-size: 12.5px; font-weight: 800; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.4px;">
                              🎯 Kế hoạch tuần tới
                            </span>
                          </td>
                          <td align="right" style="vertical-align: middle; white-space: nowrap;">
                            <span class="section-date-next" style="font-size: 10.5px; font-weight: 700; color: #7c3aed;">
                              ${escapeHtml(formatShortRange(nextWeekSummary.startStr, nextWeekSummary.endStr))}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${nextWeekSummary.total === 0 ? `
                      <div class="empty-plan-card" style="background-color: #fffbeb; border: 1.5px dashed #fcd34d; border-radius: 12px; padding: 20px 16px; text-align: center; margin: 12px 0 16px 0;">
                        <div style="font-size: 34px; margin-bottom: 8px;">🗓️</div>
                        <div class="empty-plan-title" style="font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 6px;">Bạn chưa lên lịch nhiệm vụ nào cho tuần tới!</div>
                        <div class="empty-plan-text" style="font-size: 13px; color: #b45309; line-height: 1.5;">
                          Đừng để sáng thứ Hai bắt đầu trong vội vã. Hãy dành 5 phút ngay tối nay mở Planner để sắp xếp các mục tiêu ưu tiên nhất nhé!
                        </div>
                      </div>
                    ` : `
                      <div style="margin-bottom: 12px;">
                        <div style="font-size: 12.5px; font-weight: 700; color: #4b5563; margin-bottom: 8px;">
                          📋 Bạn đã lên lịch trước <strong>${nextWeekSummary.total}</strong> nhiệm vụ cho tuần tới:
                        </div>
                        ${previewTasks.map(t => renderWeeklyTaskCard(t, parentTasksMap)).join('')}
                        ${remainingCount > 0 ? `
                          <div style="text-align: center; font-size: 12px; color: #6b7280; font-weight: 600; margin-top: 6px;">
                            ... và còn ${remainingCount} nhiệm vụ khác
                          </div>
                        ` : ''}
                      </div>
                    `}
                  </div>

                  <!-- KHỐI 3: 3 GỢI Ý LÊN KẾ HOẠCH TUẦN NHANH GỌN -->
                  <div class="tips-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 13px 15px; margin: 18px 0 20px 0;">
                    <div class="tips-header" style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px;">
                      💡 3 Gợi ý lên kế hoạch tuần nhanh gọn:
                    </div>
                    <div class="tips-item" style="font-size: 12.5px; color: #334155; line-height: 1.55; margin-bottom: 5px;">
                      <strong style="color: #6d28d9;">1. Chọn 3 việc lớn:</strong> Xác định 3 mục tiêu trọng tâm nhất định phải hoàn thành trong tuần.
                    </div>
                    <div class="tips-item" style="font-size: 12.5px; color: #334155; line-height: 1.55; margin-bottom: 5px;">
                      <strong style="color: #6d28d9;">2. Rải đều theo ngày:</strong> Chia nhỏ nhiệm vụ vào các ngày Thứ 2 – Thứ 6 (khoảng 3–5 việc/ngày).
                    </div>
                    <div class="tips-item" style="font-size: 12.5px; color: #334155; line-height: 1.55;">
                      <strong style="color: #6d28d9;">3. Chừa 20% thời gian trống:</strong> Giữ khoảng đệm dự phòng cho những việc phát sinh đột xuất.
                    </div>
                  </div>

                  <!-- Call to action button -->
                  <div style="text-align: center; margin: 26px 0 12px 0;">
                    <a href="${appUrl}" target="_blank" class="cta-button force-white" style="display: block; width: 100%; max-width: 320px; margin: 0 auto; box-sizing: border-box; text-align: center; background-color: #7c3aed; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 13.5px; font-weight: 700; text-decoration: none; padding: 13px 18px; border-radius: 12px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
                      🚀 Mở Planner lên lịch tuần mới ngay
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
    const settings = user.remindSettings || { enabled: true, morning: true, evening: true, weekly: true };
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
    if (shift === 'weekly' && settings.weekly === false) {
      console.log(`⏩ Bỏ qua User ${email}: Đã tắt ca tối Chủ nhật nhắc lên kế hoạch tuần.`);
      skippedCount++;
      continue;
    }

    try {
      let tasks = [];
      let yesterdayTasks = [];
      let weeklyData = null;

      if (shift === 'weekly') {
        const weekBoundaries = getWeekBoundariesVietnam(vnNow);

        // 1. Quét task tuần vừa qua (từ Thứ 2 đến Chủ nhật hôm nay)
        const pastWeekSnapshot = await db
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .where('date', '>=', weekBoundaries.pastWeekStartStr)
          .where('date', '<=', weekBoundaries.pastWeekEndStr)
          .get();

        const pastTasks = [];
        pastWeekSnapshot.forEach(doc => pastTasks.push({ id: doc.id, ...doc.data() }));
        const pDone = pastTasks.filter(t => t.completed).length;
        const pTotal = pastTasks.length;

        // 2. Quét task tuần tới (từ Thứ 2 ngày mai đến Chủ nhật tuần tới)
        const nextWeekSnapshot = await db
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .where('date', '>=', weekBoundaries.nextWeekStartStr)
          .where('date', '<=', weekBoundaries.nextWeekEndStr)
          .get();

        const nextTasks = [];
        nextWeekSnapshot.forEach(doc => nextTasks.push({ id: doc.id, ...doc.data() }));
        nextTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        weeklyData = {
          pastWeekSummary: {
            total: pTotal,
            done: pDone,
            missed: pTotal - pDone,
            percent: pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0,
            tasks: pastTasks,
            startStr: weekBoundaries.pastWeekStartStr,
            endStr: weekBoundaries.pastWeekEndStr
          },
          nextWeekSummary: {
            total: nextTasks.length,
            tasks: nextTasks,
            startStr: weekBoundaries.nextWeekStartStr,
            endStr: weekBoundaries.nextWeekEndStr
          }
        };

        console.log(`\n📋 Người dùng ${email}: Nhắc tuần mới (Tuần qua: ${pDone}/${pTotal} xong | Tuần tới: ${nextTasks.length} task đã lên lịch)`);
      } else {
        // 2. Lấy danh sách task của user trong ngày hôm nay
        const tasksSnapshot = await db
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .where('date', '==', todayStr)
          .get();

        tasksSnapshot.forEach(doc => {
          tasks.push({ id: doc.id, ...doc.data() });
        });

        // 2b. Lấy danh sách task của ngày hôm qua nếu là ca sáng
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

        console.log(`\n📋 Người dùng ${email}: Hôm nay (${todayStr}) có ${tasks.length} task${shift === 'morning' ? ` | Hôm qua (${yesterdayStr}) có ${yesterdayTasks.length} task` : ''}`);
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

      // 4. Tạo nội dung email HTML và tiêu đề
      let htmlContent = '';
      let subject = '';

      if (shift === 'weekly') {
        htmlContent = generateWeeklyEmailHtml({
          user,
          formattedDate,
          pastWeekSummary: weeklyData.pastWeekSummary,
          nextWeekSummary: weeklyData.nextWeekSummary,
          parentTasksMap,
          appUrl
        });

        const nextTotal = weeklyData.nextWeekSummary.total;
        if (nextTotal > 0) {
          subject = `[Planner Chủ Nhật] 🌿 Sẵn sàng cho tuần mới (${nextTotal} việc đã lên lịch) • Chúc bạn buổi tối an yên!`;
        } else {
          subject = `[Planner Chủ Nhật] 🌿 Chúc bạn buổi tối vui vẻ • Hãy lên kế hoạch cho tuần mới đầy hứng khởi! 🚀`;
        }
      } else {
        htmlContent = generateEmailHtml({
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
