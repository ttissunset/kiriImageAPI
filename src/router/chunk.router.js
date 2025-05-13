const Router = require('koa-router');
const chunkController = require('../controller/chunk.controller');
const { auth } = require('../middleware/auth.middleware');

// 创建路由实例
const router = new Router({ prefix: '/api/chunk' });

// 分片上传接口
router.post('/upload', auth, chunkController.uploadChunk.bind(chunkController));

// 查询已上传分片
router.get('/verify', chunkController.verifyChunks.bind(chunkController));

// 合并分片接口
router.post('/merge', auth, chunkController.mergeChunks.bind(chunkController));

// 清理过期分片（可以考虑添加管理员权限）
router.delete('/cleanup', auth, chunkController.cleanupExpiredChunks.bind(chunkController));

module.exports = router; 