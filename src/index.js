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

// 获取版本号和构建日期
const packageJson = require('../package.json');
const VERSION = packageJson.version;
// 如果是占位符，则使用当前日期；否则使用打包时注入的日期
const BUILD_DATE = '__BUILD_DATE__' === '__BUILD_DATE__' 
  ? new Date().toISOString().split('T')[0]  // 直接运行时使用当前日期
  : '__BUILD_DATE__';                       // 打包后使用构建时注入的日期

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
    .strict() // 严格模式，不允许未知参数
    .fail((msg, err, yargs) => {
      // 自定义错误处理，更友好地提示未知参数
      if (err) throw err
      console.error(`错误: ${msg}`)
      console.error('运行带 --help 参数获取可用命令和选项列表')
      process.exit(1)
    })
    .parse();
  
  // 调试: 检查命令行参数解析结果
  if (argv.all) {
    console.log('详细模式已开启');
  }
  
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
  
  // 检查非服务器模式下使用的服务器专用参数
  if (!argv.serve) {
    const serverOnlyParams = [];
    // 直接检查原始命令行参数
    const rawArgs = process.argv.slice(2);
    
    // 检查 -p 或 --port 参数是否存在
    if (rawArgs.some(arg => arg === '-p' || arg === '--port' || arg.startsWith('--port='))) {
      serverOnlyParams.push('--port/-p');
    }
    
    // 检查 -k 或 --key 参数是否存在
    if (rawArgs.some(arg => arg === '-k' || arg === '--key' || arg.startsWith('--key='))) {
      serverOnlyParams.push('--key/-k');
    }
    
    if (serverOnlyParams.length > 0) {
      console.error(`错误: 参数 ${serverOnlyParams.join('、')} 只在服务器模式 (--serve) 下有效`);
      console.error('运行带 --help 参数获取可用命令和选项列表');
      process.exit(1);
    }
  }
  
  // 查询模式
  if (argv.all) {
    showBanner();
  }
  
  // 显示查询IP信息（即使没有指定，也显示即将查询本机IP）
  if (argv.all) {
    console.log(`查询IP: ${argv.ip || '本机IP'}`);
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
      if (argv.all) {
        console.log(`使用自定义参数: x1=${x1}, difficulty=${difficulty}`);
      }
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
      // 给用户明确的反馈
      console.log(`正在更新raw.js文件...`);
      try {
        // 确保这个结果能够被正确返回
        const updateResult = await checkAndUpdateRawJs(true, true);
        if (updateResult && updateResult.jsContent) {
          console.log(`✓ raw.js文件更新成功，文件大小: ${(updateResult.jsContent.length / 1024).toFixed(2)} KB`);
        } else {
          console.log(`⚠ raw.js文件可能未完全更新`);
        }
      } catch (error) {
        console.error(`✗ raw.js文件更新失败: ${error.message}`);
      }
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
    // 即使是默认查询本机IP，也要传递isVerbose参数
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
    
    // 只在详细模式下输出错误信息到控制台
    if (argv.all) {
      console.error('执行过程中出错:', error.message);
    }
    
    // 始终以JSON格式输出错误
    console.log(JSON.stringify(errorResponse, null, 2));
    process.exit(1);
  }
}

// 执行主函数
main().catch(error => {
  // 创建错误响应对象
  const errorResponse = {
    error: true,
    message: error.message || '未知错误'
  };
  
  console.log(JSON.stringify(errorResponse, null, 2));
  process.exit(1);
}); 