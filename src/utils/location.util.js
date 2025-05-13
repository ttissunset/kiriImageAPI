const axios = require('axios');
const os = require('os');
const logger = require('./logger');

/**
 * 地理位置和IP信息工具类
 */
class LocationUtil {
  /**
   * 获取本地IP地址
   * @returns {string|null} 本地IP地址
   */
  static getLocalIP() {
    try {
      const interfaces = os.networkInterfaces();
      // 查找非内部IP地址
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // 跳过内部地址、IPv6地址和禁用的接口
          if (!iface.internal && iface.family === 'IPv4' && iface.address) {
            return iface.address;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error(`获取本地IP地址失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取公网IP地址
   * @returns {Promise<string|null>} 公网IP地址或null（如果获取失败）
   */
  static async getPublicIP() {
    // 更可靠的IP服务列表，按照可靠性排序
    const ipServices = [
      { url: 'http://httpbin.org/ip', extract: data => data.origin },
      { url: 'https://ifconfig.me/ip', extract: data => data },
      { url: 'https://icanhazip.com', extract: data => data.trim() },
      { url: 'https://api64.ipify.org', extract: data => data.trim() }, // 纯文本版本
      { url: 'https://api.ipify.org?format=json', extract: data => data.ip }
    ];

    for (const service of ipServices) {
      try {
        // 增加超时和重试选项提高成功率
        const response = await axios.get(service.url, { 
          timeout: 3000,
          retry: 2,
          retryDelay: 1000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
          }
        });
        
        if (response.status === 200) {
          // 使用提供的提取函数处理不同的响应格式
          const ip = service.extract(response.data);
          if (ip && typeof ip === 'string' && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            logger.info(`成功从${service.url}获取IP: ${ip}`);
            return ip;
          }
        }
      } catch (error) {
        logger.warn(`尝试从${service.url}获取IP失败: ${error.message}`);
        // 继续尝试下一个服务
      }
    }

    // 如果所有公网IP服务都失败，尝试获取本地IP
    logger.warn('所有公网IP服务均获取失败，尝试使用本地IP');
    const localIP = this.getLocalIP();
    if (localIP) {
      logger.info(`使用本地IP作为备选: ${localIP}`);
      return localIP;
    }

    logger.error('无法获取任何IP地址');
    return "127.0.0.1"; // 返回本地回环地址作为最后的备选
  }

  /**
   * 通过IP获取地理位置信息
   * @param {string} ip - IP地址
   * @returns {Promise<Object|null>} 地理位置信息或null（如果获取失败）
   */
  static async getLocationByIP(ip) {
    if (!ip) {
      return null;
    }
    
    // 如果是局域网IP或本地IP，直接返回本地信息
    if (this.isPrivateIP(ip)) {
      return {
        ip,
        region: "本地网络",
        isp: "本地网络",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai"
      };
    }

    // 更可靠的地理位置服务
    const geoServices = [
      {
        url: `https://ipwho.is/${ip}`,
        transform: (data) => {
          if (!data.success) return null;
          
          const region = this.formatRegion(data.country, data.region, data.city);
          return {
            ip,
            region,
            isp: data.connection?.isp || "未知",
            timezone: data.timezone?.id || "未知"
          };
        }
      },
      {
        url: `https://ipapi.co/${ip}/json/`,
        transform: (data) => {
          if (data.error) return null;
          
          const region = this.formatRegion(data.country_name, data.region, data.city);
          return {
            ip,
            region,
            isp: data.org || "未知",
            timezone: data.timezone || "未知"
          };
        }
      },
      {
        url: `https://ipinfo.io/${ip}/json`,
        transform: (data) => {
          if (data.error) return null;
          
          const region = this.formatRegion(data.country, data.region, data.city);
          return {
            ip,
            region,
            isp: data.org || "未知",
            timezone: data.timezone || "未知"
          };
        }
      },
      {
        url: `http://ip-api.com/json/${ip}`,
        transform: (data) => {
          if (data.status !== 'success') return null;
          
          const region = this.formatRegion(data.country, data.regionName, data.city);
          return {
            ip,
            region,
            isp: data.isp || "未知",
            timezone: data.timezone || "未知"
          };
        }
      }
    ];

    for (const service of geoServices) {
      try {
        // 增加超时和重试选项提高成功率
        const response = await axios.get(service.url, { 
          timeout: 3000,
          retry: 2,
          retryDelay: 1000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
          }
        });
        
        if (response.status === 200 && response.data) {
          const locationData = service.transform.call(this, response.data);
          if (locationData) {
            logger.info(`成功从${service.url}获取地理位置信息`);
            return locationData;
          }
        }
      } catch (error) {
        logger.warn(`尝试从${service.url}获取地理位置失败: ${error.message}`);
        // 继续尝试下一个服务
      }
    }

    logger.error(`所有地理位置服务均获取失败，IP: ${ip}`);
    return {
      ip,
      region: "未知",
      isp: "未知",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "未知"
    };
  }
  
  /**
   * 检查IP是否为私有IP
   * @param {string} ip - IP地址
   * @returns {boolean} 是否为私有IP
   */
  static isPrivateIP(ip) {
    // 检查常见的私有IP范围
    const privateRanges = [
      { start: '10.0.0.0', end: '10.255.255.255' },       // 10.0.0.0/8
      { start: '172.16.0.0', end: '172.31.255.255' },     // 172.16.0.0/12
      { start: '192.168.0.0', end: '192.168.255.255' },   // 192.168.0.0/16
      { start: '127.0.0.0', end: '127.255.255.255' }      // 127.0.0.0/8 (本地回环)
    ];
    
    // 将IP地址转换为数字进行比较
    const ipNum = this.ipToNumber(ip);
    
    // 检查是否在任何私有范围内
    return privateRanges.some(range => {
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);
      return ipNum >= startNum && ipNum <= endNum;
    });
  }
  
  /**
   * 将IP地址转换为数字表示
   * @param {string} ip - IP地址
   * @returns {number} IP地址的数字表示
   */
  static ipToNumber(ip) {
    const parts = ip.split('.');
    return (
      (parseInt(parts[0], 10) << 24) |
      (parseInt(parts[1], 10) << 16) |
      (parseInt(parts[2], 10) << 8) |
      parseInt(parts[3], 10)
    ) >>> 0; // 无符号右移确保结果为正数
  }
  
  /**
   * 格式化区域信息
   * @param {string} country - 国家
   * @param {string} region - 地区
   * @param {string} city - 城市
   * @returns {string} 格式化后的区域信息
   */
  static formatRegion(country, region, city) {
    const parts = [];
    if (country) parts.push(country);
    if (region && region !== country) parts.push(region);
    if (city && city !== region) parts.push(city);
    
    return parts.length > 0 ? parts.join(' ') : '未知';
  }

  /**
   * 获取完整的位置信息（包括IP和地理位置）
   * @returns {Promise<Object>} 位置信息对象
   */
  static async getCompleteLocationInfo() {
    try {
      // 获取IP
      const ip = await this.getPublicIP();
      if (!ip) {
        return this.getDefaultLocationInfo();
      }
      
      // 获取地理位置信息
      const locationInfo = await this.getLocationByIP(ip);
      if (!locationInfo) {
        return {
          ip,
          ...this.getDefaultLocationInfo()
        };
      }
      
      return locationInfo;
    } catch (error) {
      logger.error(`获取位置信息失败: ${error.message}`);
      return this.getDefaultLocationInfo();
    }
  }
  
  /**
   * 获取默认的位置信息（当无法获取真实信息时使用）
   * @returns {Object} 默认位置信息
   */
  static getDefaultLocationInfo() {
    return {
      ip: "未知",
      region: "未知",
      isp: "未知",
      timezone: "未知"
    };
  }
}

module.exports = LocationUtil; 