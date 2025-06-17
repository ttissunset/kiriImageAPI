const crypto = require('crypto');
const Image = require('../model/image.model');
const {
  saveFileToLocal,
  deleteLocalFile,
  checkFileType,
  checkFileSize,
  saveFileToR2,
  deleteFileFromStorage
} = require('../utils/storage');
const seq = require('../db/seq');
const logger = require('../utils/logger');
const statsController = require('./stats.controller');

class ImageController {
  // 获取图片列表
  async getImages(ctx) {
    try {
      const { page = 1, limit = 50, sort = 'date_desc' } = ctx.query;
      const userId = ctx.state.user.id;

      // 排序配置
      let order = [];
      switch (sort) {
        case 'date_asc':
          order = [['createdAt', 'ASC']];
          break;
        case 'name_asc':
          order = [['name', 'ASC']];
          break;
        case 'name_desc':
          order = [['name', 'DESC']];
          break;
        case 'date_desc':
        default:
          order = [['createdAt', 'DESC']];
          break;
      }

      // 查询条件，添加用户ID过滤
      const whereCondition = { userId };

      // 分页查询
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await Image.findAndCountAll({
        where: whereCondition,
        offset,
        limit: parseInt(limit),
        order
      });

      ctx.body = {
        code: 200,
        message: '获取图片列表成功',
        data: {
          total: count,
          items: rows,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      ctx.app.emit('error', error, ctx);
    }
  }

  // 上传图片
  async uploadImage(ctx) {
    try {
      const { file } = ctx.request.files;
      const { name, description } = ctx.request.body;
      const userId = ctx.state.user.id;

      // 检查文件是否存在
      if (!file) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '文件不能为空'
        };
        return;
      }

      // 检查文件类型
      if (!checkFileType(file.mimetype)) {
        ctx.status = 415;
        ctx.body = {
          code: 415,
          message: '不支持的文件类型'
        };
        return;
      }

      // 检查文件大小
      if (!checkFileSize(file.size)) {
        ctx.status = 413;
        ctx.body = {
          code: 413,
          message: '文件体积超过限制'
        };
        return;
      }

      // 保存文件到R2云存储
      const savedFile = await saveFileToR2(file, name, ctx.state.user.username);

      // 创建图片记录
      const image = await Image.create({
        name: name || file.originalFilename,
        description: description || '',
        url: savedFile.fileUrl,  // 使用R2返回的URL
        size: savedFile.fileSize,
        type: savedFile.fileType,
        userId: userId
      });

      // 异步记录上传信息
      process.nextTick(async () => {
        try {
          // 判断文件类型是图片还是视频
          const fileType = savedFile.fileType.startsWith('image/') ? 'image' : 'video';

          await statsController.recordUpload(ctx, {
            userId,
            username: ctx.state.user.username,
            fileCount: 1,
            fileSize: savedFile.fileSize,
            fileType
          });
        } catch (recordError) {
          logger.error(`记录上传信息失败: ${recordError.message}`);
        }
      });

      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: '图片上传成功',
        data: image
      };
    } catch (error) {
      console.error('图片上传失败:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '图片上传失败: ' + error.message
      };
    }
  }

  // 删除图片
  async deleteImage(ctx) {
    try {
      const { imageId } = ctx.params;
      const userId = ctx.state.user.id;

      // 查找图片
      const image = await Image.findOne({
        where: { id: imageId }
      });

      // 检查图片是否存在
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }

      // 检查是否有权限删除（只能删除自己的图片）
      if (image.userId !== userId) {
        ctx.status = 403;
        ctx.body = {
          code: 403,
          message: '没有权限删除该图片'
        };
        return;
      }

      // 记录图片信息，用于日志和可能的回滚
      const imageInfo = {
        id: image.id,
        url: image.url,
        name: image.name
      };

      // 使用事务确保数据一致性
      const t = await seq.transaction();

      try {
        // 先删除数据库记录
        await image.destroy({ transaction: t });

        // 再删除R2中的文件
        const storageResult = await deleteFileFromStorage(image.url);

        // 如果存储删除成功，提交事务
        await t.commit();

        logger.info(`图片删除成功 - ID: ${imageInfo.id}, 名称: ${imageInfo.name}`);

        ctx.body = {
          code: 200,
          message: '图片删除成功'
        };
      } catch (storageError) {
        // 如果存储删除失败，回滚事务
        await t.rollback();

        logger.error(`删除图片失败 - ID: ${imageInfo.id}, 错误: ${storageError.message}`);

        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '删除图片失败: ' + storageError.message
        };
      }
    } catch (error) {
      logger.error('删除图片失败:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '删除图片失败: ' + error.message
      };
    }
  }

  // 批量删除图片
  async batchDeleteImages(ctx) {
    try {
      // 调试信息
      console.log('批量删除请求体:', JSON.stringify(ctx.request.body));
      console.log('请求内容类型:', ctx.request.headers['content-type']);

      const { imageIds } = ctx.request.body;
      const userId = ctx.state.user.id;
      console.log('解析后的imageIds:', imageIds);

      // 增强参数验证
      if (!ctx.request.body) {
        console.log('请求体为空');
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '请求体不能为空'
        };
        return;
      }

      if (!imageIds) {
        console.log('imageIds参数不存在');
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '缺少必要参数imageIds'
        };
        return;
      }

      if (!Array.isArray(imageIds)) {
        console.log('imageIds不是数组:', typeof imageIds);
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'imageIds必须是数组'
        };
        return;
      }

      if (imageIds.length === 0) {
        console.log('imageIds是空数组');
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'imageIds不能为空数组'
        };
        return;
      }

      // 查找所有指定ID的图片
      const images = await Image.findAll({
        where: { id: imageIds }
      });

      if (images.length === 0) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '未找到任何指定ID的图片'
        };
        return;
      }

      // 使用事务确保数据一致性
      const t = await seq.transaction();

      try {
        // 记录删除结果
        const results = {
          success: [],
          failed: []
        };

        // 对每张图片分别执行删除
        for (const image of images) {
          try {
            // 先删除数据库记录
            await image.destroy({ transaction: t });

            // 再删除R2中的文件
            await deleteFileFromStorage(image.url);

            // 记录成功
            results.success.push({
              id: image.id,
              name: image.name
            });
          } catch (itemError) {
            // 单个图片删除失败，记录错误但继续处理其他图片
            logger.error(`批量删除中单个图片失败 - ID: ${image.id}, 错误: ${itemError.message}`);

            results.failed.push({
              id: image.id,
              name: image.name,
              error: itemError.message
            });
          }
        }

        // 如果有图片成功删除，提交事务，否则回滚
        if (results.success.length > 0) {
          await t.commit();
          logger.info(`批量删除完成 - 成功: ${results.success.length}, 失败: ${results.failed.length}`);
        } else {
          await t.rollback();
          logger.error(`批量删除失败 - 所有图片删除都失败`);

          ctx.status = 500;
          ctx.body = {
            code: 500,
            message: '批量删除失败：所有图片删除操作都失败',
            data: {
              failed: results.failed
            }
          };
          return;
        }

        ctx.body = {
          code: 200,
          message: `批量删除处理完成，成功: ${results.success.length}, 失败: ${results.failed.length}`,
          data: {
            succeeded: {
              count: results.success.length,
              items: results.success
            },
            failed: {
              count: results.failed.length,
              items: results.failed
            }
          }
        };
      } catch (transactionError) {
        // 事务出错，回滚
        await t.rollback();

        logger.error(`批量删除事务失败:`, transactionError);
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '批量删除处理失败: ' + transactionError.message
        };
      }
    } catch (error) {
      logger.error('批量删除图片出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '批量删除图片失败: ' + error.message
      };
    }
  }

  // 更新图片信息
  async updateImage(ctx) {
    try {
      const { imageId } = ctx.params;
      const { name, description } = ctx.request.body;
      const userId = ctx.state.user.id;

      // 查找图片，增加 userId 校验
      const image = await Image.findOne({
        where: { id: imageId, userId }
      });

      // 检查图片是否存在
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }

      // 更新图片信息
      if (name) image.name = name;
      if (description !== undefined) image.description = description;

      await image.save();

      ctx.body = {
        code: 200,
        message: '图片信息更新成功',
        data: image
      };
    } catch (error) {
      ctx.app.emit('error', error, ctx);
    }
  }

  // 获取图片详情
  async getImageDetails(ctx) {
    try {
      const { imageId } = ctx.params;
      const userId = ctx.state.user.id;

      // 查找图片，增加 userId 校验
      const image = await Image.findOne({
        where: { id: imageId, userId }
      });

      // 检查图片是否存在
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }

      ctx.body = {
        code: 200,
        message: '获取图片详情成功',
        data: image
      };
    } catch (error) {
      ctx.app.emit('error', error, ctx);
    }
  }

  // 批量上传图片
  async batchUploadImages(ctx) {
    try {
      const files = ctx.request.files.files;
      const userId = ctx.state.user.id;
      const { description } = ctx.request.body;

      // 确保 files 是数组
      const fileArray = Array.isArray(files) ? files : [files];

      if (fileArray.length === 0) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '请选择至少一个文件'
        };
        return;
      }

      // 检查所有文件是否合规
      for (const file of fileArray) {
        if (!checkFileType(file.mimetype)) {
          ctx.status = 415;
          ctx.body = {
            code: 415,
            message: `不支持的文件类型: ${file.originalFilename}`
          };
          return;
        }

        if (!checkFileSize(file.size)) {
          ctx.status = 413;
          ctx.body = {
            code: 413,
            message: `文件体积超过限制: ${file.originalFilename}`
          };
          return;
        }
      }

      // 使用事务确保数据一致性
      const t = await seq.transaction();

      try {
        const uploadResults = [];
        let totalSize = 0;
        let imageCount = 0;
        let videoCount = 0;

        // 循环处理每个文件
        for (const file of fileArray) {
          // 保存文件到R2云存储
          const savedFile = await saveFileToR2(file, null, ctx.state.user.username);
          totalSize += savedFile.fileSize;

          // 判断文件类型是图片还是视频
          if (savedFile.fileType.startsWith('image/')) {
            imageCount++;
          } else if (savedFile.fileType.startsWith('video/')) {
            videoCount++;
          }

          // 创建图片记录
          const image = await Image.create({
            name: file.originalFilename,
            description: description || '',
            url: savedFile.fileUrl,  // 使用R2返回的URL
            size: savedFile.fileSize,
            type: savedFile.fileType,
            userId: userId
          }, { transaction: t });

          uploadResults.push(image);
        }

        // 提交事务
        await t.commit();

        // 异步记录上传信息
        process.nextTick(async () => {
          try {
            // 如果有图片文件，记录图片上传
            if (imageCount > 0) {
              await statsController.recordUpload(ctx, {
                userId,
                username: ctx.state.user.username,
                fileCount: imageCount,
                fileSize: totalSize, // 为简化，使用总大小
                fileType: 'image'
              });
            }

            // 如果有视频文件，记录视频上传
            if (videoCount > 0) {
              await statsController.recordUpload(ctx, {
                userId,
                username: ctx.state.user.username,
                fileCount: videoCount,
                fileSize: totalSize, // 为简化，使用总大小
                fileType: 'video'
              });
            }
          } catch (recordError) {
            logger.error(`记录批量上传信息失败: ${recordError.message}`);
          }
        });

        ctx.status = 200;
        ctx.body = {
          code: 200,
          message: '批量上传成功',
          data: {
            count: uploadResults.length,
            items: uploadResults
          }
        };
      } catch (error) {
        // 回滚事务
        await t.rollback();
        throw error;
      }
    } catch (error) {
      console.error('批量上传失败:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '批量上传失败: ' + error.message
      };
    }
  }
}

module.exports = new ImageController(); 