const TokenUtil = require('../utils/token.util');
const logger = require('../utils/logger');
const User = require('../model/user.model');
const { generateVerificationCode, buildEmailHtml, sendEmail, UAParser } = require('./email.middleware');

// 验证JWT令牌的中间件
const auth = async (ctx, next) => {
  try {
    // 获取请求头中的Authorization字段
    const authorization = ctx.headers.authorization;

    // 验证Authorization是否存在
    if (!authorization) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '未提供身份验证令牌'
      };
      return;
    }

    // 从Bearer Token中提取JWT
    const token = authorization.replace('Bearer ', '');

    // 验证Token
    const decoded = TokenUtil.verifyToken(token);

    if (!decoded) {
      // 令牌验证失败
      logger.warn(`Token验证失败`);
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '身份验证令牌无效或已过期'
      };
      return;
    }

    // 从令牌中提取基本用户信息（主要是ID）
    const basicUserInfo = TokenUtil.extractUserInfo(decoded);

    if (!basicUserInfo || !basicUserInfo.id) {
      logger.warn(`Token中没有包含有效的用户ID`);
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '身份验证令牌无效'
      };
      return;
    }

    // 从数据库获取最新的用户信息
    const user = await User.findOne({
      where: { id: basicUserInfo.id }
    });

    if (!user) {
      logger.warn(`ID为 ${basicUserInfo.id} 的用户不存在，可能已被删除`);
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '用户不存在或已被删除'
      };
      return;
    }

    // 排除密码等敏感信息
    const { password: _, ...userInfo } = user.dataValues;

    // 将最新的用户信息存储到ctx.state.user中
    ctx.state.user = userInfo;

    // 继续处理请求
    await next();
  } catch (error) {
    logger.error(`认证中间件错误: ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '服务器内部错误'
    };
  }
};

// 检查是否为管理员的中间件
const adminAuth = async (ctx, next) => {
  try {
    // 先验证用户是否已经登录
    await auth(ctx, async () => { });

    // 如果auth中间件已经返回了响应（例如，令牌无效），直接返回
    if (ctx.status !== 200 && ctx.body) {
      return;
    }

    // auth中间件已经从数据库获取了最新的用户信息
    const { user } = ctx.state;

    // 检查用户是否为管理员
    if (!user.isAdmin) {
      logger.warn(`非管理员用户 ${user.username} 尝试访问管理员专用接口`);
      ctx.status = 403;
      ctx.body = {
        code: 403,
        message: '权限不足，需要管理员权限'
      };
      return;
    }

    // 继续处理请求
    await next();
  } catch (error) {
    logger.error(`管理员权限验证错误: ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '服务器内部错误'
    };
  }
};

// 临时存储验证码，生产环境应替换为Redis等持久化存储
const verificationCodes = {};

/**
 * 发送邮箱验证码中间件
 * @param {Object} ctx - Koa上下文
 * @param {Function} next - 下一个中间件函数
 */
const sendVerificationCode = async (ctx, next) => {
  const { email } = ctx.request.body;

  if (!email) {
    ctx.status = 400;
    ctx.body = { code: -1, message: '缺少邮箱地址' };
    return;
  }

  const verificationCode = generateVerificationCode();

  // 获取用户IP和浏览器信息
  logger.info('Received headers:', ctx.headers);
  logger.info('ctx.request.ip:', ctx.request.ip);
  const ip = ctx.request.ip;
  const ua = ctx.headers['user-agent'];
  const parser = new UAParser();
  parser.setUA(ua);
  const browserInfo = parser.getBrowser().name + ' ' + parser.getBrowser().version;
  const now = new Date();
  const time = now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const htmlContent = buildEmailHtml(verificationCode, ip, browserInfo, time);

  const result = await sendEmail(email, '您的KiriImage邮箱验证码', htmlContent);

  if (result.success) {
    // 存储验证码和过期时间
    verificationCodes[email] = {
      code: verificationCode,
      expires: Date.now() + 5 * 60 * 1000, // 5分钟有效期
    };
    ctx.body = { code: 0, message: '验证码已发送，请查收邮件' };
  } else {
    ctx.status = 500;
    ctx.body = { code: -1, message: '验证码发送失败', detail: result.error };
  }

  await next();
};

/**
 * 验证邮箱验证码中间件
 * @param {Object} ctx - Koa上下文
 * @param {Function} next - 下一个中间件函数
 */
const verifyVerificationCode = async (ctx, next) => {
  const { email, code } = ctx.request.body;

  if (!email || !code) {
    ctx.status = 400;
    ctx.body = { code: -1, message: '缺少邮箱或验证码' };
    return;
  }

  const storedCodeInfo = verificationCodes[email];

  if (!storedCodeInfo) {
    ctx.status = 400;
    ctx.body = { code: -1, message: '请先获取验证码' };
    return;
  }

  if (Date.now() > storedCodeInfo.expires) {
    ctx.status = 400;
    ctx.body = { code: -1, message: '验证码已过期' };
    // 清除过期验证码
    delete verificationCodes[email];
    return;
  }

  if (storedCodeInfo.code !== code) {
    ctx.status = 400;
    ctx.body = { code: -1, message: '验证码不正确' };
    return;
  }

  // 验证成功后清除验证码
  delete verificationCodes[email];

  await next();
};

module.exports = { auth, adminAuth }; 