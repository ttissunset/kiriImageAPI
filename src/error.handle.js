const logger = require('./utils/logger');

module.exports = (err, ctx) => {
  let status = 500
  switch (err.code) {
    case '10001':
      status = 400
      break
    case '10002':
      status = 409
      break
    default:
      status = 500
  }
  ctx.status = status
  ctx.body = err
  
  // 记录错误日志
  logger.error('应用错误', { 
    status,
    code: err.code, 
    message: err.message,
    stack: err.stack 
  });
}