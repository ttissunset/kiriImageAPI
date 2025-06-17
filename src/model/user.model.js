// DataTypes 是每个字段的数据类型
const { DataTypes } = require("sequelize");
// 导入seq实例
const seq = require("../db/seq");

const User = seq.define("user", {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "用户名",
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "密码",
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "头像URL",
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: "邮箱",
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "是否为管理员",
  }
});

// User.sync({ force: true });

module.exports = User;
