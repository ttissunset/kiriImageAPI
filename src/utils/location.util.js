const axios = require('axios');
const logger = require('./logger');

/**
 * 地理位置和IP信息工具类
 */
class LocationUtil {
  /**
   * 获取公网IP地址
   * @returns {Promise<string|null>} 公网IP地址或null（如果获取失败）
   */
  static async getPublicIP() {
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://api.ip.sb/ip',
      'https://api.myip.com'
    ];

    for (const service of ipServices) {
      try {
        const response = await axios.get(service, { timeout: 5000 });
        if (response.status === 200) {
          // 不同服务返回格式不同，需要分别处理
          if (typeof response.data === 'string') {
            return response.data.trim();
          } else if (response.data.ip) {
            return response.data.ip;
          }
        }
      } catch (error) {
        logger.warn(`尝试从${service}获取IP失败: ${error.message}`);
        // 继续尝试下一个服务
      }
    }

    logger.error('所有IP服务均获取失败');
    return null;
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

    const geoServices = [
      {
        url: `http://ip-api.com/json/${ip}`,
        transform: (data) => ({
          ip,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          city: data.city,
          lat: data.lat,
          lon: data.lon,
          isp: data.isp,
          timezone: data.timezone
        })
      },
      {
        url: `https://ipapi.co/${ip}/json/`,
        transform: (data) => ({
          ip,
          country: data.country_name,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          lat: data.latitude,
          lon: data.longitude,
          isp: data.org,
          timezone: data.timezone
        })
      },
      {
        url: `https://ipinfo.io/${ip}/json`,
        transform: (data) => {
          // 位置信息可能是"经度,纬度"格式
          let lat = null;
          let lon = null;
          if (data.loc && data.loc.includes(',')) {
            const [latitude, longitude] = data.loc.split(',');
            lat = parseFloat(latitude);
            lon = parseFloat(longitude);
          }
          
          return {
            ip,
            country: data.country ? data.country : null,
            countryCode: data.country ? data.country : null,
            region: data.region ? data.region : null,
            city: data.city ? data.city : null,
            lat,
            lon,
            isp: data.org ? data.org : null,
            timezone: data.timezone ? data.timezone : null
          };
        }
      }
    ];

    for (const service of geoServices) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        if (response.status === 200 && response.data) {
          return service.transform(response.data);
        }
      } catch (error) {
        logger.warn(`尝试从${service.url}获取地理位置失败: ${error.message}`);
        // 继续尝试下一个服务
      }
    }

    logger.error(`所有地理位置服务均获取失败，IP: ${ip}`);
    return null;
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
      country: "未知",
      countryCode: "UN",
      region: "未知",
      city: "未知",
      lat: null,
      lon: null,
      isp: "未知",
      timezone: "未知"
    };
  }
}

module.exports = LocationUtil; 