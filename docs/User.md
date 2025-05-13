# 用户API文档

本文档描述了KiriPet图片管理系统中与用户相关的API接口、参数和使用示例。

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

## 用户认证接口

### 1.1 用户注册

- URL: `/api/user/register`
- 方法: `POST`
- Content-Type: `application/json`
- 请求参数:

| 参数名    | 类型   | 必填 | 描述 |
|----------|--------|------|------|
| username | string | 是   | 用户名 |
| password | string | 是   | 密码 |
| nickname | string | 否   | 昵称，默认为用户名 |
| email    | string | 否   | 邮箱 |

- 响应示例:

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

### 1.2 用户登录

- URL: `/api/user/login`
- 方法: `POST`
- Content-Type: `application/json`
- 请求参数:

| 参数名    | 类型   | 必填 | 描述 |
|----------|--------|------|------|
| username | string | 是   | 用户名 |
| password | string | 是   | 密码 |

- 响应示例:

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

### 1.3 获取用户信息

- URL: `/api/user/info`
- 方法: `GET`
- 认证: 需要Bearer Token
- 响应示例:

```json
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": "user-uuid",
    "username": "example",
    "nickname": "用户昵称",
    "email": "user@example.com",
    "avatar": "https://kirii.online/6.jpg.jpg",
    "isAdmin": false
  }
}
```

### 1.4 检查管理员状态

- URL: `/api/user/admin-status`
- 方法: `GET`
- 认证: 需要Bearer Token
- 描述: 检查当前登录用户是否为管理员
- 响应示例:

```json
{
  "code": 200,
  "message": "获取管理员状态成功",
  "data": {
    "isAdmin": false
  }
}
```

### 1.5 修改用户信息

- URL: `/api/user/update`
- 方法: `PUT`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

| 参数名    | 类型   | 必填 | 描述 |
|----------|--------|------|------|
| nickname | string | 否   | 新的昵称 |
| avatar   | string | 否   | 新的头像URL |

- 响应示例:

```json
{
  "code": 200,
  "message": "用户信息更新成功",
  "data": {
    "id": "user-uuid",
    "username": "example",
    "nickname": "新的昵称",
    "email": "user@example.com",
    "avatar": "https://example.com/new-avatar.jpg",
    "isAdmin": false
  }
}
```

### 1.6 修改密码

- URL: `/api/user/password`
- 方法: `PUT`
- 认证: 需要Bearer Token
- Content-Type: `application/json`
- 请求参数:

| 参数名      | 类型   | 必填 | 描述     |
|------------|--------|------|---------|
| oldPassword | string | 是   | 旧密码   |
| newPassword | string | 是   | 新密码   |

- 响应示例:

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

## 认证说明

对于需要认证的API，请在请求头中添加以下字段：

```
Authorization: Bearer <token>
```

其中`<token>`是通过注册或登录API获取的JWT令牌。


```javascript
// 注册新用户
async function register() {
  const response = await fetch('/api/user/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: 'newuser', 
      password: 'securepass',
      nickname: '新用户'
    })
  });
  return await response.json();
}

// 登录
async function login() {
  const response = await fetch('/api/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user', password: 'pass' })
  });
  return await response.json();
}

// 获取用户信息
async function getUserInfo(token) {
  const response = await fetch('/api/user/info', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
}
``` 