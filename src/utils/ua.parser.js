/**
 * User-Agent解析工具
 * 用于从请求头中提取浏览器和操作系统信息
 */
class UAParser {
  /**
   * 从User-Agent字符串中提取浏览器信息
   * @param {string} ua - User-Agent字符串
   * @returns {string} 浏览器名称和版本
   */
  static getBrowser(ua) {
    if (!ua) return '未知浏览器';
    
    // 检测常见浏览器
    if (ua.includes('Edge') || ua.includes('Edg')) {
      const match = ua.match(/Edge?\/([0-9\.]+)/);
      return `Microsoft Edge ${match ? match[1] : ''}`;
    } else if (ua.includes('Chrome')) {
      const match = ua.match(/Chrome\/([0-9\.]+)/);
      return `Chrome ${match ? match[1] : ''}`;
    } else if (ua.includes('Firefox')) {
      const match = ua.match(/Firefox\/([0-9\.]+)/);
      return `Firefox ${match ? match[1] : ''}`;
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      const match = ua.match(/Safari\/([0-9\.]+)/);
      return `Safari ${match ? match[1] : ''}`;
    } else if (ua.includes('MSIE') || ua.includes('Trident')) {
      const match = ua.match(/MSIE ([0-9\.]+)/) || ua.match(/rv:([0-9\.]+)/);
      return `Internet Explorer ${match ? match[1] : ''}`;
    } else if (ua.includes('Opera') || ua.includes('OPR')) {
      const match = ua.match(/OPR\/([0-9\.]+)/) || ua.match(/Opera\/([0-9\.]+)/);
      return `Opera ${match ? match[1] : ''}`;
    }
    
    // 移动浏览器
    if (ua.includes('Mobile')) {
      if (ua.includes('iPhone') || ua.includes('iPad')) {
        return 'Mobile Safari';
      } else if (ua.includes('Android')) {
        return 'Android Browser';
      }
    }
    
    return '其他浏览器';
  }
  
  /**
   * 从User-Agent字符串中提取操作系统信息
   * @param {string} ua - User-Agent字符串
   * @returns {string} 操作系统名称和版本
   */
  static getOS(ua) {
    if (!ua) return '未知操作系统';
    
    // 检测Windows
    if (ua.includes('Windows')) {
      if (ua.includes('Windows NT 10.0')) return 'Windows 10';
      if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
      if (ua.includes('Windows NT 6.2')) return 'Windows 8';
      if (ua.includes('Windows NT 6.1')) return 'Windows 7';
      if (ua.includes('Windows NT 6.0')) return 'Windows Vista';
      if (ua.includes('Windows NT 5.1')) return 'Windows XP';
      return 'Windows';
    }
    
    // 检测Mac
    if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X ([0-9_\.]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `macOS ${version}`;
      }
      return 'macOS';
    }
    
    // 检测Linux
    if (ua.includes('Linux')) {
      if (ua.includes('Android')) {
        const match = ua.match(/Android ([0-9\.]+)/);
        return `Android ${match ? match[1] : ''}`;
      }
      return 'Linux';
    }
    
    // 检测iOS
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
      const match = ua.match(/OS ([0-9_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `iOS ${version}`;
      }
      return 'iOS';
    }
    
    return '其他操作系统';
  }
  
  /**
   * 解析User-Agent
   * @param {string} ua - User-Agent字符串
   * @returns {Object} 包含浏览器和操作系统信息的对象
   */
  static parse(ua) {
    return {
      browser: this.getBrowser(ua),
      os: this.getOS(ua)
    };
  }
}

module.exports = UAParser; 