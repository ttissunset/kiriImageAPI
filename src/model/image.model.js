const { DataTypes } = require("sequelize");
const seq = require("../db/seq");

const Image = seq.define("image", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "图片名称",
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "图片描述",
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "图片URL",
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "图片大小（字节）",
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "文件类型",
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "上传用户ID",
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: "创建时间"
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: "更新时间"
  },
  favorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "是否为收藏"
  }
});

// Image.sync({ force: true });

module.exports = Image; 