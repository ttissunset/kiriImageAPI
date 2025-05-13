const Router = require('koa-router');
const router = new Router();

// 导入各个路由模块
const imageRouter = require('./image');
const favoriteRouter = require('./favorite');
const userRouter = require('./user');
const chunkRouter = require('./chunk.router');
const statsRouter = require('./stats.router');

// 组合所有路由
router.use(imageRouter.routes(), imageRouter.allowedMethods());
router.use(favoriteRouter.routes(), favoriteRouter.allowedMethods());
router.use(userRouter.routes(), userRouter.allowedMethods());
router.use(chunkRouter.routes(), chunkRouter.allowedMethods());
router.use(statsRouter.routes(), statsRouter.allowedMethods());

module.exports = router; 