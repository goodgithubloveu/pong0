/**
 * 网络请求工具模块
 * 负责获取HTML和JavaScript文件
 */
import * as cheerio from "cheerio";
import { exists } from "std/fs/exists.ts";
import { defaultHeaders, formatDate, log } from "./common.ts";

/**
 * 获取Ping0.cc首页HTML内容
 * @param isVerbose - 是否输出详细日志
 * @returns Promise包含HTML、x1、difficulty和scriptUrl
 */
async function fetchHomePage(isVerbose = false): Promise<{
  html: string;
  x1: string;
  difficulty: string;
  scriptUrl: string;
}> {
  try {
    log('获取Ping0.cc首页...', isVerbose);
    const response = await fetch('https://ping0.cc/', {
      headers: defaultHeaders
    });
    
    const html = await response.text();
    log(`接收到 ${html.length} 字节的初始页面数据`, isVerbose);
    
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
      log(`x1值: ${x1}`, isVerbose);
      log(`difficulty值: ${difficulty}`, isVerbose);
      log(`JS路径: ${scriptUrl}`, isVerbose);
    }
    
    return { html, x1, difficulty, scriptUrl };
  } catch (error) {
    log('获取Ping0.cc首页失败: ' + error.message, isVerbose, true);
    throw error;
  }
}

/**
 * 获取并保存JavaScript文件
 * @param scriptUrl - JavaScript文件URL
 * @param isVerbose - 是否输出详细日志
 * @returns - JavaScript文件内容
 */
async function fetchAndSaveScript(
  scriptUrl: string, 
  isVerbose = false
): Promise<string> {
  try {
    log(`获取JavaScript文件: ${scriptUrl}`, isVerbose);
    const response = await fetch(scriptUrl, {
      headers: defaultHeaders
    });
    
    const jsContent = await response.text();
    log(`接收到 ${jsContent.length} 字节的JavaScript数据`, isVerbose);
    
    // 保存到本地文件
    const scriptPath = 'raw.js';
    await Deno.writeTextFile(scriptPath, jsContent);
    log(`已保存JavaScript文件到: ${scriptPath}`, isVerbose);
    
    return jsContent;
  } catch (error) {
    log('获取JavaScript文件失败: ' + error.message, isVerbose, true);
    throw error;
  }
}

/**
 * 检查并更新raw.js文件
 * @param forceUpdate - 是否强制更新raw.js文件
 * @param isVerbose - 是否输出详细日志 
 * @returns Promise包含JavaScript内容、x1和difficulty
 */
export async function checkAndUpdateRawJs(
  forceUpdate = false, 
  isVerbose = false
): Promise<{
  jsContent: string;
  x1: string;
  difficulty: string;
}> {
  try {
    // 获取首页信息
    const { x1, difficulty, scriptUrl } = await fetchHomePage(isVerbose);
    
    let jsContent: string;
    const rawJsPath = 'raw.js';
    const rawJsExists = await exists(rawJsPath);
    
    // 处理raw.js文件的更新逻辑
    if (forceUpdate) {
      log('检测到--raw参数，将强制更新raw.js文件', isVerbose);
      log(`正在从${scriptUrl}下载raw.js文件...`, isVerbose);
      jsContent = await fetchAndSaveScript(scriptUrl, isVerbose);
      log('raw.js文件更新完成', isVerbose);
    } else if (!rawJsExists) {
      log('未检测到raw.js文件，将进行下载', isVerbose);
      log(`正在从${scriptUrl}下载raw.js文件...`, isVerbose);
      jsContent = await fetchAndSaveScript(scriptUrl, isVerbose);
    } else {
      log('使用本地raw.js文件', isVerbose);
      jsContent = await Deno.readTextFile(rawJsPath);
    }
    
    return { jsContent, x1, difficulty };
  } catch (error) {
    log('检查并更新raw.js失败: ' + error.message, isVerbose, true);
    throw error;
  }
} 