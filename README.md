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
## 命令行模式
<details>
  <summary>pong -a</summary>

  ```
  PS C:\Downloads> pong -a
  详细模式已开启
  -------------------------------------
  Pong Pong Pong
  -------------------------------------
  查询IP: 本机IP
  [2025/04/11 15:38:42.534] 获取Ping0.cc首页...
  [2025/04/11 15:38:43.712] 接收到 315 字节的初始页面数据
  [2025/04/11 15:38:43.717] x1值: f8mu7auaq6mliulfi03wl11ce626nm4t
  [2025/04/11 15:38:43.717] difficulty值: f8m
  [2025/04/11 15:38:43.718] JS路径: https://ping0.cc/static/js/a2296d5c180a52cf01f4b428fb97d804.js?t=1744357122
  [2025/04/11 15:38:43.718] 使用本地raw.js文件
  步骤1完成，耗时: 1.19s
  [2025/04/11 15:38:43.720] 已加载JavaScript文件，大小: 327.30 KB
  [2025/04/11 15:38:43.721] 创建浏览器环境...
  [2025/04/11 15:38:43.750] 准备注入JavaScript - 耗时 0ms
  [2025/04/11 15:38:43.771] 已注入JavaScript - 耗时 21ms
  [2025/04/11 15:38:43.772] 开始运行raw.js获取cookie...
  [2025/04/11 15:38:44.002] Cookie已设置: js1key=852180
  [2025/04/11 15:38:44.004] Cookie已设置: pow=64
  [2025/04/11 15:38:44.004] 成功获取cookie
  [2025/04/11 15:38:44.005] 获取到所有必需的cookie:
  [2025/04/11 15:38:44.005] js1key=852180, pow=64
  [2025/04/11 15:38:44.005] 获取cookie完成 - 耗时 255ms
  步骤2完成，耗时: 302.00ms
  [2025/04/11 15:38:44.022] 开始查询本机IP信息...
  [2025/04/11 15:38:44.022] 请求URL: https://ping0.cc/
  [2025/04/11 15:38:45.532] 接收到 43289 字节的响应数据
  [2025/04/11 15:38:45.545] 从JavaScript变量提取到IP信息: 180.124.68.28 
  [2025/04/11 15:38:45.550] 完成HTML解析，已提取IP信息
  [2025/04/11 15:38:45.550] IP信息查询完成，耗时: 1528ms
  步骤3完成，耗时: 1.53s
  总耗时: 3.02s
  -------------------------------------
  {
    "ip": "180.124.68.28",
    "ipnum": "3028042780",
    "longitude": "117.2305",
    "latitude": "34.2490",
    "ip_location": "中国 江苏省徐州市睢宁县睢城街道中国电信",
    "asn": "AS4134",
    "asn_owner": "No.31,Jin-rong Street",
    "asn_type": "ISP",
    "organization": "Chinanet Jiangsu Province Network",
    "org_type": "ISP",
    "ip_type": "家庭宽带IP",
    "risk_value": "4% 极度纯净",
    "native_ip": "原生 IP",
    "princess": "https://linux.do/u/amna"
  }
  ```
</details>

<details>
  <summary>pong -i 8.8.8.8</summary>

  ```
  PS C:\Downloads> pong -i 8.8.8.8
  {
    "ip": "8.8.8.8",
    "ipnum": "134744072",
    "longitude": "-122.1175",
    "latitude": "38.0088",
    "ip_location": "美国 加州 山景城",
    "asn": "AS15169",
    "asn_owner": "Google LLC",
    "asn_type": "IDC",
    "organization": "Google LLC",
    "org_type": "IDC",
    "ip_type": "IDC机房IP；谷歌公共 DNS IP",
    "risk_value": "32% 中性",
    "native_ip": "原生 IP",
    "princess": "https://linux.do/u/amna"
  }
  ```
</details>

<details>
  <summary>pong -i x.com -a</summary>

  ```
  PS C:\Downloads> pong -i x.com -a
  详细模式已开启
  -------------------------------------
  Pong Pong Pong
  -------------------------------------
  查询IP: x.com
  [2025/04/11 16:14:43.449] 获取Ping0.cc首页...
  [2025/04/11 16:14:46.070] 接收到 315 字节的初始页面数据
  [2025/04/11 16:14:46.075] x1值: c0a44fc3c8e2df7d9e1c024b5e72a223
  [2025/04/11 16:14:46.076] difficulty值: c0a
  [2025/04/11 16:14:46.076] JS路径: https://ping0.cc/static/js/a2296d5c180a52cf01f4b428fb97d804.js?t=1744359285
  [2025/04/11 16:14:46.077] 使用本地raw.js文件
  步骤1完成，耗时: 2.63s
  [2025/04/11 16:14:46.078] 已加载JavaScript文件，大小: 327.30 KB
  [2025/04/11 16:14:46.079] 创建浏览器环境...
  [2025/04/11 16:14:46.109] 准备注入JavaScript - 耗时 1ms
  [2025/04/11 16:14:46.129] 已注入JavaScript - 耗时 21ms
  [2025/04/11 16:14:46.130] 开始运行raw.js获取cookie...
  [2025/04/11 16:14:48.575] Cookie已设置: js1key=693234
  [2025/04/11 16:14:48.576] Cookie已设置: pow=1737
  [2025/04/11 16:14:48.577] 成功获取cookie
  [2025/04/11 16:14:48.578] 获取到所有必需的cookie:
  [2025/04/11 16:14:48.578] js1key=693234, pow=1737
  [2025/04/11 16:14:48.579] 获取cookie完成 - 耗时 2471ms
  步骤2完成，耗时: 2.52s
  [2025/04/11 16:14:48.597] 开始查询x.comIP信息...
  [2025/04/11 16:14:48.597] 请求URL: https://ping0.cc/ip/x.com
  [2025/04/11 16:14:50.223] 接收到 46065 字节的响应数据
  [2025/04/11 16:14:50.237] 从JavaScript变量提取到IP信息: 162.159.140.229
  [2025/04/11 16:14:50.241] 完成HTML解析，已提取IP信息
  [2025/04/11 16:14:50.241] IP信息查询完成，耗时: 1644ms
  步骤3完成，耗时: 1.64s
  总耗时: 6.79s
  -------------------------------------
  {
    "ip": "162.159.140.229",
    "ipnum": "2728365285",
    "longitude": "-122.3971",
    "latitude": "37.7621",
    "ip_location": "美国 加州 旧金山",
    "asn": "AS13335",
    "asn_owner": "Cloudflare, Inc.",
    "asn_type": "IDC",
    "organization": "Cloudflare, Inc.",
    "org_type": "IDC",
    "ip_type": "IDC机房IP；CloudFlare CDN IP",
    "risk_value": "26% 中性",
    "native_ip": "原生 IP",
    "princess": "https://linux.do/u/amna"
  }
  ```
</details>

## 服务器模式

服务器模式下提供以下API接口：

### 1. 查询IP信息

- **路径**：`/query`
- **方法**：GET 或 POST
- **认证**：`Authorization: Bearer your-api-key` (如果设置了API密钥)

#### GET请求参数

- `ip`：要查询的IP地址（可选，不提供则查询访问者IP）
- `raw`：是否强制更新raw.js（可选，true/false）
- `clientip`: 是否使用客户端IP进行查询（可选，true/false），此参数优先级低于参数ip

示例：
```
http://localhost:8080/query?ip=1.1.1.1
```

#### POST请求体示例 (JSON)

```json
{
  "ip": "1.1.1.1",
  "raw": false,
  "clientip": true
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
