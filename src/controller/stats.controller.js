const os = require('os');
const si = require('systeminformation');
const logger = require("../utils/logger");
const LocationUtil = require("../utils/location.util");
const UAParser = require("../utils/ua.parser");
const LoginRecord = require("../model/login.record.model");
const User = require("../model/user.model");
const UploadRecord = require("../model/upload.record.model");
const { r2Client } = require("../db/oss");
const { R2_BUCKET_NAME } = require("../config/config");
const { ListObjectsV2Command, GetBucketMetricsConfigurationCommand } = require('@aws-sdk/client-s3');
const { Op } = require('sequelize');

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

  /**
   * 获取所有用户信息
   * @param {Object} ctx - Koa上下文
   */
  async getAllUsers(ctx) {
    try {
      const { page = 1, limit = 20, keyword } = ctx.query;
      
      // 构建查询条件
      const where = {};
      if (keyword) {
        where.username = {
          [User.sequelize.Op.like]: `%${keyword}%`
        };
      }
      
      // 查询记录总数
      const count = await User.count({ where });
      
      // 分页查询用户，只选择需要的字段
      const offset = (page - 1) * limit;
      const users = await User.findAll({
        where,
        attributes: ['id', 'username', 'isAdmin', 'avatar', 'createdAt'],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      // 格式化用户信息
      const formattedUsers = users.map(user => {
        const userData = user.dataValues;
        return {
          id: userData.id,
          username: userData.username,
          role: userData.isAdmin ? 1 : 0, // 1表示管理员，0表示普通用户
          avatar: userData.avatar,
          createdAt: userData.createdAt
        };
      });
      
      // 返回结果
      ctx.body = {
        code: 200,
        message: "获取用户列表成功",
        data: {
          total: count,
          items: formattedUsers,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`获取用户列表失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }

  /**
   * 获取R2存储统计信息
   * @param {Object} ctx - Koa上下文
   */
  async getR2Stats(ctx) {
    try {
      // 获取存储桶中的对象统计
      const listCommand = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
      });
      
      const listResponse = await r2Client.send(listCommand);
      
      // 计算总存储空间
      let totalSize = 0;
      let fileCount = 0;
      
      if (listResponse.Contents) {
        fileCount = listResponse.Contents.length;
        totalSize = listResponse.Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
      }
      
      // 格式化数据
      const storageStats = {
        totalFiles: fileCount,
        totalStorage: {
          bytes: totalSize,
          formatted: formatFileSize(totalSize)
        },
        bucketName: R2_BUCKET_NAME
      };
      
      // 返回结果
      ctx.body = {
        code: 200,
        message: "获取R2存储统计成功",
        data: storageStats
      };
    } catch (error) {
      logger.error(`获取R2存储统计失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "获取R2存储统计失败，请检查R2配置和连接状态"
      };
    }
  }

  /**
   * 记录用户上传信息
   * @param {Object} ctx - Koa上下文
   * @param {Object} options - 配置选项
   * @param {string} [options.userId] - 用户ID
   * @param {string} options.username - 用户名
   * @param {number} options.fileCount - 上传文件数量
   * @param {number} options.fileSize - 上传文件大小(字节)
   * @param {string} options.fileType - 文件类型(image或video)
   * @returns {Promise<Object>} 上传记录对象
   */
  async recordUpload(ctx, options) {
    try {
      const { userId = null, username, fileCount = 1, fileSize, fileType } = options;
      
      // 获取IP和地理位置信息
      const locationInfo = await LocationUtil.getCompleteLocationInfo();
      
      // 创建上传记录
      const uploadRecord = await UploadRecord.create({
        userId,
        username,
        fileCount,
        fileSize,
        fileType,
        ip: locationInfo.ip,
        region: locationInfo.region
      });
      
      logger.info(`记录用户 ${username} 上传文件: ${fileCount}个, ${fileSize}字节, 类型:${fileType}`);
      return uploadRecord;
    } catch (error) {
      logger.error(`记录上传信息失败: ${error.message}`);
      // 这里只记录错误，不影响主流程
      return null;
    }
  }
  
  /**
   * 获取上传记录列表
   * @param {Object} ctx - Koa上下文
   */
  async getUploadRecords(ctx) {
    try {
      const { page = 1, limit = 20, username, fileType, startDate, endDate } = ctx.query;
      
      // 构建查询条件
      const where = {};
      if (username) {
        where.username = username;
      }
      if (fileType && ['image', 'video'].includes(fileType)) {
        where.fileType = fileType;
      }
      
      // 添加日期筛选
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999); // 设置为当天结束时间
          where.createdAt[Op.lte] = endDateTime;
        }
      }
      
      // 查询记录总数
      const count = await UploadRecord.count({ where });
      
      // 分页查询记录
      const offset = (page - 1) * limit;
      const records = await UploadRecord.findAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
      
      // 返回结果
      ctx.body = {
        code: 200,
        message: "获取上传记录成功",
        data: {
          total: count,
          items: records,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`获取上传记录失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }
  
  /**
   * 获取指定日期上传统计信息
   * @param {Object} ctx - Koa上下文
   */
  async getDailyUploadStats(ctx) {
    try {
      // 获取查询参数中的日期，如果未提供则使用今天的日期
      const { date } = ctx.query;
      const targetDate = date ? new Date(date) : new Date();
      
      // 如果日期无效，则返回错误
      if (isNaN(targetDate.getTime())) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: "无效的日期格式，请使用YYYY-MM-DD格式"
        };
        return;
      }
      
      // 获取目标日期的开始和结束时间
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
      
      // 查询条件 - 指定日期的记录
      const where = {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      };
      
      // 获取所有上传记录
      const records = await UploadRecord.findAll({ where });
      
      // 计算总文件数和总大小
      let totalFiles = 0;
      let totalSize = 0;
      let imageFiles = 0;
      let videoFiles = 0;
      
      records.forEach(record => {
        totalFiles += record.fileCount;
        totalSize += record.fileSize;
        
        if (record.fileType === 'image') {
          imageFiles += record.fileCount;
        } else if (record.fileType === 'video') {
          videoFiles += record.fileCount;
        }
      });
      
      // 返回结果
      ctx.body = {
        code: 200,
        message: "获取日期上传统计成功",
        data: {
          date: targetDate.toISOString().split('T')[0],
          totalFiles,
          totalSize: {
            bytes: totalSize,
            formatted: formatFileSize(totalSize)
          },
          imageFiles,
          videoFiles,
          uploadCount: records.length // 上传操作次数
        }
      };
    } catch (error) {
      logger.error(`获取日期上传统计失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: "服务器内部错误"
      };
    }
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节大小
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = new StatsController(); 