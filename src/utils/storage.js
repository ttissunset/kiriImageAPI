const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadFileToR2, deleteFileFromR2 } = require('../db/oss');

// 文件类型限制
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']; // quicktime为MOV格式
const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB

// 生成基于时间戳的文件名
const generateTimestampFileName = (originalName) => {
  const ext = path.extname(originalName);
  // 创建当前日期对象
  const now = new Date();
  // 格式化为 YYYYMMDD-HHMMSS 格式
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${timestamp}${ext}`;
};

// 检查文件类型
const checkFileType = (fileType) => {
  return ALLOWED_IMAGE_TYPES.includes(fileType) || ALLOWED_VIDEO_TYPES.includes(fileType);
};

// 检查文件大小
const checkFileSize = (fileSize) => {
  return fileSize <= FILE_SIZE_LIMIT;
};

// 保存文件到R2对象存储
const saveFileToR2 = async (file, customName = null, username = null) => {
  try {
    // 生成文件名
    let fileName;
    
    if (customName) {
      // 检查customName是否已经包含扩展名
      const customExt = path.extname(customName);
      const originalExt = path.extname(file.originalFilename);
      
      // 如果自定义名称已有扩展名，直接使用；否则添加原始文件的扩展名
      fileName = customExt ? customName : `${customName}${originalExt}`;
    } else {
      fileName = generateTimestampFileName(file.originalFilename);
    }
    
    // 新增：如果有 username，则存储到 username/filename 路径下
    let key = fileName;
    if (username) {
      key = `${username}/${fileName}`;
    }
    
    // 读取文件内容
    const fileContent = fs.readFileSync(file.filepath);
    
    // 上传到R2并获取URL
    const fileUrl = await uploadFileToR2(fileContent, key, file.mimetype);
    
    return {
      fileName,
      key,
      fileUrl,
      fileSize: file.size,
      fileType: file.mimetype
    };
  } catch (error) {
    throw new Error(`文件保存到R2失败: ${error.message}`);
  }
};

// 从R2删除文件
const deleteFileFromStorage = async (key) => {
  try {
    // 如果key是完整URL，只提取文件名部分
    if (key.startsWith('http')) {
      // 获取URL的最后一部分作为文件名
      key = key.split('/').pop();
    }
    
    await deleteFileFromR2(key);
    return true;
  } catch (error) {
    throw new Error(`文件删除失败: ${error.message}`);
  }
};

// 兼容原本的接口 - 保存文件
const saveFileToLocal = async (file, customName = null) => {
  // 现在直接调用R2版本
  return saveFileToR2(file, customName);
};

// 兼容原本的接口 - 删除文件
const deleteLocalFile = async (filePath) => {
  // 现在调用R2版本
  return deleteFileFromStorage(filePath);
};

module.exports = {
  saveFileToLocal,
  deleteLocalFile,
  saveFileToR2,
  deleteFileFromStorage,
  checkFileType,
  checkFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  FILE_SIZE_LIMIT
}; 