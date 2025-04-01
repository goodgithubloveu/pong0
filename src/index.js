#!/usr/bin/env node
/**
 * Pong0-JS - Ping0.cc网站数据获取工具(JavaScript版)
 * 主程序入口文件
 */
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// 导入项目模块
const { checkAndUpdateRawJs } = require('./utils/fetcher');
const getCookies = require('./cookieGetter');
const { queryIpInfo } = require('./utils/parser');
const createServer = require('./utils/server');

// 定义版本号和构建日期
const VERSION = '1.0.0';
const BUILD_DATE = new Date().toISOString().split('T')[0];

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
 * 显示Banner
 */
function showBanner() {
  console.log('-------------------------------------');
  console.log('Pong0-JS Pong0-JS Pong0-JS');
  console.log('-------------------------------------');
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const argv = yargs(hideBin(process.argv))
    .usage('使用方法: $0 [选项]')
    .option('ip', {
      alias: 'i',
      describe: '要查询的IP地址',
      type: 'string'
    })
    .option('all', {
      alias: 'a',
      describe: '显示详细执行信息',
      type: 'boolean',
      default: false
    })
    .option('difficulty', {
      describe: '自定义difficulty值(用于调试)',
      type: 'string'
    })
    .option('serve', {
      alias: 's',
      describe: '启动API服务器模式',
      type: 'boolean',
      default: false
    })
    .option('port', {
      alias: 'p',
      describe: 'API服务器端口',
      type: 'number',
      default: 8080
    })
    .option('key', {
      alias: 'k',
      describe: 'API服务器密钥',
      type: 'string'
    })
    .option('raw', {
      alias: 'r',
      describe: '强制更新raw.js文件',
      type: 'boolean',
      default: false
    })
    .version('v', '显示版本信息', `${VERSION} (构建日期: ${BUILD_DATE})`)
    .help()
    .alias('help', 'h')
    .parse();
  
  // API服务器模式
  if (argv.serve) {
    const { startServer } = createServer({ 
      port: argv.port, 
      apiKey: argv.key,
      isVerbose: argv.all,
      forceUpdateRaw: argv.raw
    });
    
    try {
      await startServer();
    } catch (error) {
      console.error('启动API服务器失败:', error.message);
      process.exit(1);
    }
    return;
  }
  
  // 查询模式
  if (argv.all) {
    showBanner();
  }
  
  if (argv.ip && argv.all) {
    console.log(`查询IP: ${argv.ip}`);
  }
  
  // 记录总执行时间
  const totalStartTime = Date.now();
  
  try {
    // 步骤1: 检查并更新raw.js文件
    const step1StartTime = Date.now();
    let x1, difficulty;
    
    if (argv.x1 && argv.difficulty) {
      x1 = argv.x1;
      difficulty = argv.difficulty;
      console.log(`使用自定义参数: x1=${x1}, difficulty=${difficulty}`);
    } else {
      // 获取最新的x1和difficulty值
      const result = await checkAndUpdateRawJs(argv.raw || argv.r, argv.all);
      x1 = result.x1;
      difficulty = result.difficulty;
    }
    
    if (argv.all) {
      const step1Time = Date.now() - step1StartTime;
      console.log(`步骤1完成，耗时: ${formatTime(step1Time)}`);
    }
    
    // 如果只使用了raw参数，不执行后续操作
    if (argv.raw && !argv.ip && !argv.serve && !argv.all) {
      return;
    }
    
    // 步骤2: 获取cookie
    const step2StartTime = Date.now();
    const cookies = await getCookies(x1, difficulty, argv.all);
    
    if (!cookies.js1key || !cookies.pow) {
      console.error('获取必要的cookie失败');
      process.exit(1);
    }
    
    if (argv.all) {
      const step2Time = Date.now() - step2StartTime;
      console.log(`步骤2完成，耗时: ${formatTime(step2Time)}`);
    }
    
    // 步骤3: 查询IP信息
    const step3StartTime = Date.now();
    const ipInfo = await queryIpInfo(cookies, argv.ip || '', argv.all);
    
    if (argv.all) {
      const step3Time = Date.now() - step3StartTime;
      console.log(`步骤3完成，耗时: ${formatTime(step3Time)}`);
      
      // 总耗时
      const totalTime = Date.now() - totalStartTime;
      console.log(`总耗时: ${formatTime(totalTime)}`);
      console.log('-------------------------------------');
    }
    
    // 输出结果
    console.log(JSON.stringify(ipInfo, null, 2));
  } catch (error) {
    // 创建错误响应对象
    const errorResponse = {
      error: true,
      message: error.message || '未知错误'
    };
    
    // 如果错误对象包含状态码，也包含在响应中
    if (error.status) {
      errorResponse.status = error.status;
    }
    
    console.error('执行过程中出错:', error.message);
    console.log(JSON.stringify(errorResponse, null, 2));
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  console.error('程序运行出错:', error);
  process.exit(1);
}); 