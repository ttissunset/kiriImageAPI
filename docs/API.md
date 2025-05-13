# KiriPet API 文档

本文档描述了KiriPet图片管理系统的所有API接口、参数和使用示例。

## 基本信息

- 基础URL: `http://localhost:3000`（默认）
- 所有响应格式统一为JSON，格式如下：
```json
{
  "code": 200,       // 状态码，200表示成功
  "message": "操作成功", // 操作结果描述
  "data": {          // 响应数据，具体结构根据接口不同而变化
    // 数据内容
  }
}
```

## 错误码说明

| 错误码 | 描述 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如用户名已存在） |
| 413 | 文件体积超过限制 |
| 415 | 不支持的文件类型 |
| 500 | 服务器内部错误 |

## 文件支持说明

- 支持的图片格式：JPG、PNG、GIF、WebP、AVIF
- 支持的视频格式：MP4、WebM、MOV
- 单个文件大小限制：50MB

## API接口

### 1. 用户认证接口

用户相关的API文档已单独拆分，请参考 [用户API文档](./User.md)

### 2. 图片管理接口

#### 2.1 获取图片列表

- URL: `/api/image/list`
- 方法: `GET`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 当前页码，默认为1 |
| limit | number | 否 | 每页数量，默认为50 |
| sort | string | 否 | 排序方式，可选值："date_desc"(默认),"date_asc","name_asc","name_desc" |

- 响应示例:

```json
{
  "code": 200,
  "message": "获取图片列表成功",
  "data": {
    "total": 26,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "风景照片.jpg",
        "description": "美丽的山水风景",
        "url": "https://example.com/image/a1b2c3d4e5f6g7h8i9j0.jpg",
        "size": 1024000,
        "type": "image/jpeg",
        "userId": "user-id",
        "createdAt": "2023-04-01T12:00:00.000Z",
        "updatedAt": "2023-04-01T12:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 50
  }
}
```

#### 2.2 获取图片详情

- URL: `/api/image/detail/:imageId`
- 方法: `GET`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "获取图片详情成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "风景照片.jpg",
    "description": "美丽的山水风景",
    "url": "https://example.com/image/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:00:00.000Z"
  }
}
```

#### 2.3 上传图片

- URL: `/api/image/upload`
- 方法: `POST`
- 认证: 需要Bearer Token
- Content-Type: `multipart/form-data`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file | File | 是 | 图片或视频文件 |
| name | string | 否 | 自定义文件名，不提供则使用原始文件名 |
| description | string | 否 | 文件描述 |

- 响应示例:

```json
{
  "code": 200,
  "message": "图片上传成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "自定义名称.jpg",
    "description": "这是一张美丽的风景照片",
    "url": "https://example.com/image/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:00:00.000Z"
  }
}
```

#### 2.4 更新图片信息

- URL: `/api/image/:imageId`
- 方法: `PUT`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |
| name | string | 否 | 新的图片名称 |
| description | string | 否 | 新的图片描述 |

- 响应示例:

```json
{
  "code": 200,
  "message": "图片信息更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新的图片名称",
    "description": "新的图片描述",
    "url": "https://example.com/image/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:30:00.000Z"
  }
}
```

#### 2.5 删除图片

- URL: `/api/image/:imageId`
- 方法: `DELETE`
- 认证: 需要Bearer Token
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "图片删除成功"
}
```

#### 2.6 批量上传图片

- URL: `/api/image/batch-upload`
- 方法: `POST`
- 认证: 需要Bearer Token
- Content-Type: `multipart/form-data`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| count | number | 否 | 限制处理的文件数量，默认为10，最大为100 |
| files | File[] | 是 | 多个图片或视频文件 |
| names | string[] | 否 | 自定义文件名数组，按索引对应每个文件 |
| descriptions | string[] | 否 | 文件描述数组，按索引对应每个文件 |

- 响应示例:

```json
{
  "code": 200,
  "message": "批量上传处理完成",
  "data": {
    "total": 3,
    "successful": {
      "count": 2,
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "风景照片1.jpg",
          "success": true
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "风景照片2.jpg",
          "success": true
        }
      ]
    },
    "failed": {
      "count": 1,
      "items": [
        {
          "originalName": "invalid_file.exe",
          "success": false,
          "message": "不支持的文件类型"
        }
      ]
    }
  }
}
```

#### 2.7 批量删除图片

- URL: `/api/image/batch-delete`
- 方法: `POST`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

```json
{
  "imageIds": ["id1", "id2", "id3"]
}
```

- 响应示例:

```json
{
  "code": 200,
  "message": "批量删除处理完成，成功: 2, 失败: 1",
  "data": {
    "succeeded": {
      "count": 2,
      "items": [
        {
          "id": "id1",
          "name": "图片1.jpg"
        },
        {
          "id": "id2",
          "name": "图片2.jpg"
        }
      ]
    },
    "failed": {
      "count": 1,
      "items": [
        {
          "id": "id3",
          "name": "图片3.jpg",
          "error": "删除失败原因"
        }
      ]
    }
  }
}
```

### 3. 收藏管理接口

#### 3.1 获取收藏列表

- URL: `/api/favorite/list`
- 方法: `GET`
- 认证: 需要Bearer Token
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| page | number | 否 | 当前页码，默认为1 |
| limit | number | 否 | 每页数量，默认为50 |

- 响应示例:

```json
{
  "code": 200,
  "message": "获取收藏列表成功",
  "data": {
    "total": 5,
    "items": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440000",
        "imageId": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user-id",
        "createdAt": "2023-04-02T10:00:00.000Z",
        "updatedAt": "2023-04-02T10:00:00.000Z",
        "image": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "风景照片.jpg",
          "description": "美丽的山水风景",
          "url": "https://example.com/image/a1b2c3d4e5f6g7h8i9j0.jpg",
          "type": "image/jpeg",
          "createdAt": "2023-04-01T12:00:00.000Z"
        }
      }
    ],
    "page": 1,
    "limit": 50
  }
}
```

#### 3.2 添加到收藏

- URL: `/api/favorite/add/:imageId`
- 方法: `POST`
- 认证: 需要Bearer Token
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "添加收藏成功",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "imageId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id",
    "createdAt": "2023-04-02T10:00:00.000Z",
    "updatedAt": "2023-04-02T10:00:00.000Z"
  }
}
```

#### 3.3 删除收藏

- URL: `/api/favorite/remove/:imageId`
- 方法: `DELETE`
- 认证: 需要Bearer Token
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "删除收藏成功"
}
```

#### 3.4 检查收藏状态

- URL: `/api/favorite/status/:imageId`
- 方法: `GET`
- 认证: 需要Bearer Token
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "获取收藏状态成功",
  "data": {
    "isFavorite": true,
    "favoriteId": "650e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### 3.5 批量添加收藏

- URL: `/api/favorite/batch`
- 方法: `POST`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

```json
{
  "imageIds": ["id1", "id2", "id3"]
}
```

> **注意**: 收藏记录ID现在使用随机生成的UUID，而不是直接使用图片ID，避免了ID冲突问题

- 响应示例:

```json
{
  "code": 200,
  "message": "批量添加收藏处理完成，成功: 2, 失败: 1",
  "data": {
    "succeeded": {
      "count": 2,
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "imageId": "id1"
        },
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "imageId": "id2"
        }
      ]
    },
    "failed": {
      "count": 1,
      "items": [
        {
          "id": "id3",
          "imageId": "id3",
          "error": "添加收藏失败原因"
        }
      ]
    }
  }
}
```

#### 3.6 批量取消收藏

- URL: `/api/favorite/batch`
- 方法: `DELETE`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

```json
{
  "imageIds": ["id1", "id2", "id3"]
}
```

> **注意**: 需要用户身份验证，API会从用户状态中获取用户ID

- 响应示例:

```json
{
  "code": 200,
  "message": "批量取消收藏处理完成，成功: 2, 失败: 1",
  "data": {
    "succeeded": {
      "count": 2,
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "imageId": "id1"
        },
        {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "imageId": "id2"
        }
      ]
    },
    "failed": {
      "count": 1,
      "items": [
        {
          "id": "id3",
          "imageId": "id3",
          "error": "取消收藏失败原因"
        }
      ]
    }
  }
}
```

## 认证说明

对于需要认证的API，请在请求头中添加以下字段：

```
Authorization: Bearer <token>
```

其中`<token>`是通过注册或登录API获取的JWT令牌。用户认证相关内容详见[用户API文档](./User.md)。

## 使用示例

### 图片操作

```javascript
// 上传图片
async function uploadImage(token, file, name, description) {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);
  if (description) formData.append('description', description);
  
  const response = await fetch('/api/image/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return await response.json();
}

// 获取图片列表
async function getImages() {
  const response = await fetch('/api/image/list?page=1&limit=10&sort=date_desc');
  return await response.json();
}
```

### 收藏操作

```javascript
// 添加收藏
async function addFavorite(token, imageId) {
  const response = await fetch(`/api/favorite/add/${imageId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// 查询收藏状态
async function checkFavoriteStatus(token, imageId) {
  const response = await fetch(`/api/favorite/status/${imageId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}

// 批量添加收藏
async function batchAddFavorites(token, imageIds) {
  const response = await fetch('/api/favorite/batch', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageIds })
  });
  return await response.json();
}

// 批量取消收藏
async function batchRemoveFavorites(token, imageIds) {
  const response = await fetch('/api/favorite/batch', {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageIds })
  });
  return await response.json();
}
``` 