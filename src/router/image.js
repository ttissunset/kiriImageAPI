const Router = require('koa-router');
const {
  getImages,
  uploadImage,
  deleteImage,
  batchDeleteImages,
  updateImage,
  getImageDetails,
  batchUploadImages
} = require('../controller/image.controller');
const { auth } = require('../middleware/auth.middleware');

const router = new Router({ prefix: '/api/image' });

// 公开的路由
router.get('/list', getImages);
router.get('/detail/:imageId', getImageDetails);

// 需要认证的路由
router.post('/upload', auth, uploadImage);
router.post('/batch-upload', auth, batchUploadImages);
router.delete('/:imageId', auth, deleteImage);
router.put('/:imageId', auth, updateImage);
router.post('/batch-delete', auth, batchDeleteImages);

module.exports = router; 