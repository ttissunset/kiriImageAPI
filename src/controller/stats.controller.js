const os = require('os');
const si = require('systeminformation');
const logger = require("../utils/logger");
const LocationUtil = require("../utils/location.util");
const UAParser = require("../utils/ua.parser");
const LoginRecord = require("../model/login.record.model");

class StatsController {
  // 获取系统信息
  async getSystemInfo(ctx) {
    try {
      // 获取CPU信息
      const cpuInfo = await si.cpu();
      
      // 获取GPU信息
      const gpuInfo = await si.graphics();
      
      // 获取内存信息
      const memInfo = await si.mem();
      const memoryTotal = memInfo.total;
      const memoryUsed = memInfo.used;
      const memoryUsage = ((memoryUsed / memoryTotal) * 100).toFixed(2);
      
      // 获取系统信息
      const osInfo = {
        platform: os.platform(),
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime()
      };
      
      // 获取IP和地理位置信息
      const locationInfo = await LocationUtil.getCompleteLocationInfo();
      
      // 构建简化的响应数据格式
      const systemInfo = {
        cpu: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
        gpu: gpuInfo.controllers.length > 0 ? `${gpuInfo.controllers[0].vendor} ${gpuInfo.controllers[0].model}` : "未知",
        memory: {
          total: (memoryTotal / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          used: (memoryUsed / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          usage: memoryUsage + '%'
        },
        os: `${osInfo.platform} ${osInfo.type} ${osInfo.arch}`,
        ip: locationInfo.ip,
        isp: locationInfo.isp,
        region: locationInfo.region
      };
      
      // 返回系统信息
      ctx.body = {
        code: 200,
        message: "获取系统信息成功",
        data: systemInfo
      };
    } catch (err) {
      logger.error(`获取系统信息失败: ${err.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  /**
   * 记录用户登录信息
   * @param {Object} ctx - Koa上下文
   * @param {Object} options - 配置选项
   * @param {string} options.username - 用户名
   * @param {string} [options.userId] - 用户ID（登录成功时提供）
   * @param {string} options.status - 登录状态，'success' 或 'failure'
   * @param {string} [options.failReason] - 登录失败原因（登录失败时提供）
   * @returns {Promise<Object>} 登录记录对象
   */
  async recordLogin(ctx, options) {
    try {
      const { username, userId = null, status, failReason = null } = options;
      
      // 获取用户代理信息
      const userAgent = ctx.headers['user-agent'] || '';
      const { browser, os: clientOS } = UAParser.parse(userAgent);
      
      // 获取IP和地理位置信息
      const locationInfo = await LocationUtil.getCompleteLocationInfo();
      
      // 创建登录记录
      const loginRecord = await LoginRecord.create({
        userId,
        username,
        ip: locationInfo.ip,
        region: locationInfo.region,
        isp: locationInfo.isp,
        browser,
        os: clientOS,
        status,
        failReason
      });
      
      logger.info(`记录用户 ${username} 登录${status === 'success' ? '成功' : '失败'}`);
      return loginRecord;
    } catch (error) {
      logger.error(`记录登录信息失败: ${error.message}`);
      // 这里只记录错误，不影响主流程
      return null;
    }
  }
  
  /**
   * 获取登录记录列表
   * @param {Object} ctx - Koa上下文
   */
  async getLoginRecords(ctx) {
    try {
      const { page = 1, limit = 20, username, status } = ctx.query;
      
      // 构建查询条件
      const where = {};
      if (username) {
        where.username = username;
      }
      if (status && ['success', 'failure'].includes(status)) {
        where.status = status;
      }
      
      // 查询记录总数
      const count = await LoginRecord.count({ where });
      
      // 分页查询记录
      const offset = (page - 1) * limit;
      const records = await LoginRecord.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      // 返回结果
      ctx.body = {
        code: 200,
        message: "获取登录记录成功",
        data: {
          total: count,
          items: records,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`获取登录记录失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }
}

module.exports = new StatsController(); 