/**
 * API服务器实现
 * 提供HTTP接口查询IP信息
 */
const express = require('express');
const path = require('path');
const { checkAndUpdateRawJs, formatDate } = require('./fetcher');
const getCookies = require('../cookieGetter');
const { queryIpInfo } = require('./parser');

/**
 * 格式化执行时间
 * @param {number} milliseconds - 毫秒
 * @returns {string} - 格式化后的时间
 */
function formatTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

/**
 * 创建并配置API服务器
 * @param {Object} options - 服务器配置选项
 * @param {number} options.port - 服务器端口，默认8080
 * @param {string} options.apiKey - API密钥，如果提供则启用验证
 * @param {boolean} options.isVerbose - 是否输出详细日志
 * @param {boolean} options.forceUpdateRaw - 是否强制更新raw.js文件
 * @returns {Object} - Express应用实例和启动服务器的函数
 */
function createServer(options = {}) {
  const { port = 8080, apiKey = null, isVerbose = false, forceUpdateRaw = false } = options;
  const app = express();
  
  // 配置中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 添加静态文件服务
  app.use(express.static(path.join(__dirname, '../../public')));
  
  // 请求日志中间件
  if (isVerbose) {
    app.use((req, res, next) => {
      const start = Date.now();
      const logRequest = () => {
        const duration = Date.now() - start;
        console.log(
          formatDate(new Date()),
          `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
        );
      };
      
      res.on('finish', logRequest);
      next();
    });
  }
  
  // API密钥验证中间件
  function authenticateApiKey(req, res, next) {
    if (!apiKey) {
      return next(); // 如果未设置API密钥，则跳过验证
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: true,
        message: '未提供API密钥，请添加Authorization: Bearer YOUR_API_KEY请求头'
      });
    }
    
    const providedKey = authHeader.substring(7); // 去掉'Bearer '前缀
    if (providedKey !== apiKey) {
      return res.status(403).json({
        error: true,
        message: 'API密钥无效'
      });
    }
    
    next();
  }
  
  // 查询处理函数
  async function handleQuery(req, res) {
    // 记录总执行时间
    const totalStartTime = Date.now();
    
    try {
      // 获取IP参数
      const ip = req.query.ip || (req.body && req.body.ip) || '';
      
      if (isVerbose && ip) {
        console.log(formatDate(new Date()), `查询IP: ${ip}`);
      }
      
      // 步骤1: 检查raw.js
      const step1StartTime = Date.now();
      if (isVerbose) {
        console.log(formatDate(new Date()), '正在检查raw.js...');
      }
      const { x1, difficulty } = await checkAndUpdateRawJs(false, isVerbose);
      
      if (isVerbose) {
        const step1Time = Date.now() - step1StartTime;
        console.log(formatDate(new Date()), `步骤1完成，耗时: ${formatTime(step1Time)}`);
      }
      
      // 步骤2: 获取Cookie
      const step2StartTime = Date.now();
      if (isVerbose) console.log(formatDate(new Date()), '正在获取必要的Cookie...');
      const cookies = await getCookies(x1, difficulty, isVerbose);
      
      if (!cookies.js1key || !cookies.pow) {
        console.error(formatDate(new Date()), '获取必要的cookie失败');
        return res.status(500).json({
          error: true,
          message: '获取Cookie失败'
        });
      }
      
      if (isVerbose) {
        const step2Time = Date.now() - step2StartTime;
        console.log(formatDate(new Date()), `步骤2完成，耗时: ${formatTime(step2Time)}`);
      }
      
      // 步骤3: 查询IP信息
      const step3StartTime = Date.now();
      const ipInfo = await queryIpInfo(cookies, ip, isVerbose);
      
      if (isVerbose) {
        const step3Time = Date.now() - step3StartTime;
        console.log(formatDate(new Date()), `步骤3完成，耗时: ${formatTime(step3Time)}`);
        
        // 总耗时
        const totalTime = Date.now() - totalStartTime;
        console.log(formatDate(new Date()), `总耗时: ${formatTime(totalTime)}`);
        console.log(formatDate(new Date()), '-------------------------------------');
      }
      
      // 返回结果
      res.json(ipInfo);
    } catch (error) {
      console.error(formatDate(new Date()), '执行过程中出错:', error.message);
      
      // 创建错误响应对象
      const errorResponse = {
        error: true,
        message: error.message || '未知错误'
      };
      
      // 使用上游服务返回的状态码，如果没有则使用500
      const httpStatus = error.status || 500;
      errorResponse.status = httpStatus;
      
      res.status(httpStatus).json(errorResponse);
    }
  }
  
  // 注册路由
  app.get('/query', authenticateApiKey, handleQuery);
  app.post('/query', authenticateApiKey, handleQuery);
  
  // 根路由处理
  app.get('/', (req, res) => {
    res.json({
      name: 'Pong0-JS API',
      version: '1.0.0',
      endpoints: {
        query: {
          url: '/query',
          methods: ['GET', 'POST'],
          params: {
            ip: '(可选) 要查询的IP地址，默认为当前IP'
          }
        }
      }
    });
  });
  
  // 启动服务器函数
  async function startServer() {
    try {
      // 如果指定了--raw参数，在启动时更新raw.js
      if (forceUpdateRaw) {
        if (isVerbose) {
          console.log(formatDate(new Date()), '检测到--raw参数，将更新raw.js文件');
        }
        await checkAndUpdateRawJs(true, isVerbose);
      }
      
      return new Promise((resolve, reject) => {
        try {
          const server = app.listen(port, () => {
            if (isVerbose) {
              console.log(formatDate(new Date()), '-------------------------------------');
              console.log(formatDate(new Date()), 'Pong0-JS API服务器');
              console.log(formatDate(new Date()), '-------------------------------------');
            }
            
            console.log(formatDate(new Date()), `API服务器运行在: http://localhost:${port}`);
            console.log(formatDate(new Date()), `- 查询当前IP: GET http://localhost:${port}/query`);
            console.log(formatDate(new Date()), `- 查询指定IP: GET http://localhost:${port}/query?ip=1.1.1.1`);
            
            if (apiKey) {
              console.log(formatDate(new Date()), '- API密钥验证已启用，请在请求中添加Authorization头');
            }
            
            if (isVerbose) {
              console.log(formatDate(new Date()), '详细日志模式已启用');
              console.log(formatDate(new Date()), '-------------------------------------');
            }
            
            resolve(server);
          });
          
          // 错误处理
          server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.error(formatDate(new Date()), `错误: 端口 ${port} 已被占用，请尝试其他端口`);
            } else {
              console.error(formatDate(new Date()), '启动服务器失败:', err.message);
            }
            reject(err);
          });
        } catch (err) {
          console.error(formatDate(new Date()), '创建服务器失败:', err.message);
          reject(err);
        }
      });
    } catch (err) {
      console.error(formatDate(new Date()), '启动服务器失败:', err.message);
      throw err;
    }
  }
  
  return { app, startServer };
}

module.exports = createServer; 