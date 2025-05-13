# 认证与授权系统

本文档描述了系统的用户认证与授权机制。

## 概述

系统采用基于JWT(JSON Web Token)的认证机制，主要包括以下组件：

- 用户注册API
- 用户登录API
- JWT令牌生成与验证
- 认证中间件
- 路由权限控制

## 注册API

### 接口信息

- **URL**: `/api/user/register`
- **方法**: POST
- **描述**: 用户注册并获取JWT令牌

### 请求参数

| 参数名   | 类型   | 必选 | 描述   |
|---------|--------|------|--------|
| username | string | 是   | 用户名 |
| password | string | 是   | 密码   |
| nickname | string | 否   | 昵称，默认为用户名 |
| email    | string | 否   | 邮箱   |

### 响应示例

#### 成功响应

```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "username": "example",
      "nickname": "用户昵称",
      "email": "user@example.com",
      "avatar": "https://kirii.online/6.jpg.jpg"
    }
  }
}
```

#### 错误响应

```json
{
  "code": 409,
  "message": "用户名已存在"
}
```

## 登录API

### 接口信息

- **URL**: `/api/user/login`
- **方法**: POST
- **描述**: 用户登录并获取JWT令牌

### 请求参数

| 参数名   | 类型   | 必选 | 描述   |
|---------|--------|------|--------|
| username | string | 是   | 用户名 |
| password | string | 是   | 密码   |

### 响应示例

#### 成功响应

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "username": "example",
      "nickname": "用户昵称",
      "email": "user@example.com",
      "avatar": "https://kirii.online/6.jpg.jpg"
    }
  }
}
```

#### 错误响应

```json
{
  "code": 401,
  "message": "密码错误"
}
```

## 用户信息API

### 接口信息

- **URL**: `/api/user/info`
- **方法**: GET
- **描述**: 获取当前登录用户信息
- **认证**: 需要有效JWT令牌

### 请求头

| 字段名        | 描述                             |
|--------------|----------------------------------|
| Authorization | Bearer Token (如: "Bearer eyJhbGc...") |

### 响应示例

```json
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": "user-uuid",
    "username": "example",
    "nickname": "用户昵称",
    "email": "user@example.com",
    "avatar": "https://kirii.online/6.jpg.jpg"
  }
}
```

## 认证中间件

系统使用中间件对需要认证的路由进行保护。认证中间件解析请求头中的JWT令牌，并将用户信息存储在`ctx.state.user`中供后续处理使用。

### 认证流程

1. 检查请求头中是否包含`Authorization`字段
2. 从`Authorization`中提取JWT令牌
3. 验证令牌的有效性
4. 如果有效，将解析的用户信息存入`ctx.state.user`
5. 如果无效，返回401错误

## 受保护的API路由

系统中以下API需要认证：

### 图片相关

- `POST /api/image/upload` - 上传图片
- `POST /api/image/batch-upload` - 批量上传图片
- `DELETE /api/image/:imageId` - 删除图片
- `PUT /api/image/:imageId` - 更新图片信息
- `POST /api/image/batch-delete` - 批量删除图片

### 收藏相关

- `GET /api/favorite/list` - 获取收藏列表
- `POST /api/favorite/add/:imageId` - 添加收藏
- `DELETE /api/favorite/remove/:imageId` - 移除收藏
- `GET /api/favorite/status/:imageId` - 查询收藏状态
- `POST /api/favorite/batch` - 批量添加收藏
- `DELETE /api/favorite/batch` - 批量移除收藏

## 权限控制

系统支持基本的用户权限控制功能，主要分为普通用户和管理员两种角色。

### 用户角色

1. **普通用户**：
   - 可以访问基本功能，如上传和管理自己的图片
   - 不能访问管理功能

2. **管理员**：
   - 具有普通用户的所有权限
   - 可以访问管理功能，如用户管理、系统设置等
   - 可以查看和管理所有用户的内容

### 管理员权限检查

系统提供了专门的中间件用于检查用户是否具有管理员权限：

```javascript
// 使用示例
const { adminAuth } = require('../middleware/auth.middleware');

// 在路由定义中添加管理员权限验证
router.get('/admin/dashboard', adminAuth, adminController.getDashboard);
```

当非管理员用户尝试访问需要管理员权限的接口时，将返回以下错误响应：

```json
{
  "code": 403,
  "message": "权限不足，需要管理员权限"
}
```

### 检查管理员状态API

- **URL**: `/api/user/admin-status`
- **方法**: GET
- **描述**: 检查当前登录用户是否具有管理员权限
- **认证**: 需要Bearer Token

#### 响应示例

```json
{
  "code": 200,
  "message": "获取管理员状态成功",
  "data": {
    "isAdmin": true
  }
}
```

## 前端使用指南

### 注册和登录流程

1. 用户注册或登录获取token
2. 将token存储在本地存储（localStorage或sessionStorage）
3. 在后续请求中添加Authorization请求头

### 请求示例（使用Fetch API）

```javascript
// 注册请求
async function register(username, password, nickname, email) {
  const response = await fetch('/api/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      username, 
      password,
      nickname,
      email 
    }),
  });
  return await response.json();
}

// 登录请求
async function login(username, password) {
  const response = await fetch('/api/user/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  return await response.json();
}

// 带认证的请求
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // 处理401错误，可能需要重新登录
  if (response.status === 401) {
    // 重定向到登录页或刷新token
  }
  
  return await response.json();
}
```

## 安全性考虑

- 密码存储采用bcrypt加密
- JWT令牌有效期为7天
- 敏感操作应验证用户身份和权限
- 前端应在登出时清除存储的token
- 如有可能，建议使用HTTPS保护API通信 