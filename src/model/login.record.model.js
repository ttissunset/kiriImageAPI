// DataTypes 是每个字段的数据类型
const { DataTypes } = require("sequelize");
// 导入seq实例
const seq = require("../db/seq");

const LoginRecord = seq.define("login_record", {
  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "用户id，登录失败时可能为空",
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "用户名",
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "登录IP",
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "地区/城市",
  },
  isp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "网络服务提供商",
  },
  browser: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "浏览器",
  },
  os: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "操作系统",
  },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    allowNull: false,
    comment: "登录状态",
  },
  failReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "失败原因",
  }
});

// 初始化表结构，force: true 会在每次同步时先删除表
// LoginRecord.sync({ force: true });
// LoginRecord.sync({ alter: true });

module.exports = LoginRecord;