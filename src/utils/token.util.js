const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../config/config');

/**
 * Token工具类
 * 提供生成和验证JWT令牌的方法
 */
class TokenUtil {
  /**
   * 生成JWT令牌
   * @param {Object} payload - 要包含在令牌中的数据
   * @param {String} expiresIn - 令牌有效期，默认为'7d'(7天)
   * @returns {String} JWT令牌
   */
  static generateToken(payload, expiresIn = '7d') {
    // 确保每次生成的令牌都不同，即使payload相同
    const uniquePayload = {
      ...payload,
      // 添加JWT ID (jti)
      jti: crypto.randomUUID(),
      // 添加当前时间戳，精确到毫秒
      iat: Date.now(),
      // 添加随机噪声
      nonce: crypto.randomBytes(8).toString('hex')
    };

    // 生成并返回令牌
    return jwt.sign(uniquePayload, JWT_SECRET, { expiresIn });
  }

  /**
   * 验证JWT令牌
   * @param {String} token - 要验证的JWT令牌
   * @returns {Object|null} 验证成功返回payload，失败返回null
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * 从令牌中提取用户信息，忽略jti、iat和nonce等元数据
   * @param {Object} decoded - 解码后的令牌载荷
   * @returns {Object} 干净的用户信息
   */
  static extractUserInfo(decoded) {
    if (!decoded) return null;

    // 移除添加的元数据
    const { jti, iat, nonce, exp, ...userInfo } = decoded;
    return userInfo;
  }
}

module.exports = TokenUtil; 