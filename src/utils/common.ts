/**
 * 通用工具模块
 * 提供各模块共用的函数和常量
 */

// 默认请求头
export const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

/**
 * 构建请求头
 * @param cookies - 包含cookie信息的对象
 * @returns 构建好的请求头对象
 */
export function buildHeaders(cookies?: { js1key?: string | null; pow?: string | null }): Record<string, string> {
  // 创建新的headers对象
  const headers: Record<string, string> = { ...defaultHeaders };
  
  // 添加Cookie头
  if (cookies?.js1key && cookies?.pow) {
    headers['Cookie'] = `js1key=${cookies.js1key}; pow=${cookies.pow}`;
  }
  
  return headers;
}

/**
 * 格式化日期到毫秒
 * @param date 日期对象
 * @returns 格式化后的字符串
 */
export function formatDate(date: Date): string {
  const dateStr = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '/');
  const ms = date.getMilliseconds();
  return `[${dateStr}.${ms.toString().padStart(3, "0")}]`;
}

/**
 * 格式化执行时间
 * @param milliseconds - 毫秒
 * @returns - 格式化后的时间
 */
export function formatTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

/**
 * 安全地获取当前时间戳
 * @returns 当前时间戳（毫秒）
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * 记录日志信息
 * @param message 日志消息
 * @param isVerbose 是否详细模式
 * @param isError 是否为错误日志
 */
export function log(message: string, isVerbose = false, isError = false): void {
  if (isVerbose) {
    const timestamp = formatDate(new Date());
    if (isError) {
      console.error(timestamp, message);
    } else {
      console.log(timestamp, message);
    }
  }
} 