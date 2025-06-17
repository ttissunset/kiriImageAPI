const crypto = require('crypto');
const Image = require('../model/image.model');
const seq = require('../db/seq');
const logger = require('../utils/logger');

class FavoriteController {
  // 获取收藏列表
  async getFavorites(ctx) {
    try {
      const { page = 1, limit = 50 } = ctx.query;
      const userId = ctx.state.user.id;

      // 分页查询
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 联合查询获取收藏的图片详情
      const { count, rows } = await Image.findAndCountAll({
        where: { userId, favorite: true },
        attributes: ['id', 'name', 'description', 'url', 'type', 'createdAt', 'favorite'], // 确保 favorite 字段被包含
        offset,
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      ctx.body = {
        code: 200,
        message: '获取收藏列表成功',
        data: {
          total: count,
          items: rows,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`获取收藏列表失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '获取收藏列表失败: ' + error.message
      };
    }
  }

  // 添加到收藏
  async addFavorite(ctx) {
    try {
      const { imageId } = ctx.params;
      const userId = ctx.state.user.id;

      // 检查图片是否存在并获取图片信息
      const image = await Image.findOne({
        where: { id: imageId, userId }
      });

      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }

      // 检查是否已收藏（直接查看Image表的favorite字段）
      if (image.favorite) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '该图片已收藏'
        };
        return;
      }

      // 更新Image表的favorite字段
      await Image.update(
        { favorite: true },
        { where: { id: imageId } }
      );

      ctx.body = {
        code: 200,
        message: '添加收藏成功',
        data: { imageId: image.id, isFavorite: true } // 返回更新后的状态
      };
    } catch (error) {
      logger.error(`添加收藏失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '添加收藏失败: ' + error.message
      };
    }
  }

  // 从收藏中删除
  async removeFavorite(ctx) {
    try {
      const { imageId } = ctx.params;
      const userId = ctx.state.user.id;

      // 检查图片是否存在并获取图片信息
      const image = await Image.findOne({
        where: { id: imageId, userId }
      });

      // 检查图片是否存在或是否已收藏
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在或不属于当前用户'
        };
        return;
      }

      if (!image.favorite) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '该图片未收藏'
        };
        return;
      }

      // 更新Image表的favorite字段
      await Image.update(
        { favorite: false },
        { where: { id: imageId, userId } }
      );

      logger.info(`删除收藏成功 - ImageID: ${imageId}`);

      ctx.body = {
        code: 200,
        message: '删除收藏成功',
        data: { imageId: image.id, isFavorite: false } // 返回更新后的状态
      };
    } catch (error) {
      logger.error(`删除收藏失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '删除收藏失败: ' + error.message
      };
    }
  }

  // 批量添加收藏
  async batchAddFavorites(ctx) {
    try {
      const { imageIds } = ctx.request.body;
      const userId = ctx.state.user.id;

      // 参数验证
      if (!ctx.request.body || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '请求体不能为空，且imageIds必须是非空数组'
        };
        return;
      }

      const t = await seq.transaction();
      
      try {
        // 查询所有指定ID的图片
        const images = await Image.findAll({
          where: { id: imageIds, userId },
          transaction: t
        });

        // 处理ID类型兼容性，转换所有ID为字符串进行比对
        const foundImageIds = images.map(img => String(img.id));
        const inputImageIds = imageIds.map(id => String(id));
        
        // 找出不存在的图片ID
        const invalidImageIds = inputImageIds.filter(id => !foundImageIds.includes(id));
        
        // 识别已收藏和未收藏的图片
        const favoriteImages = images.filter(img => img.favorite);
        const nonFavoriteImages = images.filter(img => !img.favorite);
        
        const favoriteImageIds = favoriteImages.map(img => img.id);
        const nonFavoriteImageIds = nonFavoriteImages.map(img => img.id);

        // 批量更新未收藏的图片
        if (nonFavoriteImageIds.length > 0) {
          await Image.update(
            { favorite: true },
            { 
              where: { id: nonFavoriteImageIds, userId },
              transaction: t 
            }
          );
        }

        await t.commit();

        // 准备返回结果
        const results = {
          succeeded: nonFavoriteImageIds.map(id => ({ imageId: id, message: '收藏成功' })),
          skipped: favoriteImageIds.map(id => ({ imageId: id, message: '图片已收藏' })),
          invalid: invalidImageIds.map(id => ({ imageId: id, error: '图片不存在或不属于当前用户' })),
          failed: []
        };

        ctx.body = {
          code: 200,
          message: `批量添加收藏处理完成，成功: ${results.succeeded.length}, 已跳过: ${results.skipped.length}, 失败: ${results.failed.length}, 无效: ${results.invalid.length}`,
          data: results
        };

      } catch (error) {
        await t.rollback();
        logger.error(`批量添加收藏事务失败: ${error.message}`);
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '批量添加收藏处理失败: ' + error.message
        };
      }
    } catch (error) {
      logger.error('批量添加收藏出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '批量添加收藏失败: ' + error.message
      };
    }
  }

  // 批量取消收藏
  async batchRemoveFavorites(ctx) {
    try {
      const { imageIds } = ctx.request.body;
      const userId = ctx.state.user.id;

      // 参数验证
      if (!ctx.request.body || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '请求体不能为空，且imageIds必须是非空数组'
        };
        return;
      }

      const t = await seq.transaction();
      
      try {
        // 查询所有指定ID的图片
        const images = await Image.findAll({
          where: { id: imageIds, userId },
          transaction: t
        });

        // 处理ID类型兼容性，转换所有ID为字符串进行比对
        const foundImageIds = images.map(img => String(img.id));
        const inputImageIds = imageIds.map(id => String(id));
        
        // 找出不存在的图片ID
        const invalidImageIds = inputImageIds.filter(id => !foundImageIds.includes(id));
        
        // 识别已收藏和未收藏的图片
        const favoriteImages = images.filter(img => img.favorite);
        const nonFavoriteImages = images.filter(img => !img.favorite);
        
        const favoriteImageIds = favoriteImages.map(img => img.id);
        const nonFavoriteImageIds = nonFavoriteImages.map(img => img.id);

        // 批量更新已收藏的图片
        if (favoriteImageIds.length > 0) {
          await Image.update(
            { favorite: false },
            { 
              where: { id: favoriteImageIds, userId },
              transaction: t 
            }
          );
        }

        await t.commit();

        // 准备返回结果
        const results = {
          succeeded: favoriteImageIds.map(id => ({ imageId: id, message: '取消收藏成功' })),
          skipped: nonFavoriteImageIds.map(id => ({ imageId: id, message: '图片未收藏' })),
          invalid: invalidImageIds.map(id => ({ imageId: id, error: '图片不存在或不属于当前用户' })),
          failed: []
        };

        ctx.body = {
          code: 200,
          message: `批量取消收藏处理完成，成功: ${results.succeeded.length}, 已跳过: ${results.skipped.length}, 失败: ${results.failed.length}, 无效: ${results.invalid.length}`,
          data: results
        };

      } catch (error) {
        await t.rollback();
        logger.error(`批量取消收藏事务失败: ${error.message}`);
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '批量取消收藏处理失败: ' + error.message
        };
      }
    } catch (error) {
      logger.error('批量取消收藏出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '批量取消收藏失败: ' + error.message
      };
    }
  }
}

module.exports = new FavoriteController();