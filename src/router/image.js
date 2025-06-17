const Router = require('koa-router');
const { auth } = require('../middleware/auth.middleware');
const {
  getImages,
  uploadImage,
  deleteImage,
  batchDeleteImages,
  updateImage,
  getImageDetails,
  batchUploadImages
} = require('../controller/image.controller');

const imageRouter = new Router({ prefix: '/images' });

// 获取图片列表 (需要认证)
imageRouter.get('/', auth, getImages);

// 上传单张图片 (需要认证，需要文件上传处理)
imageRouter.post('/upload', auth, uploadImage);

// 删除图片 (需要认证)
imageRouter.delete('/:imageId', auth, deleteImage);

// 批量删除图片 (需要认证)
imageRouter.post('/batchDelete', auth, batchDeleteImages);

// 更新图片信息 (需要认证)
imageRouter.put('/:imageId', auth, updateImage);

// 获取图片详情 (需要认证)
imageRouter.get('/:imageId', auth, getImageDetails);

// 批量上传图片 (需要认证，需要文件上传处理)
imageRouter.post('/batchUpload', auth, batchUploadImages);

module.exports = imageRouter; 