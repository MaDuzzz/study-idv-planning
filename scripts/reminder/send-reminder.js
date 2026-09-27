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

function formatVietnameseDate(dateObj) {
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = days[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  return `${dayName}, ngày ${day}/${month}/${year}`;
}

// 2. Xác định ca gửi (Sáng 7h / Chiều 18h)
function getReminderShift() {
  const explicit = (process.env.REMINDER_SHIFT || 'auto').toLowerCase();
  if (explicit === 'morning' || explicit === 'evening') {
    return explicit;
  }
  const vnHour = getVietnamNow().getHours();
  // Trước 13h trưa coi là ca sáng (7h), sau 13h trưa coi là ca chiều (18h)
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

// 5. Tạo Template HTML Email hiện đại, chuẩn Responsive & tương thích hoàn hảo Dark Mode
function generateEmailHtml({ user, shift, todayStr, formattedDate, tasks, parentTasksMap, appUrl }) {
  const isMorning = shift === 'morning';
  const completedCount = tasks.filter(t => t.completed).length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const totalTasks = tasks.length;

  const headerTitle = isMorning
    ? '🌅 Kế hoạch & Mục tiêu ngày mới'
    : '🌙 Tổng kết & Nhắc nhở buổi tối';

  const greeting = isMorning
    ? `Chào buổi sáng <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Dưới đây là danh sách nhiệm vụ đã lên lịch cho hôm nay:`
    : `Chào buổi tối <strong>${escapeHtml(user.displayName || 'bạn')}</strong>! Cùng điểm lại tiến độ hoàn thành các mục tiêu hôm nay nhé:`;

  // Render danh sách task
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
      <!-- Thống kê nhanh: Sử dụng table 3 cột cách đều nhau tuyệt đối trên mọi email client (Gmail, Outlook, iOS) -->
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

      <!-- Danh sách chi tiết các thẻ Task -->
      <div style="margin-top: 16px;">
        ${tasks.map((t) => {
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

  // Khung HTML Email chuẩn với hỗ trợ Dark Mode mạnh mẽ
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
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;" class="email-bg">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 24px; text-align: center;">
                  <div style="margin-bottom: 12px;">
                    <img src="${appUrl}/logo/logo_idv_planner.png" width="48" height="48" alt="Logo" style="width: 48px; height: 48px; border-radius: 14px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(0,0,0,0.18); border: 2px solid rgba(255,255,255,0.35); background-color: #ffffff;" />
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

              <!-- Body Content -->
              <tr>
                <td style="padding: 28px 24px;">
                  <p class="content-text" style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; line-height: 1.6;">
                    ${greeting}
                  </p>

                  ${tasksHtml}

                  <!-- Call to action button -->
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 12px; box-shadow: 0 3px 12px rgba(37,99,235,0.35);">
                      🚀 Mở ứng dụng Study & Life Planner
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-bg" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
                  <p class="footer-text" style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.4;">
                    Email này được gửi tự động bởi hệ thống nhắc việc Study & Life Planner qua GitHub Actions.
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
  const shift = getReminderShift();
  const appUrl = process.env.APP_URL || 'https://dungtm.github.io/study-idv-planning';

  console.log(`⏰ Thời gian: ${formattedDate} (${vnNow.toLocaleTimeString('vi-VN')})`);
  console.log(`📌 Ca nhắc việc: ${shift.toUpperCase()} (todayStr: ${todayStr})`);
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
      console.log(`⏩ Bỏ qua User ${email}: Đã tắt ca sáng 7h.`);
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

      console.log(`\n📋 Người dùng ${email}: Có ${tasks.length} task vào ngày ${todayStr}`);

      // 4. Tạo nội dung email HTML
      const htmlContent = generateEmailHtml({
        user,
        shift,
        todayStr,
        formattedDate,
        tasks,
        parentTasksMap,
        appUrl
      });

      const subject = shift === 'morning'
        ? (tasks.length > 0 
            ? `[Planner 7h Sáng] 🌅 ${tasks.length} nhiệm vụ cần hoàn thành hôm nay (${todayStr})`
            : `[Planner 7h Sáng] 🏖️ Hôm nay bạn không có nhiệm vụ nào cả (${todayStr})`)
        : (tasks.length > 0
            ? `[Planner 18h Tối] 🌙 Tổng kết ngày: ${tasks.filter(t => t.completed).length}/${tasks.length} nhiệm vụ hoàn thành (${todayStr})`
            : `[Planner 18h Tối] 🌙 Không có nhiệm vụ nào hôm nay (${todayStr})`);

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
