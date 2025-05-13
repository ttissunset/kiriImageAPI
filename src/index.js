const path = require("path");
const Koa = require("koa");
const cors = require("@koa/cors");
const errHandler = require("./error.handle");
const logger = require("./utils/logger");

// 解析路由参数的中间件
const { koaBody } = require("koa-body");
const koaStaic = require("koa-static");
const parameter = require("koa-parameter");

// 创建koa实例
const app = new Koa();

// 从环境变量中获取端口
const { APP_PORT } = require("./config/config");

// 导入数据库模型关联
require('./model/association');

const router = require("./router/index");

// 使用koda-body中间件对body参数进行处理
app.use(koaBody({ 
  multipart: true,
  formidable: {
    maxFileSize: 200 * 1024 * 1024 // 设置上传文件大小限制为200MB
  },
  parsedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'], // 明确指定解析DELETE请求体
  json: true, // 明确启用JSON解析
  jsonLimit: '5mb' // 设置JSON请求体大小限制
}));

// 使用 koa-static 中间件将upload文件夹配置为静态资源
app.use(koaStaic(path.join(__dirname, "./upload")));
app.use(parameter(app));

// 配置 CORS 中间件
// 跨域处理
app.use(
  cors({
    origin: "*", // 允许所有来源
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);

// 将路由添加到Koa应用
app.use(router.routes()).use(router.allowedMethods());

// 统一的错误处理
app.on("error", errHandler);

// 全局变量
global.sharedData = {
  verificationCode: null,
};

app.listen(APP_PORT, () => {
  logger.info(`服务器已启动，监听端口: ${APP_PORT}`);
});
