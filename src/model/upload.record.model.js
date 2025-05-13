const { DataTypes } = require('sequelize');
const sequelize = require('../db/seq');

// 上传记录模型
const UploadRecord = sequelize.define('upload_record', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '上传用户ID，可能为空（游客上传）'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '上传用户名'
  },
  fileCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '上传文件数量'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '上传文件总大小（字节）'
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '文件类型（image或video）'
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '上传者IP地址'
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '上传者地区'
  }
}, {
  timestamps: true,
  // 表名不使用复数形式
  freezeTableName: true
});

// 同步模型到数据库（如果表不存在则创建）
// UploadRecord.sync({ alter: true })
//   .then(() => console.log('上传记录表同步成功'))
//   .catch(err => console.error('上传记录表同步失败:', err));

module.exports = UploadRecord; 