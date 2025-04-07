/**
 * Cookie获取模块
 * 使用JSDOM模拟浏览器环境，执行JavaScript获取cookie
 */
import { JSDOM } from "jsdom";
import { formatDate } from "./utils/common.ts";

/**
 * 获取cookie值
 * @param x1 - 站点验证字符串
 * @param difficulty - 难度值
 * @param isVerbose - 是否输出详细日志
 * @returns 包含cookie的对象
 */
export async function getCookies(
  x1: string, 
  difficulty: string, 
  isVerbose = false
): Promise<{js1key: string | null, pow: string | null}> {
  return new Promise(async (resolve) => {
    // 初始化结果对象
    const result = { js1key: null as string | null, pow: null as string | null };

    try {
      // 读取JavaScript文件
      let jsCode;
      try {
        jsCode = await Deno.readTextFile("raw.js");
        const sizeInBytes = jsCode.length;
        let sizeStr;
        if (sizeInBytes >= 1024 * 1024) {
          sizeStr = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          sizeStr = `${(sizeInBytes / 1024).toFixed(2)} KB`;
        }
        if (isVerbose)
          console.log(
            formatDate(new Date()),
            `已加载JavaScript文件，大小: ${sizeStr}`
          );
      } catch (err) {
        console.error(
          formatDate(new Date()),
          `读取JavaScript文件失败: ${err.message}`
        );
        resolve(result);
        return;
      }

      // 修改JavaScript代码
      const modifiedJsCode = jsCode
        .replace(
          /b\.load\(\)\.then\(_0x2e2663 => _0x2e2663\.detect\(\)\)\.then\(_0x465ba0 => \{/g,
          "Promise.resolve({bot: false}).then(_0x465ba0 => {"
        )
        .replace(/if \(_0x465ba0\.bot === false\)/g, "if (true)");

      // 创建JSDOM环境
      if (isVerbose) console.log(formatDate(new Date()), "创建浏览器环境...");
      const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
        url: "https://ping0.cc/",
        referrer: "https://ping0.cc/",
        contentType: "text/html",
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true
      });

      const { window } = dom;
      const { document } = window;

      // 拦截导航事件
      window.addEventListener('beforeunload', (event) => {
        event.preventDefault();
        event.returnValue = '';
        if (isVerbose) console.log(formatDate(new Date()), '阻止了页面卸载');
        return '';
      });

      // 性能监控
      const perfStart = Date.now();
      const logPerformance = (stage: string) => {
        const elapsed = Date.now() - perfStart;
        if (isVerbose)
          console.log(formatDate(new Date()), `${stage} - 耗时 ${elapsed}ms`);
      };

      // 存储cookie
      const cookies: Record<string, string> = {};

      // 监听cookie设置
      Object.defineProperty(document, "cookie", {
        get: () =>
          Object.entries(cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join("; "),
        set: (cookieString: string) => {
          const [pair] = cookieString.split(";");
          if (!pair) return;

          const [key, value] = pair.split("=");
          if (key && value) {
            const cookieName = key.trim();
            const cookieValue = value.trim();
            cookies[cookieName] = cookieValue;
            if (isVerbose)
              console.log(
                formatDate(new Date()),
                `Cookie已设置: ${cookieName}=${cookieValue}`
              );

            // 检查是否获取到了必需的cookie
            if (cookies["js1key"] && cookies["pow"]) {
              // 如果都获取到了，更新结果并完成
              result.js1key = cookies["js1key"];
              result.pow = cookies["pow"];

              clearTimeout(backupTimer);
              clearTimeout(timeoutTimer);

              // 无论是否verbose模式都显示获取成功信息
              if (isVerbose)
                console.log(formatDate(new Date()), "成功获取cookie");

              if (isVerbose) {
                console.log(formatDate(new Date()), "获取到所有必需的cookie:");
                console.log(
                  formatDate(new Date()),
                  `js1key=${result.js1key}, pow=${result.pow}`
                );
                logPerformance("获取cookie完成");
              }

              // 强制中断所有后续JavaScript执行
              try {
                // 关闭窗口以终止执行
                window.close();
                // 直接销毁JSDOM对象
                setTimeout(() => {
                  if (dom && dom.window) {
                    dom.window.close();
                  }
                }, 0);
                // 恢复原始的console.log函数
                console.log = originalConsoleLog;
              } catch (err) {
                // 忽略清理错误
              }

              resolve(result);
              return; // 确保立即返回，不执行后续逻辑
            }
          }
        },
      });

      // 浏览器环境模拟
      Object.defineProperties(window.navigator, {
        userAgent: {
          value:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        vendor: { value: "Google Inc." },
        webdriver: { value: false },
      });

      // 拦截日志
      const addTimestamp = (msg: string) => `${formatDate(new Date())} ${msg}`;
      const originalConsoleLog = console.log;
      
      if (isVerbose) {
        window.console.log = (...args: any[]) => {
          if (isVerbose) originalConsoleLog(addTimestamp(args.join(" ")));
        };
      } else {
        window.console.log = () => {}; // 不输出任何内容
      }
      window.console = console;

      // 设置关键值
      window.x1 = x1;
      window.difficulty = difficulty;

      // 启动超时机制
      const timeoutTimer = setTimeout(() => {
        if (isVerbose)
          console.log(formatDate(new Date()), "操作超时，未能获取到cookie");

        // 尝试清理
        try {
          if (dom && dom.window) {
            dom.window.close();
          }
          console.log = originalConsoleLog;
        } catch (e) {
          // 忽略清理错误
        }

        resolve(result);
      }, 15000); // 15秒超时

      // 创建备用计时器，确保不会无限挂起
      const backupTimer = setTimeout(() => {
        if (isVerbose) console.log(formatDate(new Date()), "备用超时触发");
        clearTimeout(timeoutTimer);

        try {
          if (dom && dom.window) {
            dom.window.close();
          }
          console.log = originalConsoleLog;
        } catch (e) {
          // 忽略清理错误
        }

        resolve(result);
      }, 20000);

      // 模拟Canvas相关功能
      try {
        if (window.HTMLCanvasElement) {
          window.HTMLCanvasElement.prototype.getContext = function () {
            const contextType = arguments[0] || "2d";
            const fakeContext = {
              canvas: this,
              getImageData: () => ({
                data: new Uint8ClampedArray([255, 255, 255, 255]),
                width: 1,
                height: 1,
              }),
              createImageData: (w: number, h: number) => ({
                data: new Uint8ClampedArray(w * h * 4 || 4),
                width: w || 1,
                height: h || 1,
              }),
              putImageData: () => {},
              drawImage: () => {},
              fillRect: () => {},
              clearRect: () => {},
              fillStyle: "#000000",
              strokeStyle: "#000000",
              font: "10px sans-serif",
              lineWidth: 1,
              beginPath: () => fakeContext,
              moveTo: () => fakeContext,
              lineTo: () => fakeContext,
              stroke: () => fakeContext,
              fill: () => fakeContext,
              arc: () => fakeContext,
              rect: () => fakeContext,
              measureText: () => ({ width: 0 }),
              getContextAttributes: () => ({
                alpha: true,
                antialias: true,
                depth: true,
                failIfMajorPerformanceCaveat: false,
                powerPreference: "default",
                premultipliedAlpha: true,
                preserveDrawingBuffer: false,
                stencil: true,
              }),
            };
            return fakeContext as any;
          } as any;

          window.HTMLCanvasElement.prototype.toDataURL = function () {
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          };

          window.HTMLCanvasElement.prototype.toBlob = function (callback: (blob: Blob) => void) {
            if (callback)
              callback(new window.Blob([""], { type: "image/png" }));
          };

          if (!window.WebGLRenderingContext) {
            window.WebGLRenderingContext = function () {};
            const originalGetContext =
              window.HTMLCanvasElement.prototype.getContext;
            window.HTMLCanvasElement.prototype.getContext = function (
              contextType: string
            ) {
              if (
                contextType === "webgl" ||
                contextType === "experimental-webgl"
              ) {
                return null;
              }
              return originalGetContext.apply(this, arguments);
            };
          }
        }
      } catch (error) {
        if (isVerbose)
          console.log(
            formatDate(new Date()),
            `模拟Canvas功能时出错: ${error.message}`
          );
        // 继续执行，不中断流程
      }

      // 错误处理
      window.addEventListener("error", function (event) {
        if (
          !event.message.includes("canvas") &&
          !event.message.includes("WebGL")
        ) {
          if (isVerbose)
            console.log(
              formatDate(new Date()),
              `捕获到错误: ${event.message}，但继续执行`
            );
        }
        event.preventDefault();
        return true;
      });

      // 注入准备好的JavaScript
      if (isVerbose) logPerformance("准备注入JavaScript");
      const script = document.createElement("script");
      script.textContent = modifiedJsCode;
      document.body.appendChild(script);
      if (isVerbose) logPerformance("已注入JavaScript");

      // 添加运行JavaScript提示
      if (isVerbose)
        console.log(formatDate(new Date()), "开始运行raw.js获取cookie...");

    } catch (error) {
      console.error(formatDate(new Date()), `执行过程中出错: ${error.message}`);
      resolve(result);
    }
  });
} 