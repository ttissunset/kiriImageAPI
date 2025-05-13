const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require("../utils/logger");
const { 
  R2_ACCOUNT_ID, 
  R2_ACCESS_KEY_ID, 
  R2_ACCESS_KEY_SECRET, 
  R2_BUCKET_NAME,
  R2_PUBLIC_URL
} = require("../config/config");

// 创建 R2 客户端实例
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_ACCESS_KEY_SECRET,
  },
});

// 上传文件到 R2
const uploadFileToR2 = async (fileBuffer, key, contentType) => {
  try {
    const uploadParams = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);

    // 如果配置了公共访问URL，则直接返回
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${key}`;
    }

    // 否则生成预签名URL(有效期24小时)
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: 86400 });
    
    return signedUrl;
  } catch (error) {
    logger.error('上传文件到R2失败:', error);
    throw new Error(`上传文件到R2失败: ${error.message}`);
  }
};

// 从R2删除文件
const deleteFileFromR2 = async (key) => {
  try {
    const deleteParams = {
      Bucket: R2_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await r2Client.send(command);
    return true;
  } catch (error) {
    logger.error('从R2删除文件失败:', error);
    throw new Error(`从R2删除文件失败: ${error.message}`);
  }
};

// 测试 R2 连接
const testR2Connection = async () => {
  try {
    // 尝试列出一些对象来测试连接
    const { ListObjectsCommand } = require('@aws-sdk/client-s3');
    const listCommand = new ListObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1,
    });
    
    await r2Client.send(listCommand);
    logger.info("R2 连接成功");
    return true;
  } catch (error) {
    logger.error("R2 连接失败:", error);
    return false;
  }
};

// 将key转换为公共URL
const getPublicUrl = (key) => {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return null;
};

module.exports = {
  r2Client,
  uploadFileToR2,
  deleteFileFromR2,
  testR2Connection,
  getPublicUrl
};
