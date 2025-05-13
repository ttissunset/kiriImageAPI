# 数据统计模块 API 文档

本文档描述了系统数据统计模块的 API 接口、参数和使用示例。

## 基本信息

- 基础路径: `/api/stats`
- 所有响应格式统一为 JSON
- 需要管理员权限才能访问这些接口

## API 接口

### 1. 获取系统信息

- **URL**: `/api/stats/system`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取服务器的 CPU、GPU、内存、操作系统、IP 和地理位置等系统信息

#### 请求参数

无需请求参数

#### 响应示例

```json
{
  "code": 200,
  "message": "获取系统信息成功",
  "data": {
    "cpu": "Intel Core i7-10700K",
    "gpu": "NVIDIA GeForce RTX 3080",
    "memory": {
      "total": "32.00 GB",
      "used": "12.50 GB",
      "usage": "39.06%"
    },
    "os": "win32 Windows_NT x64",
    "ip": "203.0.113.1",
    "isp": "中国电信",
    "region": "中国 北京"
  }
}
```

### 2. 获取登录记录

- **URL**: `/api/stats/login-records`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取系统中的用户登录记录，包括登录成功和失败的记录

#### 请求参数

| 参数名   | 类型   | 必选 | 描述                                      |
| -------- | ------ | ---- | ----------------------------------------- |
| page     | number | 否   | 页码，默认为 1                            |
| limit    | number | 否   | 每页记录数，默认为 20                     |
| username | string | 否   | 按用户名筛选                              |
| status   | string | 否   | 按登录状态筛选，可选值: success, failure |

#### 响应示例

```json
{
  "code": 200,
  "message": "获取登录记录成功",
  "data": {
    "total": 126,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user-12345",
        "username": "admin",
        "ip": "203.0.113.1",
        "region": "中国 北京",
        "isp": "中国电信",
        "browser": "Chrome 92.0.4515.159",
        "os": "Windows 10",
        "status": "success",
        "failReason": null,
        "createdAt": "2023-06-10T08:15:30.000Z",
        "updatedAt": "2023-06-10T08:15:30.000Z"
      },
      {
        "id": "7f8d3a20-5c1e-46d9-8f8b-36b7c8e71234",
        "userId": null,
        "username": "user123",
        "ip": "198.51.100.42",
        "region": "中国 上海",
        "isp": "中国移动",
        "browser": "Firefox 89.0",
        "os": "macOS 11.5.2",
        "status": "failure",
        "failReason": "密码错误",
        "createdAt": "2023-06-10T07:42:15.000Z",
        "updatedAt": "2023-06-10T07:42:15.000Z"
      }
    ],
    "page": 1,
    "limit": 20
  }
}
```

#### 错误响应

##### 未认证或令牌无效

```json
{
  "code": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "code": 401,
  "message": "身份验证令牌无效或已过期"
}
```

##### 权限不足

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

##### 服务器错误

```json
{
  "code": 500,
  "message": "服务器内部错误"
}
```

### 3. 获取所有用户

- **URL**: `/api/stats/users`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取系统中的所有用户信息，包括用户名、头像和注册时间等基本信息

#### 请求参数

| 参数名   | 类型   | 必选 | 描述                          |
| -------- | ------ | ---- | ----------------------------- |
| page     | number | 否   | 页码，默认为 1                |
| limit    | number | 否   | 每页记录数，默认为 20         |
| keyword  | string | 否   | 根据用户名搜索                |

#### 响应示例

```json
{
  "code": 200,
  "message": "获取用户列表成功",
  "data": {
    "total": 43,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "role": 1,
        "avatar": "https://kirii.online/6.jpg.jpg",
        "createdAt": "2023-06-10T08:15:30.000Z"
      },
      {
        "id": "7f8d3a20-5c1e-46d9-8f8b-36b7c8e71234",
        "username": "user123",
        "role": 0,
        "avatar": "https://kirii.online/6.jpg.jpg",
        "createdAt": "2023-06-11T07:42:15.000Z"
      }
    ],
    "page": 1,
    "limit": 20
  }
}
```

#### 错误响应

##### 未认证或令牌无效

```json
{
  "code": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "code": 401,
  "message": "身份验证令牌无效或已过期"
}
```

##### 权限不足

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

##### 服务器错误

```json
{
  "code": 500,
  "message": "服务器内部错误"
}
```

### 4. 获取R2存储统计信息

- **URL**: `/api/stats/r2-storage`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取R2对象存储的使用情况，包括文件数量和存储空间大小

#### 请求参数

无需请求参数

#### 响应示例

```json
{
  "code": 200,
  "message": "获取R2存储统计成功",
  "data": {
    "totalFiles": 156,
    "totalStorage": {
      "bytes": 1073741824,
      "formatted": "1.00 GB"
    },
    "bucketName": "kiri-image-bucket"
  }
}
```

#### 错误响应

##### 未认证或令牌无效

```json
{
  "code": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "code": 401,
  "message": "身份验证令牌无效或已过期"
}
```

##### 权限不足

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

##### 服务器错误

```json
{
  "code": 500,
  "message": "获取R2存储统计失败，请检查R2配置和连接状态"
}
```

### 5. 获取上传记录

- **URL**: `/api/stats/upload-records`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取系统中的文件上传记录，包括上传用户、文件数量、文件大小和文件类型等信息

#### 请求参数

| 参数名    | 类型   | 必选 | 描述                                  |
| --------- | ------ | ---- | ------------------------------------- |
| page      | number | 否   | 页码，默认为 1                        |
| limit     | number | 否   | 每页记录数，默认为 20                 |
| username  | string | 否   | 按上传用户名筛选                      |
| fileType  | string | 否   | 按文件类型筛选，可选值: image, video  |
| startDate | string | 否   | 开始日期，格式: YYYY-MM-DD            |
| endDate   | string | 否   | 结束日期，格式: YYYY-MM-DD            |

#### 响应示例

```json
{
  "code": 200,
  "message": "获取上传记录成功",
  "data": {
    "total": 68,
    "items": [
      {
        "id": "c81d4e2e-bcf2-11e6-869b-7df92533d2db",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "username": "admin",
        "fileCount": 3,
        "fileSize": 5242880,
        "fileType": "image",
        "ip": "203.0.113.1",
        "region": "中国 北京",
        "createdAt": "2023-06-15T10:30:45.000Z",
        "updatedAt": "2023-06-15T10:30:45.000Z"
      },
      {
        "id": "d92f3a1c-bcf2-11e6-8b45-6d29c8aab12b",
        "userId": "7f8d3a20-5c1e-46d9-8f8b-36b7c8e71234",
        "username": "user123",
        "fileCount": 1,
        "fileSize": 104857600,
        "fileType": "video",
        "ip": "198.51.100.42",
        "region": "中国 上海",
        "createdAt": "2023-06-15T09:15:30.000Z",
        "updatedAt": "2023-06-15T09:15:30.000Z"
      }
    ],
    "page": 1,
    "limit": 20
  }
}
```

#### 错误响应

##### 未认证或令牌无效

```json
{
  "code": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "code": 401,
  "message": "身份验证令牌无效或已过期"
}
```

##### 权限不足

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

##### 服务器错误

```json
{
  "code": 500,
  "message": "服务器内部错误"
}
```

### 6. 获取当日上传统计

- **URL**: `/api/stats/today-uploads`
- **方法**: `GET`
- **认证**: 需要 Bearer Token，且用户需具有管理员权限
- **描述**: 获取当日文件上传的汇总统计数据，包括文件总数、总大小、图片和视频的分布等

#### 请求参数

无需请求参数

#### 响应示例

```json
{
  "code": 200,
  "message": "获取当日上传统计成功",
  "data": {
    "date": "2023-06-15",
    "totalFiles": 28,
    "totalSize": {
      "bytes": 536870912,
      "formatted": "512.00 MB"
    },
    "imageFiles": 24,
    "videoFiles": 4,
    "uploadCount": 15
  }
}
```

#### 错误响应

##### 未认证或令牌无效

```json
{
  "code": 401,
  "message": "未提供身份验证令牌"
}
```

或

```json
{
  "code": 401,
  "message": "身份验证令牌无效或已过期"
}
```

##### 权限不足

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

##### 服务器错误

```json
{
  "code": 500,
  "message": "服务器内部错误"
}
```

## 响应字段说明

### 系统信息

| 字段                | 描述              |
| ------------------- | ----------------- |
| cpu                 | CPU 信息          |
| gpu                 | GPU 信息          |
| memory.total        | 系统总内存        |
| memory.used         | 已使用内存        |
| memory.usage        | 内存使用率        |
| os                  | 操作系统信息      |
| ip                  | 服务器公网 IP     |
| isp                 | 互联网服务提供商  |
| region              | 所在地区          |

### 登录记录

| 字段       | 描述                             |
| ---------- | -------------------------------- |
| id         | 记录唯一标识                     |
| userId     | 用户ID（登录失败时可能为空）     |
| username   | 用户名                           |
| ip         | 登录IP地址                       |
| region     | 地区/城市                        |
| isp        | 网络服务提供商                   |
| browser    | 浏览器信息                       |
| os         | 操作系统信息                     |
| status     | 登录状态（success/failure）      |
| failReason | 失败原因（登录成功时为null）     |
| createdAt  | 记录创建时间                     |
| updatedAt  | 记录更新时间                     |

### 用户信息

| 字段       | 描述                                       |
| ---------- | ------------------------------------------ |
| id         | 用户唯一标识                               |
| username   | 用户名                                     |
| role       | 用户角色（1:管理员, 0:普通用户）           |
| avatar     | 用户头像URL                                |
| createdAt  | 用户注册时间                               |

### R2存储统计

| 字段                   | 描述                           |
| ---------------------- | ------------------------------ |
| totalFiles             | 存储的文件总数                 |
| totalStorage.bytes     | 存储空间大小（字节）           |
| totalStorage.formatted | 存储空间大小（格式化后的可读值）|
| bucketName             | 存储桶名称                     |

### 上传记录

| 字段       | 描述                                   |
| ---------- | -------------------------------------- |
| id         | 记录唯一标识                           |
| userId     | 上传用户ID                             |
| username   | 上传用户名                             |
| fileCount  | 上传文件数量                           |
| fileSize   | 上传文件总大小（字节）                 |
| fileType   | 文件类型（image或video）               |
| ip         | 上传者IP地址                           |
| region     | 上传者地区                             |
| createdAt  | 记录创建时间                           |
| updatedAt  | 记录更新时间                           |

### 当日上传统计

| 字段          | 描述                                |
| ------------- | ----------------------------------- |
| date          | 统计日期（YYYY-MM-DD格式）          |
| totalFiles    | 上传文件总数                        |
| totalSize.bytes | 上传文件总大小（字节）            |
| totalSize.formatted | 上传文件总大小（格式化后的可读值）|
| imageFiles    | 图片文件数量                        |
| videoFiles    | 视频文件数量                        |
| uploadCount   | 上传操作次数                        |
 