const os = require('os');
const si = require('systeminformation');
const axios = require('axios');
const logger = require("../utils/logger");

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
      
      // 获取IP信息
      let ipInfo = null;
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        const ip = ipResponse.data.ip;
        
        // 获取地理位置信息
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        ipInfo = {
          ip,
          country: geoResponse.data.country,
          countryCode: geoResponse.data.countryCode,
          region: geoResponse.data.regionName,
          city: geoResponse.data.city,
          lat: geoResponse.data.lat,
          lon: geoResponse.data.lon,
          isp: geoResponse.data.isp,
          timezone: geoResponse.data.timezone
        };
      } catch (error) {
        logger.error(`获取IP信息失败: ${error.message}`);
        ipInfo = { error: "无法获取IP信息" };
      }
      
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
        ip: ipInfo && ipInfo.ip ? ipInfo.ip : "未知",
        isp: ipInfo && ipInfo.isp ? ipInfo.isp : "未知",
        region: ipInfo && ipInfo.country ? `${ipInfo.country} ${ipInfo.city || ipInfo.region || ""}` : "未知"
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