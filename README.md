# Pong0
```
使用方法: pong0 [选项]
选项:
  --ip, -i          要查询的IP地址
  --all, -a         显示详细执行信息
  --serve, -s       启动API服务器模式
  --port, -p        API服务器端口
  --key, -k         API服务器密钥
  --raw, -r         强制更新raw.js文件
  --version, -v     显示版本信息
  --help, -h        显示帮助信息
```

## 服务器模式API接口

服务器模式下提供以下API接口：

### 1. 查询IP信息

- **路径**：`/query`
- **方法**：GET 或 POST
- **认证**：`Authorization: Bearer your-api-key` (如果设置了API密钥)

#### GET请求参数

- `ip`：要查询的IP地址（可选，不提供则查询访问者IP）
- `raw`：是否强制更新raw.js（可选，true/false）

示例：
```
http://localhost:8080/query?ip=1.1.1.1
```

#### POST请求体示例 (JSON)

```json
{
  "ip": "1.1.1.1",
  "raw": false
}
```

### 2. 查看服务器状态

- **路径**：`/status`
- **方法**：GET

示例：
```
http://localhost:8080/status
```

返回示例：
```json
{
  "status": "running",
  "uptime_seconds": 3600,
  "queries": {
    "total": 100,
    "success": 95,
    "error": 5
  },
  "memory": {
    "rss": 50331648,
    "heapTotal": 23068672,
    "heapUsed": 10000000,
    "external": 1000000
  }
}
```

### 3. 首页

- **路径**：`/`
- **方法**：GET

访问服务器根路径将显示一个简单的HTML页面，包含API使用说明。

## 输出格式

Pong0-Deno返回的IP信息为JSON格式，包含以下可能的字段：

```json
{
  "ip": "1.1.1.1",                  // IP地址
  "ipnum": "16843009",              // IP数值表示
  "rdns": "one.one.one.one",        // 反向域名解析
  "longitude": "104.0667",          // 经度
  "latitude": "30.6667",            // 纬度
  "ip_location": "中国 四川 成都",   // IP地理位置
  "country_flag": "cn",             // 国家/地区代码
  "asn": "AS13335",                 // ASN编号
  "asn_owner": "Cloudflare, Inc.",  // ASN所有者
  "asn_type": "IDC",                // ASN类型
  "organization": "Cloudflare",     // 组织名称
  "org_type": "IDC",                // 组织类型
  "ip_type": "CDN；公共DNS",         // IP类型
  "risk_value": "0 低风险",          // 风险等级
  "native_ip": "192.168.1.1"        // 原生IP
}
```

如果查询失败，将返回错误信息：

```json
{
  "error": true,
  "message": "错误信息"
}
```

支持的平台：
- `windows` - Windows (x64)
- `linux` - Linux (x64)
- `linuxArm64` - Linux (ARM64)
- `mac` - macOS Intel (x64)
- `macArm` - macOS Apple Silicon (ARM64)
