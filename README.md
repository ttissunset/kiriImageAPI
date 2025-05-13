# Koa-KiriPet 图片管理系统API文档

本文档描述了Koa-KiriPet图片管理系统的所有API接口、参数和使用示例。

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
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 413 | 文件体积超过限制 |
| 415 | 不支持的文件类型 |
| 500 | 服务器内部错误 |

## 文件支持说明

- 支持的图片格式：JPG、PNG、GIF、WebP、AVIF
- 支持的视频格式：MP4、WebM、MOV
- 单个文件大小限制：50MB
- 大体积视频调用独立接口，不限制文件大小

## API接口

### 1. 图片管理接口

#### 1.1 获取图片列表

获取系统中所有图片的列表。

- URL: `/api/images`
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
        "url": "/upload/a1b2c3d4e5f6g7h8i9j0.jpg",
        "size": 1024000,
        "type": "image/jpeg",
        "userId": "default-user-id",
        "createdAt": "2023-04-01T12:00:00.000Z",
        "updatedAt": "2023-04-01T12:00:00.000Z"
      },
      // 更多图片...
    ],
    "page": 1,
    "limit": 50
  }
}
```

- 使用示例:

```javascript
// 使用fetch获取图片列表
fetch('http://localhost:3000/api/images?page=1&limit=10&sort=name_asc')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.2 上传图片

上传新图片到系统。

- URL: `/api/images/upload`
- 方法: `POST`
- Content-Type: `multipart/form-data`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file | File | 是 | 图片或视频文件 |
| name | string | 否 | 自定义文件名，不提供则使用当前时间戳命名 |
| description | string | 否 | 文件描述 |

**注意**: 当未提供自定义名称时，系统会使用"YYYYMMDD-HHMMSS"格式的时间戳作为文件名，例如"20231219-153045.jpg"。

- 响应示例:

```json
{
  "code": 200,
  "message": "图片上传成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "自定义名称.jpg",
    "description": "这是一张美丽的风景照片",
    "url": "/upload/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "default-user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:00:00.000Z"
  }
}
```

- 使用示例:

```javascript
// 使用FormData上传图片
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"]');
formData.append('file', fileInput.files[0]);
formData.append('name', '我的图片');
formData.append('description', '这是一张美丽的风景照片');

fetch('http://localhost:3000/api/images/upload', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.3 删除图片

删除指定图片。

- URL: `/api/images/{imageId}`
- 方法: `DELETE`
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

- 使用示例:

```javascript
// 删除指定ID的图片
const imageId = '550e8400-e29b-41d4-a716-446655440000';

fetch(`http://localhost:3000/api/images/${imageId}`, {
  method: 'DELETE'
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.4 批量删除图片

批量删除多张图片。

- URL: `/api/images/batch`
- 方法: `DELETE`
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

- 使用示例:

```javascript
// 批量删除图片
const imageIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001'
];

fetch('http://localhost:3000/api/images/batch', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ imageIds })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.5 更新图片信息

更新图片的名称、描述等信息。

- URL: `/api/images/{imageId}`
- 方法: `PUT`
- Content-Type: `application/json`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| imageId | string | 是 | 图片ID，路径参数 |

- 请求体:

```json
{
  "name": "新的图片名称",
  "description": "新的图片描述"
}
```

- 响应示例:

```json
{
  "code": 200,
  "message": "图片信息更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新的图片名称",
    "description": "新的图片描述",
    "url": "/upload/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "default-user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:30:00.000Z"
  }
}
```

- 使用示例:

```javascript
// 更新图片信息
const imageId = '550e8400-e29b-41d4-a716-446655440000';
const updateData = {
  name: '新的图片名称',
  description: '新的图片描述'
};

fetch(`http://localhost:3000/api/images/${imageId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.6 获取图片详情

获取单张图片的详细信息。

- URL: `/api/images/{imageId}`
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
    "url": "/upload/a1b2c3d4e5f6g7h8i9j0.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "default-user-id",
    "createdAt": "2023-04-01T12:00:00.000Z",
    "updatedAt": "2023-04-01T12:00:00.000Z"
  }
}
```

- 使用示例:

```javascript
// 获取图片详情
const imageId = '550e8400-e29b-41d4-a716-446655440000';

fetch(`http://localhost:3000/api/images/${imageId}`)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 1.7 批量上传图片

批量上传多张图片到系统。

- URL: `/api/images/batch-upload`
- 方法: `POST`
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

- 使用示例:

```javascript
// 批量上传图片
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"][multiple]');

// 添加多个文件
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('files', fileInput.files[i]);
  // 可选：添加名称和描述
  formData.append('names[]', `自定义名称${i+1}`);
  formData.append('descriptions[]', `这是第${i+1}张图片的描述`);
}

fetch('http://localhost:3000/api/images/batch-upload?count=20', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 5. 文件分片上传接口

大文件上传时，可以使用分片上传功能，将文件切分成多个小块逐个上传，然后在服务器端合并。这种方式可以有效解决大文件上传的问题，并支持断点续传。

#### 5.1 验证分片状态

查询指定文件已上传的分片状态。

- URL: `/api/chunk/verify`
- 方法: `GET`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| chunkTotal | number | 是 | 文件分片总数 |

- 响应示例:

```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "fileHash": "d41d8cd98f00b204e9800998ecf8427e",
    "uploadedChunks": [0, 1, 2], // 已上传的分片索引
    "isComplete": false // 是否已上传完所有分片
  }
}
```

#### 5.2 上传文件分片

上传单个文件分片。

- URL: `/api/chunk/upload`
- 方法: `POST`
- Content-Type: `multipart/form-data`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| file | File | 是 | 分片文件内容 |
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| chunkIndex | number | 是 | 当前分片的索引（从0开始） |
| chunkTotal | number | 是 | 分片总数 |
| chunkMD5 | string | 否 | 当前分片的MD5值（用于校验） |

- 响应示例:

```json
{
  "code": 200,
  "message": "分片上传成功",
  "data": {
    "fileHash": "d41d8cd98f00b204e9800998ecf8427e",
    "chunkIndex": 0
  }
}
```

#### 5.3 合并文件分片

所有分片上传完成后，请求服务器合并分片。

- URL: `/api/chunk/merge`
- 方法: `POST`
- Content-Type: `application/json`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| fileName | string | 是 | 文件名（包括扩展名） |
| chunkTotal | number | 是 | 分片总数 |
| fileMD5 | string | 否 | 完整文件的MD5值（用于校验） |
| description | string | 否 | 文件描述 |

- 响应示例:

```json
{
  "code": 200,
  "message": "文件合并成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "example.jpg",
    "description": "",
    "url": "https://example.com/path/to/file.jpg",
    "size": 1024000,
    "type": "image/jpeg",
    "userId": "user123",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:00:00Z"
  }
}
```

#### 5.4 清理过期分片

清理过期未合并的分片文件。

- URL: `/api/chunk/cleanup`
- 方法: `DELETE`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`
- 查询参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| expireHours | number | 否 | 过期时间（小时），默认24小时 |

- 响应示例:

```json
{
  "code": 200,
  "message": "清理过期分片完成",
  "data": {
    "deletedCount": 10
  }
}
```

**注意**: 更详细的分片上传使用说明请参考 `docs/chunk-upload-api.md` 文档。

### 2. 收藏管理接口

#### 2.1 获取收藏列表

获取用户收藏的图片列表。

- URL: `/api/favorites`
- 方法: `GET`
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
        "userId": "default-user-id",
        "createdAt": "2023-04-02T10:00:00.000Z",
        "updatedAt": "2023-04-02T10:00:00.000Z",
        "image": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "风景照片.jpg",
          "description": "美丽的山水风景",
          "url": "/upload/a1b2c3d4e5f6g7h8i9j0.jpg",
          "type": "image/jpeg",
          "createdAt": "2023-04-01T12:00:00.000Z"
        }
      },
      // 更多收藏...
    ],
    "page": 1,
    "limit": 50
  }
}
```

- 使用示例:

```javascript
// 获取收藏列表
fetch('http://localhost:3000/api/favorites?page=1&limit=10')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 2.2 添加到收藏

将图片添加到收藏。

- URL: `/api/favorites`
- 方法: `POST`
- Content-Type: `application/json`
- 请求体:

```json
{
  "imageId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- 响应示例:

```json
{
  "code": 200,
  "message": "添加收藏成功",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "imageId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "default-user-id",
    "createdAt": "2023-04-02T10:00:00.000Z",
    "updatedAt": "2023-04-02T10:00:00.000Z"
  }
}
```

- 使用示例:

```javascript
// 添加图片到收藏
const imageId = '550e8400-e29b-41d4-a716-446655440000';

fetch('http://localhost:3000/api/favorites', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ imageId })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 2.3 从收藏中删除

将图片从收藏中删除。

- URL: `/api/favorites/{imageId}`
- 方法: `DELETE`
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

- 使用示例:

```javascript
// 从收藏中删除图片
const imageId = '550e8400-e29b-41d4-a716-446655440000';

fetch(`http://localhost:3000/api/favorites/${imageId}`, {
  method: 'DELETE'
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 2.4 批量添加收藏

将多张图片批量添加到收藏。

- URL: `/api/favorites/batch`
- 方法: `POST`
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
  "message": "批量添加收藏处理完成，成功: 2, 失败: 1",
  "data": {
    "succeeded": {
      "count": 2,
      "items": [
        {
          "id": "id1",
          "imageId": "id1"
        },
        {
          "id": "id2",
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

- 使用示例:

```javascript
// 批量添加收藏
const imageIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001'
];

fetch('http://localhost:3000/api/favorites/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ imageIds })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

#### 2.5 批量取消收藏

将多张图片从收藏中批量删除。

- URL: `/api/favorites/batch`
- 方法: `DELETE`
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
  "message": "批量取消收藏处理完成，成功: 2, 失败: 1",
  "data": {
    "succeeded": {
      "count": 2,
      "items": [
        {
          "id": "id1",
          "imageId": "id1"
        },
        {
          "id": "id2",
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

- 使用示例:

```javascript
// 批量取消收藏
const imageIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001'
];

fetch('http://localhost:3000/api/favorites/batch', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ imageIds })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

## 部署说明

1. 克隆项目到本地：
   ```bash
   git clone <repository-url>
   cd koa-kiripet
   ```

2. 安装依赖：
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   npm install
   ```

3. 配置环境变量(创建.env文件)：
   ```
   # 应用配置
   APP_PORT=3000
   
   # 数据库配置
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PWD=password
   MYSQL_DB=kiripet
   
   # JWT配置
   JWT_SECRET=your_jwt_secret
   
   # Cloudflare R2配置
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_ACCESS_KEY_SECRET=your_access_key_secret
   R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_URL=https://your-public-url   # 可选，如果配置了公共访问
   ```

4. 配置Cloudflare R2（详见 `R2_CONFIG.md` 文件）:
   - 创建R2存储桶
   - 配置访问权限
   - 获取API凭证

5. 启动应用：
   ```bash
   npm run dev
   ```

6. 访问API：
   默认地址为 `http://localhost:3000`

# 用户身份认证系统

项目已添加完整的用户认证和授权系统，基于JWT令牌实现。

## 主要功能

- 用户注册与登录
- 基于JWT的无状态认证
- 路由级别的权限控制
- 敏感操作的用户身份验证
- 用户信息管理（个人资料修改、密码修改）

## 用户API

### 用户注册

- URL: `/api/user/register`
- 方法: `POST`
- Content-Type: `application/json`
- 请求体:

```json
{
  "username": "exampleuser",
  "password": "password123",
  "nickname": "User Nickname",
  "email": "user@example.com"
}
```

### 用户登录

- URL: `/api/user/login`
- 方法: `POST`
- Content-Type: `application/json`
- 请求体:

```json
{
  "username": "exampleuser",
  "password": "password123"
}
```

### 获取用户信息

- URL: `/api/user/info`
- 方法: `GET`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`

### 修改用户信息

- URL: `/api/user/update`
- 方法: `PUT`
- Content-Type: `application/json`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| nickname | string | 否 | 用户昵称 |
| avatar | string | 否 | 头像URL地址 |

**注意**: 需要至少提供一个字段进行更新，否则会返回400错误。

- 请求体示例:

```json
{
  "nickname": "新昵称",
  "avatar": "https://kirii.online/avatar.jpg"
}
```

- 响应示例:

```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "exampleuser",
    "nickname": "新昵称",
    "avatar": "https://kirii.online/avatar.jpg",
    "email": "user@example.com",
    "createdAt": "2023-01-01T12:00:00.000Z",
    "updatedAt": "2023-01-10T15:30:00.000Z"
  }
}
```

- 可能的错误码:

| 状态码 | 描述 |
|--------|------|
| 400 | 没有提供要更新的字段 |
| 401 | 未登录或登录已过期 |
| 500 | 服务器内部错误 |

- 使用示例:

```javascript
// 修改用户信息
const updateData = {
  nickname: "新昵称",
  avatar: "https://kirii.online/avatar.jpg"
};

fetch('http://localhost:3000/api/user/update', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(updateData)
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### 修改密码

- URL: `/api/user/password`
- 方法: `PUT`
- Content-Type: `application/json`
- 请求头: 需要包含授权令牌 `Authorization: Bearer <token>`
- 请求参数:

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| oldPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |

**注意**: 新密码不能与旧密码相同，且两个字段都必须提供。

- 请求体示例:

```json
{
  "oldPassword": "当前密码",
  "newPassword": "新密码"
}
```

- 响应示例:

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

- 可能的错误码:

| 状态码 | 描述 |
|--------|------|
| 400 | 旧密码不正确/新旧密码不能相同/密码不能为空 |
| 401 | 未登录或登录已过期 |
| 500 | 服务器内部错误 |

- 使用示例:

```javascript
// 修改密码
const passwordData = {
  oldPassword: "当前密码",
  newPassword: "新密码"
};

fetch('http://localhost:3000/api/user/password', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(passwordData)
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## 文档

详细的认证系统文档见 [docs/auth_system.md](docs/auth_system.md)
完整的API文档见 [docs/API.md](docs/API.md)
