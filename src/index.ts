#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write
/**
 * Pong0-Deno - Ping0.cc网站数据获取工具(Deno版)
 * 主程序入口文件
 */
import { parse } from "std/flags/mod.ts";

// 导入项目模块
import { checkAndUpdateRawJs } from "./utils/fetcher.ts";
import { getCookies } from "./cookieGetter.ts";
import { queryIpInfo } from "./utils/parser.ts";
import { createServer } from "./utils/server.ts";
import { formatTime } from "./utils/common.ts";

// 获取版本号
const VERSION = "1.0.8";

/**
 * 显示Banner
 */
function showBanner(): void {
  console.log('-------------------------------------');
  console.log('Pong Pong Pong');
  console.log('-------------------------------------');
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  // 解析命令行参数
  const args = parse(Deno.args, {
    boolean: ["all", "serve", "raw", "help", "version", "verbose"],
    string: ["ip", "difficulty", "key"],
    default: {
      all: false,
      serve: false,
      raw: false,
      port: 8080
    },
    alias: {
      i: "ip",
      a: "all",
      s: "serve",
      p: "port",
      k: "key",
      r: "raw",
      h: "help",
      v: "version"
    }
  });

  // 显示帮助信息
  if (args.help) {
    console.log('使用方法: pong0 [选项]');
    console.log('选项:');
    console.log('  --ip, -i          要查询的IP地址');
    console.log('  --all, -a         显示详细执行信息');
    console.log('  --serve, -s       启动API服务器模式');
    console.log('  --port, -p        API服务器端口');
    console.log('  --key, -k         API服务器密钥');
    console.log('  --raw, -r         强制更新raw.js文件');
    console.log('  --version, -v     显示版本信息');
    console.log('  --help, -h        显示帮助信息');
    Deno.exit(0);
  }

  // 显示版本信息
  if (args.version) {
    console.log(`${VERSION}`);
    Deno.exit(0);
  }
  
  // 调试: 检查命令行参数解析结果
  if (args.all) {
    console.log('详细模式已开启');
  }
  
  // API服务器模式
  if (args.serve) {
    const { startServer } = createServer({ 
      port: args.port, 
      apiKey: args.key,
      isVerbose: args.all,
      forceUpdateRaw: args.raw
    });
    
    try {
      await startServer();
    } catch (error) {
      console.error('启动API服务器失败:', error.message);
      Deno.exit(1);
    }
    return;
  }
  
  // 检查非服务器模式下使用的服务器专用参数
  if (!args.serve) {
    const serverOnlyParams = [];
    
    if (typeof args.port !== 'undefined' && args.port !== 8080) {
      serverOnlyParams.push('--port/-p');
    }
    
    if (typeof args.key !== 'undefined') {
      serverOnlyParams.push('--key/-k');
    }
    
    if (serverOnlyParams.length > 0) {
      console.error(`错误: 参数 ${serverOnlyParams.join('、')} 只在服务器模式 (--serve) 下有效`);
      console.error('运行带 --help 参数获取可用命令和选项列表');
      Deno.exit(1);
    }
  }
  
  // 查询模式
  if (args.all) {
    showBanner();
  }
  
  // 显示查询IP信息（即使没有指定，也显示即将查询本机IP）
  if (args.all) {
    console.log(`查询IP: ${args.ip || '本机IP'}`);
  }
  
  // 记录总执行时间
  const totalStartTime = Date.now();
  
  try {
    // 步骤1: 检查并更新raw.js文件
    const step1StartTime = Date.now();
    let x1, difficulty;
    
    if (args.x1 && args.difficulty) {
      x1 = args.x1;
      difficulty = args.difficulty;
      if (args.all) {
        console.log(`使用自定义参数: x1=${x1}, difficulty=${difficulty}`);
      }
    } else {
      // 获取最新的x1和difficulty值
      const result = await checkAndUpdateRawJs(args.raw, args.all);
      x1 = result.x1;
      difficulty = result.difficulty;
    }
    
    if (args.all) {
      const step1Time = Date.now() - step1StartTime;
      console.log(`步骤1完成，耗时: ${formatTime(step1Time)}`);
    }
    
    // 如果只使用了raw参数，不执行后续操作
    if (args.raw && !args.ip && !args.serve && !args.all) {
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
    const cookies = await getCookies(x1, difficulty, args.all);
    
    if (!cookies.js1key || !cookies.pow) {
      console.error('获取必要的cookie失败');
      Deno.exit(1);
    }
    
    if (args.all) {
      const step2Time = Date.now() - step2StartTime;
      console.log(`步骤2完成，耗时: ${formatTime(step2Time)}`);
    }
    
    // 步骤3: 查询IP信息
    const step3StartTime = Date.now();
    // 即使是默认查询本机IP，也要传递isVerbose参数
    const ipInfo = await queryIpInfo(cookies, args.ip || '', args.all);
    
    if (args.all) {
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
    // 创建错误响应对象 - 添加明确的类型定义
    const errorResponse: {
      error: boolean;
      message: string;
      status?: number;  // 添加可选的status属性
    } = {
      error: true,
      message: error.message || '未知错误'
    };
    
    // 如果错误对象包含状态码，也包含在响应中
    if (error.status) {
      errorResponse.status = error.status;
    }
    
    // 只在详细模式下输出错误信息到控制台
    if (args.all) {
      console.error('执行过程中出错:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    
    // 始终将错误JSON输出到标准输出
    console.log(JSON.stringify(errorResponse, null, 2));
    Deno.exit(1);
  }
}

// 执行主函数
if (import.meta.main) {
  main();
} 