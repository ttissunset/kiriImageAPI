const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const fsPromises = require('fs').promises;
const Image = require('../model/image.model');
const { saveFileToR2 } = require('../utils/storage');
const logger = require('../utils/logger');
const statsController = require('./stats.controller');

// 将一些fs操作转换为Promise
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

// 切片文件的临时存储目录
const TEMP_DIR = path.join(__dirname, '../upload/temp');

class ChunkController {
  constructor() {
    // 确保临时目录存在
    this.ensureTempDir();
  }

  // 确保临时目录存在
  async ensureTempDir() {
    try {
      if (!fs.existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true });
        logger.info(`临时目录创建成功: ${TEMP_DIR}`);
      }
    } catch (error) {
      logger.error(`创建临时目录失败: ${error.message}`);
    }
  }

  // 获取分片文件的路径
  getChunkFilePath(fileHash, index) {
    return path.join(TEMP_DIR, `${fileHash}_${index}`);
  }

  // 计算文件MD5
  async calculateFileMD5(filePath) {
    const fileBuffer = await readFile(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  // 上传分片
  async uploadChunk(ctx) {
    try {
      // 获取分片文件和参数
      const { file } = ctx.request.files;
      const { fileHash, chunkIndex, chunkTotal, chunkMD5 } = ctx.request.body;

      // 参数验证
      if (!file || !fileHash || chunkIndex === undefined || !chunkTotal) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '参数不完整',
          data: null
        };
        logger.warn(`分片上传参数不完整: fileHash=${fileHash}, chunkIndex=${chunkIndex}, chunkTotal=${chunkTotal}`);
        return;
      }

      // 确保临时目录存在
      await this.ensureTempDir();

      // 分片文件路径
      const chunkFilePath = this.getChunkFilePath(fileHash, chunkIndex);

      // 如果启用了MD5验证并提供了chunkMD5
      if (chunkMD5) {
        // 计算上传文件的MD5
        const actualMD5 = await this.calculateFileMD5(file.filepath);
        
        // 验证MD5是否匹配
        if (actualMD5 !== chunkMD5) {
          ctx.status = 400;
          ctx.body = {
            code: 400,
            message: 'MD5校验失败，文件可能已损坏',
            data: null
          };
          logger.warn(`分片MD5校验失败: fileHash=${fileHash}, chunkIndex=${chunkIndex}, expected=${chunkMD5}, actual=${actualMD5}`);
          return;
        }
      }

      // 将分片移动到临时目录
      const fileBuffer = await readFile(file.filepath);
      await writeFile(chunkFilePath, fileBuffer);
      
      logger.info(`分片上传成功: fileHash=${fileHash}, chunkIndex=${chunkIndex}, size=${file.size}字节`);

      // 响应成功
      ctx.body = {
        code: 200,
        message: '分片上传成功',
        data: {
          fileHash,
          chunkIndex
        }
      };
    } catch (error) {
      logger.error(`分片上传失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: `分片上传失败: ${error.message}`,
        data: null
      };
    }
  }

  // 验证已上传的分片
  async verifyChunks(ctx) {
    try {
      const { fileHash, chunkTotal } = ctx.request.query;

      // 参数验证
      if (!fileHash || !chunkTotal) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '参数不完整',
          data: null
        };
        logger.warn(`验证分片参数不完整: fileHash=${fileHash}, chunkTotal=${chunkTotal}`);
        return;
      }

      // 获取已上传的分片索引
      const uploadedChunks = [];
      
      for (let i = 0; i < parseInt(chunkTotal); i++) {
        const chunkPath = this.getChunkFilePath(fileHash, i);
        if (await exists(chunkPath)) {
          uploadedChunks.push(i);
        }
      }
      
      const isComplete = uploadedChunks.length === parseInt(chunkTotal);
      logger.info(`验证分片成功: fileHash=${fileHash}, 已上传=${uploadedChunks.length}/${chunkTotal}, 是否完成=${isComplete}`);

      ctx.body = {
        code: 200,
        message: '查询成功',
        data: {
          fileHash,
          uploadedChunks,
          isComplete: isComplete
        }
      };
    } catch (error) {
      logger.error(`验证分片失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: `验证分片失败: ${error.message}`,
        data: null
      };
    }
  }

  // 合并分片
  async mergeChunks(ctx) {
    try {
      // 获取合并参数
      const { fileHash, fileName, chunkTotal, fileMD5, description } = ctx.request.body;
      const userId = ctx.state.user ? ctx.state.user.id : null;
      const username = ctx.state.user ? ctx.state.user.username : 'anonymous';

      // 参数验证
      if (!fileHash || !fileName || !chunkTotal) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '参数不完整',
          data: null
        };
        logger.warn(`合并分片参数不完整: fileHash=${fileHash}, fileName=${fileName}, chunkTotal=${chunkTotal}`);
        return;
      }

      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法合并文件',
          data: null
        };
        logger.warn(`未授权的合并分片请求: fileHash=${fileHash}`);
        return;
      }

      logger.info(`开始合并分片: fileHash=${fileHash}, fileName=${fileName}, chunkTotal=${chunkTotal}, userId=${userId}`);

      // 合并后的文件路径
      const mergedFilePath = path.join(TEMP_DIR, fileHash);
      
      // 创建写入流
      const writeStream = fs.createWriteStream(mergedFilePath);
      
      // 按顺序合并分片
      for (let i = 0; i < parseInt(chunkTotal); i++) {
        const chunkPath = this.getChunkFilePath(fileHash, i);
        
        // 检查分片是否存在
        if (!await exists(chunkPath)) {
          ctx.status = 400;
          ctx.body = {
            code: 400,
            message: `分片${i}不存在，无法完成合并`,
            data: null
          };
          
          logger.warn(`合并失败，分片不存在: fileHash=${fileHash}, chunkIndex=${i}`);
          
          // 关闭写入流并删除不完整的合并文件
          writeStream.end();
          if (await exists(mergedFilePath)) {
            await unlink(mergedFilePath);
          }
          return;
        }
        
        // 将分片内容添加到合并文件
        const chunkBuffer = await readFile(chunkPath);
        if (!writeStream.write(chunkBuffer)) {
          // 如果缓冲区已满，等待drain事件
          await new Promise(resolve => writeStream.once('drain', resolve));
        }
      }
      
      // 关闭写入流并等待所有数据写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        writeStream.end();
      });
      
      logger.info(`分片合并为临时文件完成: ${mergedFilePath}`);

      // 如果提供了MD5，验证合并后的文件
      if (fileMD5) {
        const actualMD5 = await this.calculateFileMD5(mergedFilePath);
        if (actualMD5 !== fileMD5) {
          ctx.status = 400;
          ctx.body = {
            code: 400,
            message: 'MD5校验失败，合并后的文件可能已损坏',
            data: null
          };
          
          logger.warn(`合并文件MD5校验失败: fileHash=${fileHash}, expected=${fileMD5}, actual=${actualMD5}`);
          
          // 删除合并后的文件
          await unlink(mergedFilePath);
          return;
        }
        logger.info(`合并文件MD5校验成功: ${actualMD5}`);
      }

      // 构造file对象以便使用现有的上传功能
      const mergedFile = {
        filepath: mergedFilePath,
        originalFilename: fileName,
        size: fs.statSync(mergedFilePath).size,
        mimetype: this.getMimeType(fileName)
      };

      // 将合并后的文件保存到R2
      const savedFile = await saveFileToR2(mergedFile, fileName);
      logger.info(`文件已上传到R2存储: fileName=${fileName}, url=${savedFile.fileUrl}, size=${savedFile.fileSize}字节`);

      // 记录上传信息
      const fileType = savedFile.fileType.startsWith('image/') ? 'image' : 'video';
      await statsController.recordUpload(ctx, {
        userId,
        username,
        fileCount: 1,
        fileSize: savedFile.fileSize,
        fileType
      });
      logger.info(`记录上传统计: 用户=${username}, 文件类型=${fileType}, 大小=${savedFile.fileSize}字节`);

      // 创建图片记录
      const image = await Image.create({
        id: crypto.randomUUID(),
        name: fileName,
        description: description || '',
        url: savedFile.fileUrl,
        size: savedFile.fileSize,
        type: savedFile.fileType,
        userId: userId
      });
      logger.info(`创建图片记录成功: id=${image.id}, name=${image.name}`);

      // 清理所有分片
      await this.cleanupChunks(fileHash, parseInt(chunkTotal));
      logger.info(`清理分片文件完成: fileHash=${fileHash}, chunkTotal=${chunkTotal}`);
      
      // 删除临时合并文件
      await unlink(mergedFilePath);
      logger.info(`删除临时合并文件: ${mergedFilePath}`);

      ctx.body = {
        code: 200,
        message: '文件合并成功',
        data: image
      };
    } catch (error) {
      logger.error(`合并分片失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: `合并分片失败: ${error.message}`,
        data: null
      };
    }
  }

  // 清理分片文件
  async cleanupChunks(fileHash, chunkTotal) {
    for (let i = 0; i < chunkTotal; i++) {
      const chunkPath = this.getChunkFilePath(fileHash, i);
      if (await exists(chunkPath)) {
        await unlink(chunkPath);
        logger.debug(`删除分片: ${chunkPath}`);
      }
    }
  }

  // 清理过期分片
  async cleanupExpiredChunks(ctx) {
    try {
      // 获取过期时间（默认24小时）
      const { expireHours = 24 } = ctx.request.query;
      
      logger.info(`开始清理过期分片文件: expireHours=${expireHours}`);
      
      // 读取临时目录中的所有文件
      const files = await fsPromises.readdir(TEMP_DIR);
      
      // 计算过期时间点
      const expireTime = Date.now() - parseInt(expireHours) * 60 * 60 * 1000;
      
      // 统计删除数量
      let deletedCount = 0;
      
      // 遍历所有文件，删除过期分片
      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = await fsPromises.stat(filePath);
        
        // 如果文件修改时间早于过期时间，则删除
        if (stats.mtimeMs < expireTime) {
          await unlink(filePath);
          deletedCount++;
          logger.debug(`删除过期文件: ${filePath}, 修改时间: ${new Date(stats.mtimeMs).toISOString()}`);
        }
      }
      
      logger.info(`清理过期分片完成: 共删除${deletedCount}个文件`);
      
      ctx.body = {
        code: 200,
        message: '清理过期分片完成',
        data: {
          deletedCount
        }
      };
    } catch (error) {
      logger.error(`清理过期分片失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: `清理过期分片失败: ${error.message}`,
        data: null
      };
    }
  }

  // 获取文件的MIME类型
  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new ChunkController(); 