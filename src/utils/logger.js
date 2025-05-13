const logger = require('../config/logger');

// 日志功能封装
const log = {
  info: (message, meta) => {
    logger.info(message, meta);
  },
  error: (message, meta) => {
    logger.error(message, meta);
  },
  warn: (message, meta) => {
    logger.warn(message, meta);
  },
  debug: (message, meta) => {
    logger.debug(message, meta);
  }
};

module.exports = log; 