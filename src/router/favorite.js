const Router = require('koa-router');
const { auth } = require('../middleware/auth.middleware');
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  batchAddFavorites,
  batchRemoveFavorites,
  checkFavoriteStatus
} = require('../controller/favorite.controller');

const favoriteRouter = new Router({ prefix: '/favorites' });

// 获取收藏列表
favoriteRouter.get('/', auth, getFavorites);

// 添加到收藏
favoriteRouter.post('/:imageId', auth, addFavorite);

// 从收藏中删除
favoriteRouter.delete('/:imageId', auth, removeFavorite);

// 批量添加收藏
favoriteRouter.post('/batchAdd', auth, batchAddFavorites);

// 批量取消收藏
favoriteRouter.post('/batchRemove', auth, batchRemoveFavorites);

module.exports = favoriteRouter; 