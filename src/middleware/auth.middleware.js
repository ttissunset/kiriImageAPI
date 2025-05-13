const TokenUtil = require('../utils/token.util');
const logger = require('../utils/logger');

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

    // 从令牌中提取用户信息并存储到ctx.state.user中
    ctx.state.user = TokenUtil.extractUserInfo(decoded);

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

    // 检查用户是否为管理员
    const { user } = ctx.state;

    if (!user || !user.isAdmin) {
      logger.warn(`非管理员用户 ${user ? user.username : '未知用户'} 尝试访问管理员专用接口`);
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

module.exports = {
  auth,
  adminAuth
}; 