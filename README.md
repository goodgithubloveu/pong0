# Pong0-JS

Ping0.cc网站数据获取工具(JavaScript版)

## 功能特性

- 支持查询单个IP信息
- 支持API服务器模式
- 支持详细执行信息显示
- 跨平台支持 (Windows, Linux, macOS)
- 支持x64和ARM架构

## 使用方法

### 命令行模式

```bash
# 查询单个IP
pong0 -i 1.1.1.1

# 显示详细执行信息
pong0 -i 1.1.1.1 -a

# 强制更新raw.js文件
pong0 -r
```

### API服务器模式

```bash
# 启动API服务器（默认端口8080）
pong0 -s

# 指定端口启动
pong0 -s -p 3000

# 启动时更新raw.js
pong0 -s -r

# 显示详细日志
pong0 -s -a
```

### API接口说明

#### 查询IP信息
- 请求方式：GET/POST
- 路径：`/query`
- 参数：
  - `ip`: 要查询的IP地址（可选）
  - `raw`: 是否强制更新raw.js（可选，true/false）

示例：
```bash
# GET请求
curl "http://localhost:8080/query?ip=1.1.1.1"

# POST请求
curl -X POST -H "Content-Type: application/json" -d '{"ip":"1.1.1.1"}' http://localhost:8080/query
```

## 命令行参数

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --ip | -i | 要查询的IP地址 | - |
| --all | -a | 显示详细执行信息 | false |
| --serve | -c | 启动API服务器模式 | false |
| --port | -p | API服务器端口 | 8080 |
| --key | -k | API服务器密钥 | - |
| --raw | -r | 强制更新raw.js文件 | false |
| --help | -h | 显示帮助信息 | - |
| --version | -v | 显示版本信息 | - |

## 构建说明

### 本地构建（仅Windows）

1. 安装依赖：
```bash
npm install
```

2. 构建：
```bash
npm run build
```

构建完成后，可执行文件将位于 `dist` 目录。

### 使用GitHub Actions构建（所有平台）

本项目使用GitHub Actions自动构建所有平台的可执行文件。支持的平台包括：

- Windows (x64, arm64)
- Linux (x64, arm64)
- macOS (x64, arm64)

获取构建文件：
1. 在GitHub仓库的Actions页面
2. 选择最新的成功构建
3. 在Artifacts部分下载对应平台的zip文件

## 系统要求

- Node.js 14.0.0 或更高版本（仅开发时需要）
- 支持的操作系统：
  - Windows 7/8/10/11
  - Linux (主流发行版)
  - macOS 10.13 或更高版本
