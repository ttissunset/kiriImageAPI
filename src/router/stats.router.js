const Router = require('koa-router');
const router = new Router({ prefix: '/api/stats' });
const { getSystemInfo } = require('../controller/stats.controller');
const { auth, adminAuth } = require('../middleware/auth.middleware');

// 获取系统信息 (需要管理员权限)
router.get('/system', auth, adminAuth, getSystemInfo);

module.exports = router; 