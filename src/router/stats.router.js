const Router = require('koa-router');
const router = new Router({ prefix: '/api/stats' });
const { getSystemInfo, getLoginRecords, getAllUsers, getR2Stats } = require('../controller/stats.controller');
const { auth, adminAuth } = require('../middleware/auth.middleware');

// 获取系统信息 (需要管理员权限)
router.get('/system', auth, adminAuth, getSystemInfo);

// 获取登录记录 (需要管理员权限)
router.get('/login-records', auth, adminAuth, getLoginRecords);

// 获取所有用户信息 (需要管理员权限)
router.get('/users', auth, adminAuth, getAllUsers);

// 获取R2存储统计信息 (需要管理员权限)
router.get('/r2-storage', auth, adminAuth, getR2Stats);

module.exports = router; 