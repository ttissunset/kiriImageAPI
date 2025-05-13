# 文件分片上传 API 文档

本文档描述了文件分片上传的相关 API 接口。

## 基本流程

文件分片上传的基本流程如下：

1. 前端计算文件hash（一般使用MD5）
2. 通过验证接口查询已上传的分片
3. 上传缺失的分片
4. 所有分片上传完成后，调用合并接口
5. 获取上传成功的文件信息

## API 接口

### 1. 验证分片

#### 请求

```
GET /api/chunk/verify
```

#### 查询参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| chunkTotal | number | 是 | 文件分片总数 |

#### 响应

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

### 2. 上传分片

#### 请求

```
POST /api/chunk/upload
```

#### 请求头

需要包含授权令牌：

```
Authorization: Bearer <token>
```

#### 请求体

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| file | File | 是 | 分片文件内容 |
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| chunkIndex | number | 是 | 当前分片的索引（从0开始） |
| chunkTotal | number | 是 | 分片总数 |
| chunkMD5 | string | 否 | 当前分片的MD5值（用于校验） |

Content-Type: multipart/form-data

#### 响应

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

### 3. 合并分片

#### 请求

```
POST /api/chunk/merge
```

#### 请求头

需要包含授权令牌：

```
Authorization: Bearer <token>
```

#### 请求体

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| fileHash | string | 是 | 文件的唯一标识（MD5） |
| fileName | string | 是 | 文件名（包括扩展名） |
| chunkTotal | number | 是 | 分片总数 |
| fileMD5 | string | 否 | 完整文件的MD5值（用于校验） |
| description | string | 否 | 文件描述 |

Content-Type: application/json

#### 响应

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

### 4. 清理过期分片

#### 请求

```
DELETE /api/chunk/cleanup
```

#### 请求头

需要包含授权令牌：

```
Authorization: Bearer <token>
```

#### 查询参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| expireHours | number | 否 | 过期时间（小时），默认24小时 |

#### 响应

```json
{
  "code": 200,
  "message": "清理过期分片完成",
  "data": {
    "deletedCount": 10
  }
}
```

## 错误码说明

| 错误码 | 描述 |
| --- | --- |
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 500 | 服务器内部错误 |

## 前端实现示例

### 计算文件 MD5

```javascript
async function calculateFileMD5(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const result = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(e.target.result)).toString();
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
```

### 文件分片

```javascript
function createChunks(file, chunkSize = 1024 * 1024) {
  const chunks = [];
  let start = 0;
  
  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    chunks.push(chunk);
    start = end;
  }
  
  return chunks;
}
```

### 上传流程示例

```javascript
async function uploadFile(file) {
  // 1. 计算文件hash
  const fileHash = await calculateFileMD5(file);
  
  // 2. 创建分片
  const chunkSize = 2 * 1024 * 1024; // 2MB
  const chunks = createChunks(file, chunkSize);
  
  // 3. 验证已上传的分片
  const verifyRes = await axios.get('/api/chunk/verify', {
    params: {
      fileHash,
      chunkTotal: chunks.length
    }
  });
  
  const { uploadedChunks, isComplete } = verifyRes.data.data;
  
  // 如果已完成上传，直接返回
  if (isComplete) {
    return { success: true, message: '文件已存在' };
  }
  
  // 4. 上传缺失的分片
  const uploadTasks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    if (!uploadedChunks.includes(i)) {
      const formData = new FormData();
      formData.append('file', chunks[i]);
      formData.append('fileHash', fileHash);
      formData.append('chunkIndex', i);
      formData.append('chunkTotal', chunks.length);
      
      uploadTasks.push(
        axios.post('/api/chunk/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        })
      );
    }
  }
  
  // 并行上传分片
  await Promise.all(uploadTasks);
  
  // 5. 合并分片
  const mergeRes = await axios.post('/api/chunk/merge', {
    fileHash,
    fileName: file.name,
    chunkTotal: chunks.length,
    description: '通过分片上传'
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return mergeRes.data;
}
``` 