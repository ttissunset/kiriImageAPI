const Router = require('koa-router');
const router = new Router({ prefix: '/api/user' });
const { login, getUserInfo, register, updateUserInfo, updatePassword, checkIsAdmin } = require('../controller/user.controller');
const { auth } = require('../middleware/auth.middleware');

// 用户注册路由
router.post('/register', register);

// 用户登录路由
router.post('/login', login);

// 获取用户信息 (需要认证)
router.get('/info', auth, getUserInfo);

// 修改用户信息 (需要认证)
router.put('/update', auth, updateUserInfo);

// 修改密码 (需要认证)
router.put('/password', auth, updatePassword);

// 检查用户是否为管理员 (需要认证)
router.get('/admin-status', auth, checkIsAdmin);

module.exports = router; 