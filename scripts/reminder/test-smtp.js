/**
 * Script kiểm tra nhanh kết nối Gmail SMTP ngay trên máy tính của bạn
 * Cách chạy:
 *   cd scripts/reminder
 *   node test-smtp.js dia_chi_gmail mat_khau_16_chu_cai
 */
const nodemailer = require('nodemailer');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('⚠️ Thiếu tham số!');
  console.log('Cách dùng:');
  console.log('  node test-smtp.js your_email@gmail.com abcd efgh ijkl mnop');
  process.exit(1);
}

const cleanUser = email.trim();
const cleanPass = password.replace(/[^a-zA-Z]/g, '').toLowerCase();

console.log('====================================================');
console.log('🔍 KIỂM TRA XÁC THỰC GMAIL SMTP TRỰC TIẾP TỪ MÁY BẠN');
console.log('📧 Email:', cleanUser);
console.log('🔑 Mật khẩu ứng dụng đã lọc:', cleanPass);
console.log('📏 Độ dài mật khẩu:', cleanPass.length, cleanPass.length === 16 ? '(✅ Chuẩn 16 ký tự)' : '(❌ Sai độ dài!)');
console.log('====================================================');

async function test() {
  console.log('⏳ Đang gửi yêu cầu xác thực đến smtp.gmail.com...');

  // Thử nghiệm 1: Cổng 465 (SSL)
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanUser,
        pass: cleanPass
      }
    });
    await transporter465.verify();
    console.log('✅ KẾT QUẢ: Xác thực thành công 100% qua cổng 465 SSL!');
    return;
  } catch (err465) {
    console.warn('⚠️ Cổng 465 không thành công:', err465.message);
  }

  // Thử nghiệm 2: Cổng 587 (STARTTLS)
  try {
    console.log('⏳ Đang thử tiếp cổng 587 STARTTLS...');
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: cleanUser,
        pass: cleanPass
      }
    });
    await transporter587.verify();
    console.log('✅ KẾT QUẢ: Xác thực thành công 100% qua cổng 587 STARTTLS!');
    return;
  } catch (err587) {
    console.error('❌ Cổng 587 cũng thất bại:', err587.message);
  }

  console.log('\n💥 KẾT LUẬN: Google vẫn từ chối tài khoản này ngay cả khi kết nối từ chính IP máy bạn!');
}

test();
