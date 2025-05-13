const crypto = require('crypto');
const Favorite = require('../model/favorite.model');
const Image = require('../model/image.model');
const seq = require('../db/seq');
const logger = require('../utils/logger');

class FavoriteController {
  // 获取收藏列表
  async getFavorites(ctx) {
    try {
      const { page = 1, limit = 50 } = ctx.query;
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法获取收藏列表'
        };
        return;
      }
      
      // 分页查询
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // 联合查询获取收藏的图片详情
      const { count, rows } = await Favorite.findAndCountAll({
        where: { userId },
        include: [
          {
            model: Image,
            attributes: ['id', 'name', 'description', 'url', 'type', 'createdAt']
          }
        ],
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
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法添加收藏'
        };
        return;
      }
      
      // 检查图片是否存在
      const image = await Image.findOne({
        where: { id: imageId }
      });
      
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }
      
      // 检查是否已收藏
      const existingFavorite = await Favorite.findOne({
        where: { userId, imageId }
      });
      
      if (existingFavorite) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '该图片已收藏'
        };
        return;
      }
      
      // 创建收藏记录
      const favorite = await Favorite.create({
        id: crypto.randomUUID(), // 使用随机UUID作为收藏记录的ID
        userId,
        imageId
      });
      
      ctx.body = {
        code: 200,
        message: '添加收藏成功',
        data: favorite
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
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法删除收藏'
        };
        return;
      }
      
      // 查找收藏记录
      const favorite = await Favorite.findOne({
        where: { userId, imageId }
      });
      
      // 检查收藏是否存在
      if (!favorite) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '收藏记录不存在'
        };
        return;
      }
      
      // 记录收藏信息
      const favoriteInfo = {
        id: favorite.id,
        imageId: favorite.imageId
      };
      
      // 使用事务确保数据一致性
      const t = await seq.transaction();
      
      try {
        // 删除收藏记录
        await favorite.destroy({ transaction: t });
        
        // 提交事务
        await t.commit();
        
        logger.info(`删除收藏成功 - ImageID: ${favoriteInfo.imageId}`);
        
        ctx.body = {
          code: 200,
          message: '删除收藏成功'
        };
      } catch (error) {
        // 如果删除失败，回滚事务
        await t.rollback();
        
        logger.error(`删除收藏失败 - ImageID: ${favoriteInfo.imageId}, 错误: ${error.message}`);
        
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '删除收藏失败: ' + error.message
        };
      }
    } catch (error) {
      logger.error('删除收藏失败:', error);
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
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法批量添加收藏'
        };
        return;
      }
      
      // 参数验证
      if (!ctx.request.body) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '请求体不能为空'
        };
        return;
      }
      
      if (!imageIds) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '缺少必要参数imageIds'
        };
        return;
      }
      
      if (!Array.isArray(imageIds)) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'imageIds必须是数组'
        };
        return;
      }
      
      if (imageIds.length === 0) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'imageIds不能为空数组'
        };
        return;
      }
      
      // 检查图片是否存在
      const existingImages = await Image.findAll({
        where: { id: imageIds }
      });
      
      if (existingImages.length === 0) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '未找到任何指定的图片'
        };
        return;
      }
      
      // 获取已存在的图片ID集合
      const existingImageIds = existingImages.map(img => img.id);
      
      // 检查哪些图片ID是有效的
      const validImageIds = imageIds.filter(id => existingImageIds.includes(id));
      const invalidImageIds = imageIds.filter(id => !existingImageIds.includes(id));
      
      // 查找已经收藏的图片
      const existingFavorites = await Favorite.findAll({
        where: { 
          userId,
          imageId: validImageIds
        }
      });
      
      // 获取已收藏的图片ID集合
      const existingFavoriteImageIds = existingFavorites.map(fav => fav.imageId);
      
      // 筛选出未收藏的图片ID
      const newFavoriteImageIds = validImageIds.filter(id => !existingFavoriteImageIds.includes(id));
      
      // 使用事务确保数据一致性
      const t = await seq.transaction();
      
      try {
        // 记录添加结果
        const results = {
          success: [],
          failed: []
        };
        
        // 添加失败的无效图片ID
        invalidImageIds.forEach(id => {
          results.failed.push({
            id: id,
            imageId: id,
            error: '图片不存在'
          });
        });
        
        // 添加失败的已收藏图片
        existingFavoriteImageIds.forEach(id => {
          results.failed.push({
            id: id,
            imageId: id,
            error: '该图片已收藏'
          });
        });
        
        // 批量创建收藏记录
        if (newFavoriteImageIds.length > 0) {
          // 对每个图片ID创建收藏
          for (const imageId of newFavoriteImageIds) {
            try {
              // 创建收藏记录
              const favorite = await Favorite.create({
                id: crypto.randomUUID(), // 使用随机UUID作为收藏记录的ID
                userId,
                imageId
              }, { transaction: t });
              
              // 记录成功
              results.success.push({
                id: favorite.id,
                imageId: favorite.imageId
              });
            } catch (itemError) {
              // 单个收藏添加失败，记录错误但继续处理其他收藏
              logger.error(`批量添加收藏中单个记录失败 - ImageID: ${imageId}, 错误: ${itemError.message}`);
              
              results.failed.push({
                id: imageId,
                imageId: imageId,
                error: itemError.message
              });
            }
          }
        }
        
        // 如果有收藏成功添加，提交事务，否则回滚
        if (results.success.length > 0) {
          await t.commit();
          logger.info(`批量添加收藏完成 - 成功: ${results.success.length}, 失败: ${results.failed.length}`);
        } else {
          await t.rollback();
          logger.error(`批量添加收藏失败 - 所有记录添加都失败`);
          
          ctx.status = 500;
          ctx.body = {
            code: 500,
            message: '批量添加收藏失败：所有记录添加操作都失败',
            data: {
              failed: results.failed
            }
          };
          return;
        }
        
        ctx.body = {
          code: 200,
          message: `批量添加收藏处理完成，成功: ${results.success.length}, 失败: ${results.failed.length}`,
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
        
        logger.error(`批量添加收藏事务失败:`, transactionError);
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '批量添加收藏处理失败: ' + transactionError.message
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
      // 调试信息
      console.log('批量取消收藏请求体:', JSON.stringify(ctx.request.body));
      console.log('请求内容类型:', ctx.request.headers['content-type']);
      
      const { imageIds } = ctx.request.body;
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法批量取消收藏'
        };
        return;
      }
      
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
      
      // 查找所有指定图片ID的收藏记录
      const favorites = await Favorite.findAll({
        where: { 
          userId,
          imageId: imageIds
        }
      });
      
      if (favorites.length === 0) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '未找到任何指定图片的收藏记录'
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
        
        // 对每个收藏分别执行删除
        for (const favorite of favorites) {
          try {
            // 删除收藏记录
            await favorite.destroy({ transaction: t });
            
            // 记录成功
            results.success.push({
              id: favorite.id,
              imageId: favorite.imageId
            });
          } catch (itemError) {
            // 单个收藏删除失败，记录错误但继续处理其他收藏
            logger.error(`批量取消收藏中单个记录失败 - ID: ${favorite.id}, 错误: ${itemError.message}`);
            
            results.failed.push({
              id: favorite.id,
              imageId: favorite.imageId,
              error: itemError.message
            });
          }
        }
        
        // 如果有收藏成功删除，提交事务，否则回滚
        if (results.success.length > 0) {
          await t.commit();
          logger.info(`批量取消收藏完成 - 成功: ${results.success.length}, 失败: ${results.failed.length}`);
        } else {
          await t.rollback();
          logger.error(`批量取消收藏失败 - 所有记录删除都失败`);
          
          ctx.status = 500;
          ctx.body = {
            code: 500,
            message: '批量取消收藏失败：所有记录删除操作都失败',
            data: {
              failed: results.failed
            }
          };
          return;
        }
        
        ctx.body = {
          code: 200,
          message: `批量取消收藏处理完成，成功: ${results.success.length}, 失败: ${results.failed.length}`,
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
        
        logger.error(`批量取消收藏事务失败:`, transactionError);
        ctx.status = 500;
        ctx.body = {
          code: 500,
          message: '批量取消收藏处理失败: ' + transactionError.message
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

  // 检查收藏状态
  async checkFavoriteStatus(ctx) {
    try {
      const { imageId } = ctx.params;
      const userId = ctx.state.user ? ctx.state.user.id : null;
      
      // 检查是否已认证
      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          message: '未登录，无法检查收藏状态'
        };
        return;
      }
      
      // 检查图片是否存在
      const image = await Image.findOne({
        where: { id: imageId }
      });
      
      if (!image) {
        ctx.status = 404;
        ctx.body = {
          code: 404,
          message: '图片不存在'
        };
        return;
      }
      
      // 查询是否已收藏
      const favorite = await Favorite.findOne({
        where: { userId, imageId }
      });
      
      ctx.body = {
        code: 200,
        message: '获取收藏状态成功',
        data: {
          isFavorite: !!favorite,
          favoriteId: favorite ? favorite.id : null
        }
      };
    } catch (error) {
      logger.error(`检查收藏状态失败: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '检查收藏状态失败: ' + error.message
      };
    }
  }
}

module.exports = new FavoriteController(); 