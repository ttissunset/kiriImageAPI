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
| cpu.manufacturer    | CPU 制造商        |
| cpu.brand           | CPU 型号          |
| cpu.speedMin        | CPU 最小频率(GHz) |
| cpu.speedMax        | CPU 最大频率(GHz) |
| cpu.cores           | CPU 总核心数      |
| cpu.physicalCores   | CPU 物理核心数    |
| gpu[].model         | GPU 型号          |
| gpu[].vendor        | GPU 厂商          |
| gpu[].vram          | GPU 显存(MB)      |
| gpu[].driverVersion | GPU 驱动版本      |
| memory.total        | 系统总内存        |
| memory.used         | 已使用内存        |
| memory.usage        | 内存使用率        |
| os.platform         | 操作系统平台      |
| os.type             | 操作系统类型      |
| os.release          | 操作系统版本      |
| os.arch             | 系统架构          |
| os.hostname         | 主机名            |
| os.uptime           | 系统运行时间(秒)  |
| network.ip          | 服务器公网 IP     |
| network.country     | 服务器所在国家    |
| network.countryCode | 国家代码          |
| network.region      | 所在地区          |
| network.city        | 所在城市          |
| network.lat         | 纬度              |
| network.lon         | 经度              |
| network.isp         | 互联网服务提供商  |
| network.timezone    | 时区              |
