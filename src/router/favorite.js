const Router = require('koa-router');
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  batchRemoveFavorites,
  batchAddFavorites,
  checkFavoriteStatus
} = require('../controller/favorite.controller');
const { auth } = require('../middleware/auth.middleware');

const router = new Router({ prefix: '/api/favorite' });

// 所有收藏夹操作都需要认证
router.get('/list', auth, getFavorites);
router.post('/add/:imageId', auth, addFavorite);
router.delete('/remove/:imageId', auth, removeFavorite);
router.get('/status/:imageId', auth, checkFavoriteStatus);

// 批量添加收藏
router.post('/batch', auth, batchAddFavorites);

// 批量取消收藏
router.delete('/batch', auth, batchRemoveFavorites);

module.exports = router; 