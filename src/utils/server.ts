/**
 * API服务器模块
 * 用于提供HTTP API接口
 */
import { Application, Router } from "oak";
import { formatDate, log } from "./common.ts";
import { getCookies } from "../cookieGetter.ts";
import { queryIpInfo } from "./parser.ts";
import { checkAndUpdateRawJs } from "./fetcher.ts";

// 类型定义
interface ServerConfig {
  port?: number;
  apiKey?: string;
  isVerbose?: boolean;
  forceUpdateRaw?: boolean;
}

// 缓存池和计数器
const queryCounter = {
  total: 0,
  success: 0,
  error: 0,
  lastReset: Date.now()
};

// 创建服务器实例
export function createServer(config: ServerConfig = {}) {
  // 默认配置
  const port = config.port || 8080;
  const apiKey = config.apiKey || null;
  const isVerbose = config.isVerbose || false;
  const forceUpdateRaw = config.forceUpdateRaw || false;
  
  // 创建应用实例
  const app = new Application();
  const router = new Router();
  
  // 获取有效的Cookie - 不再使用缓存
  async function getValidCookies(): Promise<{ js1key: string | null, pow: string | null }> {
    log('获取新的Cookie', isVerbose);
    
    // 检查并更新raw.js
    const { x1, difficulty } = await checkAndUpdateRawJs(forceUpdateRaw, isVerbose);
    
    // 获取新的Cookie
    const cookies = await getCookies(x1, difficulty, isVerbose);
    
    if (!cookies.js1key || !cookies.pow) {
      log('获取Cookie失败', isVerbose, true);
    } else {
      log('成功获取新Cookie', isVerbose);
    }
    
    return {
      js1key: cookies.js1key,
      pow: cookies.pow
    };
  }

  // 中间件：请求日志
  app.use(async (ctx, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    
    if (isVerbose) {
      // 获取客户端IP地址
      const clientIp = ctx.request.ip || ctx.request.headers.get('x-forwarded-for') || 'unknown';
      log(`[${requestId}] ${ctx.request.method} ${ctx.request.url} - 客户端IP: ${clientIp}`, isVerbose);
    }
    
    await next();
    
    const ms = Date.now() - start;
    ctx.response.headers.set('X-Response-Time', `${ms}ms`);
    
    if (isVerbose) {
      log(`[${requestId}] 响应时间: ${ms}ms`, isVerbose);
    }
  });

  // 中间件：API密钥验证
  app.use(async (ctx, next) => {
    if (apiKey) {
      const authHeader = ctx.request.headers.get('Authorization');
      
      // 验证Bearer令牌
      if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== apiKey) {
        ctx.response.status = 403;
        ctx.response.body = { 
          error: true,
          message: 'API密钥无效或缺失',
          status: 403
        };
        return;
      }
    }
    
    await next();
  });

  // 路由：查询IP信息
  router.get('/query', async (ctx) => {
    let ip = ctx.request.url.searchParams.get('ip') || '';
    let forceRawUpdate = ctx.request.url.searchParams.get('raw') === 'true';
    let useClientIp = ctx.request.url.searchParams.get('clientip') === 'true';
    
    // 如果启用了clientip参数且没有设置ip参数，则使用客户端IP
    if (useClientIp && !ip) {
      ip = ctx.request.ip || ctx.request.headers.get('x-forwarded-for') || '';
      if (isVerbose && ip) {
        log(`使用客户端IP进行查询: ${ip}`, isVerbose);
      }
    }
    
    await handleQuery(ctx, ip, forceRawUpdate);
  });

  // POST方法的查询
  router.post('/query', async (ctx) => {
    try {
      let ip = '';
      let forceRawUpdate = false;
      let useClientIp = false;
      
      // 获取请求体
      const body = ctx.request.body();
      if (body.type === "json") {
        const value = await body.value;
        ip = value.ip || '';
        forceRawUpdate = value.raw === true;
        useClientIp = value.clientip === true;
        
        // 如果启用了clientip参数且没有设置ip参数，则使用客户端IP
        if (useClientIp && !ip) {
          ip = ctx.request.ip || ctx.request.headers.get('x-forwarded-for') || '';
          if (isVerbose && ip) {
            log(`使用客户端IP进行查询: ${ip}`, isVerbose);
          }
        }
      }
      
      await handleQuery(ctx, ip, forceRawUpdate);
    } catch (error) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: true,
        message: `无效的请求: ${error.message}`,
        status: 400
      };
    }
  });

  // 路由：获取服务器状态
  router.get('/status', (ctx) => {
    const uptime = Math.floor((Date.now() - queryCounter.lastReset) / 1000);
    
    ctx.response.type = 'application/json';
    ctx.response.body = {
      status: 'running',
      uptime_seconds: uptime,
      queries: {
        total: queryCounter.total,
        success: queryCounter.success,
        error: queryCounter.error
      },
      memory: Deno.memoryUsage()
    };
  });

  // 路由：根路径
  router.get('/', (ctx) => {
    ctx.response.type = 'text/html';
    ctx.response.body = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pong0-Deno API 服务器</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>Pong0-Deno API 服务器</h1>
          <p>API服务器正在运行中。</p>
          
          <h2>接口说明</h2>
          <h3>1. 查询IP信息</h3>
          <p>路径: <code>/query</code></p>
          <p>支持 GET 和 POST 请求</p>
          
          <h4>GET 请求参数:</h4>
          <ul>
            <li><code>ip</code>: 要查询的IP地址（可选）</li>
            <li><code>raw</code>: 是否强制更新raw.js（可选，true/false）</li>
            <li><code>clientip</code>: 是否使用客户端IP进行查询（可选，true/false）</li>
          </ul>
          
          <h4>POST 请求体示例 (JSON):</h4>
          <pre>{
  "ip": "1.1.1.1",
  "raw": false,
  "clientip": false
}</pre>
          
          <h3>2. 查看服务器状态</h3>
          <p>路径: <code>/status</code></p>
          <p>返回服务器运行状态信息</p>
          
          <hr>
          <p>Pong0-Deno 版本 - 基于Deno构建</p>
        </body>
      </html>
    `;
  });

  // 添加路由
  app.use(router.routes());
  app.use(router.allowedMethods());

  // 处理查询请求的函数
  async function handleQuery(ctx: any, ip: string, forceRawUpdate: boolean) {
    // 更新查询计数器
    queryCounter.total++;
    
    try {
      // 如果需要强制更新raw.js
      if (forceRawUpdate) {
        if (isVerbose) {
          console.log(formatDate(new Date()), '强制更新raw.js文件');
        }
        await checkAndUpdateRawJs(true, isVerbose);
      }
      
      // 获取有效的Cookie
      const cookies = await getValidCookies();
      
      if (!cookies.js1key || !cookies.pow) {
        throw new Error('无法获取必要的Cookie');
      }
      
      // 查询IP信息
      const ipInfo = await queryIpInfo(cookies, ip, isVerbose);
      
      // 设置响应
      ctx.response.type = 'application/json';
      ctx.response.body = ipInfo;
      
      // 更新成功计数
      queryCounter.success++;
    } catch (error) {
      // 更新错误计数
      queryCounter.error++;
      
      // 设置错误响应
      ctx.response.status = 500;
      ctx.response.type = 'application/json';
      ctx.response.body = {
        error: true,
        message: error.message || '服务器内部错误',
        status: 500
      };
      
      if (isVerbose) {
        console.error(formatDate(new Date()), '查询处理出错:', error.message);
      }
    }
  }

  // 启动服务器的函数
  async function startServer() {
    try {
      // 检查端口是否被占用
      try {
        const listener = Deno.listen({ port });
        listener.close(); // 如果能监听成功，关闭这个临时监听器
      } catch (e) {
        console.error(`错误: 端口 ${port} 已被占用，请尝试其他端口`);
        throw new Error(`端口 ${port} 已被占用`);
      }
      
      // 启动服务器
      console.log(`Pong0-Deno API 服务器正在启动，监听端口: ${port}`);
      await app.listen({ port });
    } catch (error) {
      console.error('启动服务器失败:', error.message);
      throw error;
    }
  }
  
  // 返回接口
  return {
    startServer
  };
} 