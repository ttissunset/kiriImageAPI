const os = require('os');
const si = require('systeminformation');
const logger = require("../utils/logger");
const LocationUtil = require("../utils/location.util");

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
        region: `${locationInfo.country} ${locationInfo.city || locationInfo.region || ""}`
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
}

module.exports = new StatsController(); 