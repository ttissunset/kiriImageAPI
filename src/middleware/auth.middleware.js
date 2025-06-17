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

module.exports = { auth, adminAuth }; 