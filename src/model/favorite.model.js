const { DataTypes } = require("sequelize");
const seq = require("../db/seq");

const Favorite = seq.define("favorite", {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    primaryKey: true,
    comment: "收藏唯一id",
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "用户ID",
  },
  imageId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "图片ID",
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
  }
});

// Favorite.sync({ force: true });

module.exports = Favorite; 