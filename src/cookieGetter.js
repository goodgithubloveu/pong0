/**
 * Cookie获取模块
 * 使用JSDOM模拟浏览器环境，执行JavaScript获取cookie
 */
const fs = require("fs");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { formatDate } = require("./utils/fetcher");

/**
 * 获取cookie值
 * @param {string} x1 - 站点验证字符串
 * @param {string} difficulty - 难度值
 * @param {boolean} isVerbose - 是否输出详细日志
 * @returns {Promise<{js1key: string|null, pow: string|null}>} 包含cookie的对象
 */
async function getCookies(x1, difficulty, isVerbose = false) {
  return new Promise(async (resolve) => {
    // 初始化结果对象
    const result = { js1key: null, pow: null };

    try {
      // 读取JavaScript文件
      let jsCode;
      try {
        const rawJsPath = path.resolve(process.cwd(), "raw.js");
        jsCode = fs.readFileSync(rawJsPath, "utf8");
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
          /window\.location\.reload\(\)/g,
          "console.log('阻止了页面刷新')"
        )
        .replace(
          /window\.location\.href\s*=\s*([^;]+)/g,
          "console.log('阻止了重定向到', $1)"
        )
        .replace(
          /window\.location\.replace\(([^)]+)\)/g,
          "console.log('阻止了replace重定向到', $1)"
        )
        .replace(
          /window\.location\.assign\(([^)]+)\)/g,
          "console.log('阻止了assign重定向到', $1)"
        )
        .replace(
          /window\.open\(([^)]+)\)/g,
          "console.log('阻止了window.open', $1)"
        )
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
        pretendToBeVisual: true,
      });

      const { window } = dom;
      const { document } = window;

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
              createImageData: (w, h) => ({
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
            return fakeContext;
          };

          window.HTMLCanvasElement.prototype.toDataURL = function () {
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          };

          window.HTMLCanvasElement.prototype.toBlob = function (callback) {
            if (callback)
              callback(new window.Blob([""], { type: "image/png" }));
          };

          if (!window.WebGLRenderingContext) {
            window.WebGLRenderingContext = function () {};
            const originalGetContext =
              window.HTMLCanvasElement.prototype.getContext;
            window.HTMLCanvasElement.prototype.getContext = function (
              contextType
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

      // 性能监控
      const perfStart = Date.now();
      const logPerformance = (stage) => {
        const elapsed = Date.now() - perfStart;
        if (isVerbose)
          console.log(formatDate(new Date()), `${stage} - 耗时 ${elapsed}ms`);
      };

      // 拦截日志
      const addTimestamp = (msg) => `${formatDate(new Date())} ${msg}`;
      const originalConsoleLog = console.log;
      if (isVerbose) {
        window.console.log = (...args) => {
          if (isVerbose) originalConsoleLog(addTimestamp(args.join(" ")));
        };
      } else {
        window.console.log = () => {}; // 不输出任何内容
      }
      window.console = console;

      // 存储cookie
      const cookies = {};

      // 监听cookie设置
      Object.defineProperty(document, "cookie", {
        get: () =>
          Object.entries(cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join("; "),
        set: (cookieString) => {
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
                // 重写关键函数阻止导航错误
                window.location.reload = () => {};
                // 直接销毁JSDOM对象
                process.nextTick(() => {
                  if (dom && dom.window) {
                    dom.window.close();
                  }
                });
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

      // 设置关键值
      window.x1 = x1;
      window.difficulty = difficulty;

      // 阻止重定向
      const preventRedirectScript = document.createElement("script");
      preventRedirectScript.innerHTML = `
        window.location.href = window.location.href;
        window.location.reload = function() { console.log('阻止了页面刷新'); };
        window.location.replace = function() { console.log('阻止了页面替换'); };
        window.location.assign = function() { console.log('阻止了页面赋值'); };
      `;
      document.head.appendChild(preventRedirectScript);

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

      // 注入准备好的JavaScript
      const script = document.createElement("script");
      script.textContent = modifiedJsCode;
      if (isVerbose) logPerformance("准备注入JavaScript");

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

module.exports = getCookies;
