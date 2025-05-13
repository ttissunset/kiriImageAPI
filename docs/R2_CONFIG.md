# Cloudflare R2 配置说明

本项目使用 Cloudflare R2 对象存储来存储上传的图片和视频文件。以下是配置步骤：

## 必要环境变量

请在项目根目录创建 `.env` 文件并添加以下配置项：

```
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id               # Cloudflare账号ID
R2_ACCESS_KEY_ID=your_access_key_id         # R2 Access Key ID
R2_ACCESS_KEY_SECRET=your_access_key_secret # R2 Access Key Secret
R2_BUCKET_NAME=your_bucket_name             # R2 存储桶名称
R2_PUBLIC_URL=https://your-public-url       # (可选) R2公共访问URL
```

## 如何获取Cloudflare R2凭证

1. 登录 [Cloudflare控制台](https://dash.cloudflare.com/)
2. 进入 `R2` 服务
3. 创建存储桶 (如果尚未创建)
4. 在 `R2管理页面` > `设置` 中创建API令牌
5. 选择 `S3 API令牌` 并创建新的令牌
6. 记下 `Access Key ID` 和 `Secret Access Key`
7. 获取你的Cloudflare账号ID (在控制台右侧)

## 公共访问配置 (可选)

如果你希望上传的文件可以公开访问，你可以：

1. 在R2存储桶设置中创建公共访问配置
2. 配置自定义域名或使用Cloudflare提供的公共URL
3. 将公共URL添加到 `R2_PUBLIC_URL` 环境变量

## 依赖包安装

本功能依赖于AWS SDK用于S3兼容的操作，请确保安装以下依赖：

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 注意事项
1. 保持 Access Key 和 Secret 的安全，不要提交到代码仓库
2. R2免费套餐每日有操作次数和存储空间限制，请注意监控使用情况
3. 建议开启CORS配置，以便前端页面能直接访问资源 