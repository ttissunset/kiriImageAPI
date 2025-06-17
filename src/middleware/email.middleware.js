const nodemailer = require('nodemailer');
const UAParser = require('ua-parser-js');

// 生成6位数字验证码
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 构建邮件HTML模板
const buildEmailHtml = (code, ip, browser, time) => {
  return `
    <div style="font-family: Arial, sans-serif">
      <div style="color: #7686dd;font-size:28px;font-weight: 700;margin:30px 0">KiriImage</div>
      <div style="font-size: 24px">Hi, Friend</div>
      <div style="color: #555;margin-top: 5px">以下是你的6位数字邮箱验证码:</div>
      <div style="background-color:#7686dd; color: #fff; padding: 10px 20px; font-size: 18px; margin-top: 5px;width:fit-content">
        ${code}
      </div>
      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="margin-top: 0; color: #333; font-size: 16px;">本次登录信息</h3>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
          <span style="font-weight: bold; color: #666; min-width: 100px;">登录时间：</span>
          <span style="color: #333; flex: 1; text-align: right;">${time}</span>
        </div>
                
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
          <span style="font-weight: bold; color: #666; min-width: 100px;">登录IP：</span>
          <span style="color: #333; flex: 1; text-align: right;">${ip}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0;">
          <span style="font-weight: bold; color: #666; min-width: 100px;">浏览器信息：</span>
          <span style="color: #333; flex: 1; text-align: right;">${browser}</span>
        </div>
      </div>
      <p style="color: #777; font-size: 12px;">注意: 泄露验证码可能导致您的账户处于危险状态。如果您从未请求发送邮箱验证码，请忽略此邮件。</p>
    </div>
  `;
};

const sendEmail = async (toEmail, subject, htmlContent) => {
  // Nodemailer配置
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // 您的SMTP主机
    port: process.env.EMAIL_PORT, // 您的SMTP端口
    auth: {
      user: process.env.EMAIL_USER, // 您的邮箱
      pass: process.env.EMAIL_PASS, // 您的邮箱密码或授权码
    },
  });

  try {
    await transporter.sendMail({
      from: `"KiriImage" <${process.env.EMAIL_USER}>`, // 发件人
      to: toEmail, // 收件人
      subject: subject, // 主题
      html: htmlContent, // HTML内容
    });
    return { success: true, message: '邮件发送成功' };
  } catch (error) {
    console.error('发送邮件失败:', error);
    return { success: false, message: '邮件发送失败', error: error.message };
  }
};

module.exports = { generateVerificationCode, buildEmailHtml, sendEmail, UAParser }; 