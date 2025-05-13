const Image = require('./image.model');
const Favorite = require('./favorite.model');
const LoginRecord = require('./login.record.model');

// 图片和收藏之间的关联
Favorite.belongsTo(Image, {
  foreignKey: 'imageId',
  targetKey: 'id'
});

Image.hasMany(Favorite, {
  foreignKey: 'imageId',
  sourceKey: 'id'
});

module.exports = {
  Image,
  Favorite,
  LoginRecord
}; 