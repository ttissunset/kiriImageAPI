const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../model/user.model");
const TokenUtil = require("../utils/token.util");
const logger = require("../utils/logger");
const statsController = require("./stats.controller");
const { generateVerificationCode, buildEmailHtml, sendEmail, UAParser } = require("../middleware/email.middleware");
const { verificationCodes } = require("../utils/verificationCodeStore");

/**
 * 异步记录登录信息，不阻塞主流程
 * @param {Object} ctx - Koa上下文
 * @param {Object} options - 记录选项
 */
const recordLoginAsync = (ctx, options) => {
  // 使用Promise包装，确保主流程不被阻塞
  process.nextTick(async () => {
    try {
      await statsController.recordLogin(ctx, options);
    } catch (error) {
      logger.error(`异步记录登录信息失败: ${error.message}`);
    }
  });
};

class UserController {
  // 用户注册
  async register(ctx) {
    try {
      const { username, password, email } = ctx.request.body;

      // 参数验证
      if (!username || !password || !email) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "用户名、密码和邮箱不能为空"
        };
        return;
      }

      // 检查用户名是否已存在
      const existUser = await User.findOne({
        where: { username }
      });
      if (existUser) {
        ctx.status = 409;
        ctx.body = {
          code: 409,
          message: "用户名已存在"
        };
        return;
      }

      // 检查邮箱是否已存在
      const existEmail = await User.findOne({
        where: { email }
      });
      if (existEmail) {
        ctx.status = 409;
        ctx.body = {
          code: 409,
          message: "邮箱已被使用"
        };
        return;
      }

      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 创建用户记录
      const newUser = await User.create({
        username,
        password: hashedPassword,
        email: email || null,
        avatar: "https://kirii.online/6.jpg.jpg" // 默认头像
      });

      // 生成token时排除敏感信息
      const { password: _, ...userInfo } = newUser.dataValues;

      logger.info(`用户注册成功: ${username}`);

      // 返回结果 - 不返回token
      ctx.status = 201;
      ctx.body = {
        code: 201,
        message: "注册成功，请登录",
        data: {
          user: userInfo
        }
      };

      // 注册时不记录信息
    } catch (err) {
      logger.error(`注册失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  // 发送登录验证码
  async sendVerificationCodeForLogin(ctx) {
    try {
      const { username } = ctx.request.body;

      if (!username) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '缺少用户名' };
        return;
      }

      const user = await User.findOne({ where: { username } });
      if (!user) {
        ctx.status = 404;
        ctx.body = { code: -1, message: '用户不存在' };
        return;
      }

      if (!user.email) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '该用户未绑定邮箱' };
        return;
      }

      const verificationCode = generateVerificationCode();
      const ip = ctx.request.ip;
      const ua = ctx.headers['user-agent'];
      const parser = new UAParser();
      parser.setUA(ua);
      const browserInfo = parser.getBrowser().name + ' ' + parser.getBrowser().version;
      const now = new Date();
      const time = now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const htmlContent = buildEmailHtml(verificationCode, ip, browserInfo, time);
      const result = await sendEmail(user.email, '您的KiriImage登录验证码', htmlContent);

      if (result.success) {
        verificationCodes[user.email] = {
          code: verificationCode,
          expires: Date.now() + 5 * 60 * 1000, // 5分钟有效期
        };
        ctx.body = { code: 200, message: '验证码已发送，请查收邮件' };
      } else {
        logger.error(`发送登录验证码失败到 ${user.email}: ${result.error}`);
        ctx.status = 500;
        ctx.body = { code: 400, message: '验证码发送失败', detail: result.error };
      }
    } catch (err) {
      logger.error(`发送登录验证码异常: ${err.message}`);
      ctx.status = 500;
      ctx.body = { code: 500, message: '服务器内部错误' };
    }
  }

  // 登录接口
  async login(ctx) {
    try {
      const { username, password, code } = ctx.request.body;

      // 参数验证
      if (!username || !password || !code) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "用户名、密码和验证码不能为空"
        };

        // 异步记录登录失败 - 参数错误
        recordLoginAsync(ctx, {
          username: username || '未提供用户名',
          status: 'failure',
          failReason: '用户名、密码或验证码不能为空'
        });

        return;
      }

      // 验证码校验
      const user = await User.findOne({ where: { username } });

      if (!user) {
        ctx.status = 404;
        ctx.body = { code: 404, message: "用户不存在" };
        recordLoginAsync(ctx, { username, status: 'failure', failReason: '用户不存在' });
        return;
      }

      if (!user.email) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '该用户未绑定邮箱，无法进行验证码登录' };
        recordLoginAsync(ctx, { username, status: 'failure', failReason: '未绑定邮箱' });
        return;
      }

      const storedCodeInfo = verificationCodes[user.email];

      if (!storedCodeInfo) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '请先获取验证码' };
        recordLoginAsync(ctx, { username, status: 'failure', failReason: '未获取验证码' });
        return;
      }

      if (Date.now() > storedCodeInfo.expires) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '验证码已过期' };
        delete verificationCodes[user.email];
        recordLoginAsync(ctx, { username, status: 'failure', failReason: '验证码过期' });
        return;
      }

      if (storedCodeInfo.code !== code) {
        ctx.status = 400;
        ctx.body = { code: -1, message: '验证码不正确' };
        recordLoginAsync(ctx, { username, status: 'failure', failReason: '验证码不正确' });
        return;
      }

      // 验证成功后清除验证码
      delete verificationCodes[user.email];

      // 密码验证 (在验证码通过后进行)
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "密码错误"
        };
        recordLoginAsync(ctx, {
          username,
          status: 'failure',
          failReason: '密码错误'
        });
        return;
      }

      // 生成token时排除敏感信息
      const { password: _, ...userInfo } = user.dataValues;

      logger.info(`用户登录成功: ${username}`);

      // 使用TokenUtil生成令牌
      const token = TokenUtil.generateToken({
        id: userInfo.id
      }, '1d'); // 设置token有效期为1天

      // 登录成功后，将用户id保存到ctx.state.user.id上
      ctx.state.user = ctx.state.user || {};
      ctx.state.user.id = userInfo.id;

      // 先返回登录成功响应
      ctx.body = {
        code: 200,
        message: "登录成功",
        data: {
          token,
          user: userInfo
        }
      };

      // 异步记录登录成功
      recordLoginAsync(ctx, {
        username,
        userId: userInfo.id,
        status: 'success'
      });
    } catch (err) {
      logger.error(`登录失败: ${err.message}`);

      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };

      // 异步记录登录失败 - 系统错误
      try {
        const { username = '未知用户' } = ctx.request.body || {};
        recordLoginAsync(ctx, {
          username,
          status: 'failure',
          failReason: '服务器内部错误'
        });
      } catch (recordError) {
        logger.error(`记录登录失败错误: ${recordError.message}`);
      }
    }
  }

  // 获取用户信息
  async getUserInfo(ctx) {
    try {
      // 从认证中间件中获取用户信息
      const { user } = ctx.state;

      // 从数据库中获取最新的用户信息
      const latestUser = await User.findOne({
        where: { id: user.id }
      });

      if (!latestUser) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: "用户不存在"
        };
        return;
      }

      // 排除敏感信息
      const { password: _, ...userInfo } = latestUser.dataValues;

      ctx.body = {
        code: 200,
        message: "获取用户信息成功",
        data: userInfo
      };
    } catch (err) {
      logger.error(`获取用户信息失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  // 修改用户信息
  async updateUserInfo(ctx) {
    try {
      // 从认证中间件中获取用户信息
      const { user } = ctx.state;

      // 获取请求体中的数据
      const { username, avatar } = ctx.request.body;

      // 要更新的字段
      const updateFields = {};

      // 仅更新提供的字段
      if (username !== undefined) updateFields.username = username;
      if (avatar !== undefined) updateFields.avatar = avatar;

      // 如果没有任何要更新的字段
      if (Object.keys(updateFields).length === 0) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "没有提供要更新的字段"
        };
        return;
      }

      // 更新用户信息
      await User.update(updateFields, {
        where: { id: user.id }
      });

      // 获取更新后的用户信息
      const updatedUser = await User.findOne({
        where: { id: user.id }
      });

      // 排除敏感信息
      const { password: _, ...userInfo } = updatedUser.dataValues;

      logger.info(`用户信息更新成功: ${user.username}`, updateFields);

      // 返回更新后的用户信息
      ctx.body = {
        code: 200,
        message: "用户信息更新成功",
        data: userInfo
      };
    } catch (err) {
      logger.error(`更新用户信息失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  // 修改密码
  async updatePassword(ctx) {
    try {
      // 从认证中间件中获取用户信息
      const { user } = ctx.state;

      // 获取请求体中的数据
      const { oldPassword, newPassword } = ctx.request.body;

      // 验证参数
      if (!oldPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "旧密码和新密码不能为空"
        };
        return;
      }

      // 获取当前用户完整信息（包含密码）
      const currentUser = await User.findOne({
        where: { id: user.id }
      });

      // 验证旧密码
      const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
      if (!isPasswordValid) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "旧密码不正确"
        };
        return;
      }

      // 如果新密码与旧密码相同
      if (oldPassword === newPassword) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "新密码不能与旧密码相同"
        };
        return;
      }

      // 加密新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 更新密码
      await User.update(
        { password: hashedPassword },
        { where: { id: user.id } }
      );

      logger.info(`用户密码更新成功: ${user.username}`);

      ctx.body = {
        code: 200,
        message: "密码修改成功"
      };
    } catch (err) {
      logger.error(`修改密码失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  // 检查用户是否为管理员
  async checkIsAdmin(ctx) {
    try {
      // 从认证中间件中获取用户信息
      const { user } = ctx.state;

      // 从数据库中获取最新的用户信息
      const latestUser = await User.findOne({
        where: { id: user.id }
      });

      if (!latestUser) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: "用户不存在"
        };
        return;
      }

      ctx.body = {
        code: 200,
        message: "获取管理员状态成功",
        data: {
          isAdmin: !!latestUser.isAdmin
        }
      };
    } catch (err) {
      logger.error(`获取管理员状态失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }
}

module.exports = new UserController();
