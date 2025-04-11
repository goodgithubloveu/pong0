/**
 * 打包脚本
 * 用于将项目打包成可执行文件
 */

// 添加空导出使文件成为模块
export {};

// 从deno.json导入版本号
// @ts-ignore: 引用的是项目根目录的deno.json文件
import denoConfig from "./deno.json" with { type: "json" };
const version = denoConfig.version;

// 获取命令行参数
const args = Deno.args;
const target = args[0] || "all"; // 默认构建所有平台

// 目标平台 - 只包含Deno实际支持的平台
const targets = {
  // Windows
  windows: { target: "x86_64-pc-windows-msvc", ext: ".exe" },
  
  // Linux
  linux: { target: "x86_64-unknown-linux-gnu", ext: "" },
  linuxArm64: { target: "aarch64-unknown-linux-gnu", ext: "" },
  
  // macOS
  mac: { target: "x86_64-apple-darwin", ext: "" },
  macArm: { target: "aarch64-apple-darwin", ext: "" },
};

// 创建输出目录
try {
  await Deno.mkdir("dist", { recursive: true });
} catch (e) {
  // 目录可能已存在，忽略错误
}

// 打印构建信息
console.log(`=== Pong0-Deno v${version} 打包工具 ===`);

// 执行构建
async function build(platform: string, config: any) {
  const outputName = `pong0-deno-v${version}-${platform}${config.ext}`;
  const outputPath = `dist/${outputName}`;
  
  console.log(`\n正在为 ${platform} 平台构建...`);
  
  const cmd = [
    "deno",
    "compile",
    "--allow-net",
    "--allow-read",
    "--allow-write",
    "--allow-env",
    "--no-check",
    "--target",
    config.target,
    "--output",
    outputPath,
    "src/index.ts"
  ];
  
  console.log(`执行命令: ${cmd.join(" ")}`);
  
  const p = Deno.run({
    cmd,
    stdout: "piped",
    stderr: "piped",
  });
  
  const status = await p.status();
  
  if (status.success) {
    console.log(`✅ 构建成功: ${outputPath}`);
    
    // 获取文件大小
    const fileInfo = await Deno.stat(outputPath);
    const fileSizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
    console.log(`   文件大小: ${fileSizeMB} MB`);
  } else {
    const stderr = new TextDecoder().decode(await p.stderrOutput());
    console.error(`❌ 构建失败: ${stderr}`);
  }
  
  p.close();
}

// 根据目标进行构建
if (target === "all") {
  // 构建所有平台
  for (const [platform, config] of Object.entries(targets)) {
    await build(platform, config);
  }
} else if (targets[target]) {
  // 构建指定平台
  await build(target, targets[target]);
} else {
  console.error(`错误: 未知的目标平台 "${target}"`);
  console.log("可用的目标平台: " + Object.keys(targets).join(", "));
  Deno.exit(1);
}

console.log("\n=== 打包完成 ===");