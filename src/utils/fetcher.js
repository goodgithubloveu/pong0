/**
 * 网络请求工具模块
 * 负责获取HTML和JavaScript文件
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// 默认请求头
const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

/**
 * 格式化日期到毫秒
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的字符串
 */
function formatDate(date) {
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
 * 获取Ping0.cc首页HTML内容
 * @param {boolean} isVerbose - 是否输出详细日志
 * @returns {Promise<{html: string, x1: string, difficulty: string, scriptUrl: string}>}
 */
async function fetchHomePage(isVerbose = false) {
  try {
    if (isVerbose) console.log(formatDate(new Date()), '获取Ping0.cc首页...');
    const response = await axios.get('https://ping0.cc/', {
      headers: defaultHeaders
    });
    
    const html = response.data;
    if (isVerbose) console.log(formatDate(new Date()), `接收到 ${html.length} 字节的初始页面数据`);
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(html);
    
    // 提取x1和difficulty值
    let x1 = '';
    let difficulty = '';
    
    // 查找包含window.x1和window.difficulty的script标签
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes('window.x1')) {
        // 提取x1值
        const x1Match = scriptContent.match(/window\.x1\s*=\s*['"]([^'"]+)['"]/);
        if (x1Match && x1Match[1]) {
          x1 = x1Match[1];
        }
        
        // 提取difficulty值
        const difficultyMatch = scriptContent.match(/window\.difficulty\s*=\s*['"]([^'"]+)['"]/);
        if (difficultyMatch && difficultyMatch[1]) {
          difficulty = difficultyMatch[1];
        }
      }
    });
    
    // 查找外部脚本URL
    let scriptUrl = '';
    $('script').each((index, element) => {
      const src = $(element).attr('src');
      if (src && src.includes('/static/js/')) {
        scriptUrl = src;
      }
    });
    
    if (!scriptUrl.startsWith('http')) {
      scriptUrl = 'https://ping0.cc' + scriptUrl;
    }
    
    if (!x1 || !difficulty || !scriptUrl) {
      throw new Error('无法从首页提取必要的参数');
    }
    
    if (isVerbose) {
      console.log(formatDate(new Date()), `x1值: ${x1}`);
      console.log(formatDate(new Date()), `difficulty值: ${difficulty}`);
      console.log(formatDate(new Date()), `JS路径: ${scriptUrl}`);
    }
    
    return { html, x1, difficulty, scriptUrl };
  } catch (error) {
    if (isVerbose) console.error(formatDate(new Date()), '获取Ping0.cc首页失败:', error.message);
    throw error;
  }
}

/**
 * 获取并保存JavaScript文件
 * @param {string} scriptUrl - JavaScript文件URL
 * @param {boolean} isVerbose - 是否输出详细日志
 * @returns {Promise<string>} - JavaScript文件内容
 */
async function fetchAndSaveScript(scriptUrl, isVerbose = false) {
  try {
    if (isVerbose) console.log(formatDate(new Date()), `获取JavaScript文件: ${scriptUrl}`);
    const response = await axios.get(scriptUrl, {
      headers: defaultHeaders
    });
    
    const jsContent = response.data;
    if (isVerbose) console.log(formatDate(new Date()), `接收到 ${jsContent.length} 字节的JavaScript数据`);
    
    // 保存到本地文件
    const scriptPath = path.resolve(process.cwd(), 'raw.js');
    fs.writeFileSync(scriptPath, jsContent, 'utf8');
    if (isVerbose) console.log(formatDate(new Date()), `已保存JavaScript文件到: ${scriptPath}`);
    
    return jsContent;
  } catch (error) {
    if (isVerbose) console.error(formatDate(new Date()), '获取JavaScript文件失败:', error.message);
    throw error;
  }
}

/**
 * 检查并更新raw.js文件
 * @param {boolean} forceUpdate - 是否强制更新raw.js文件
 * @param {boolean} isVerbose - 是否输出详细日志 
 * @returns {Promise<{jsContent: string, x1: string, difficulty: string}>}
 */
async function checkAndUpdateRawJs(forceUpdate = false, isVerbose = false) {
  try {
    // 获取首页信息
    const { x1, difficulty, scriptUrl } = await fetchHomePage(isVerbose);
    
    let jsContent;
    const rawJsPath = path.resolve(process.cwd(), 'raw.js');
    const rawJsExists = fs.existsSync(rawJsPath);
    
    // 处理raw.js文件的更新逻辑
    if (forceUpdate) {
      if (isVerbose) {
        console.log(formatDate(new Date()), '检测到--raw参数，将强制更新raw.js文件');
        console.log(formatDate(new Date()), `正在从${scriptUrl}下载raw.js文件...`);
      }
      jsContent = await fetchAndSaveScript(scriptUrl, isVerbose);
      if (isVerbose) console.log(formatDate(new Date()), 'raw.js文件更新完成');
    } else if (!rawJsExists) {
      if (isVerbose) {
        console.log(formatDate(new Date()), '未检测到raw.js文件，将进行下载');
        console.log(formatDate(new Date()), `正在从${scriptUrl}下载raw.js文件...`);
      }
      jsContent = await fetchAndSaveScript(scriptUrl, isVerbose);
    } else {
      if (isVerbose) console.log(formatDate(new Date()), '使用本地raw.js文件');
      jsContent = fs.readFileSync(rawJsPath, 'utf8');
    }
    
    return { jsContent, x1, difficulty };
  } catch (error) {
    if (isVerbose) console.error(formatDate(new Date()), '检查并更新raw.js失败:', error.message);
    throw error;
  }
}

module.exports = {
  fetchHomePage,
  fetchAndSaveScript,
  checkAndUpdateRawJs,
  formatDate
}; 