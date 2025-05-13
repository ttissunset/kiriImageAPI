const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../model/user.model");
const TokenUtil = require("../utils/token.util");
const logger = require("../utils/logger");
const statsController = require("./stats.controller");

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
      const { username, password, nickname, email } = ctx.request.body;

      // 参数验证
      if (!username || !password) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "用户名和密码不能为空"
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

      // 检查邮箱是否已存在(如果提供了邮箱)
      if (email) {
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
      }

      // 密码加密
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 创建用户记录
      const newUser = await User.create({
        id: crypto.randomUUID(),
        username,
        password: hashedPassword,
        nickname: nickname || username,
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

  // 登录接口
  async login(ctx, next) {
    try {
      const { username, password } = ctx.request.body;

      // 参数验证
      if (!username || !password) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "用户名和密码不能为空"
        };
        
        // 异步记录登录失败 - 参数错误
        recordLoginAsync(ctx, {
          username: username || '未提供用户名',
          status: 'failure',
          failReason: '用户名和密码不能为空'
        });
        
        return;
      }

      // 查找用户
      const user = await User.findOne({
        where: { username }
      });

      // 用户不存在
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: "用户不存在"
        };
        
        // 异步记录登录失败 - 用户不存在
        recordLoginAsync(ctx, {
          username,
          status: 'failure',
          failReason: '用户不存在'
        });
        
        return;
      }

      // 密码验证
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "密码错误"
        };
        
        // 异步记录登录失败 - 密码错误
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
      const token = TokenUtil.generateToken(userInfo);
      
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

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "未登录或登录已过期"
        };
        return;
      }

      // 设置缓存控制头，禁止缓存用户信息
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.set('Pragma', 'no-cache');
      ctx.set('Expires', '0');
      ctx.set('Surrogate-Control', 'no-store');

      ctx.body = {
        code: 200,
        message: "获取用户信息成功",
        data: user
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

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "未登录或登录已过期"
        };
        return;
      }

      // 获取请求体中的数据
      const { nickname, avatar } = ctx.request.body;

      // 要更新的字段
      const updateFields = {};

      // 仅更新提供的字段
      if (nickname !== undefined) updateFields.nickname = nickname;
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

      // 设置缓存控制头，禁止缓存用户信息
      ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ctx.set('Pragma', 'no-cache');
      ctx.set('Expires', '0');
      ctx.set('Surrogate-Control', 'no-store');

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

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "未登录或登录已过期"
        };
        return;
      }

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

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: "未登录或登录已过期"
        };
        return;
      }

      ctx.body = {
        code: 200,
        message: "获取管理员状态成功",
        data: {
          isAdmin: !!user.isAdmin
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
