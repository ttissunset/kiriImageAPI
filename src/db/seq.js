const { Sequelize } = require("sequelize");
const logger = require("../config/logger.js");

// 导入配置文件
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PWD,
  MYSQL_DB,
} = require("../config/config.js");

// 创建 Sequelize 实例，直接指定数据库名称
const seq = new Sequelize(MYSQL_DB, MYSQL_USER, MYSQL_PWD, {
  host: MYSQL_HOST,
  portL: MYSQL_PORT,
  dialect: "mysql",
  logging: (msg) => logger.debug(msg),
});

// 测试mysql是否链接成功
// seq
//   .authenticate()
//   .then(() => {
//     console.log('数据库连接成功')
//   })
//   .catch((err) => {
//     console.error('Unable to connect to the database:', err)
//   })

module.exports = seq;
