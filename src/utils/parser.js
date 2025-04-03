/**
 * IP信息查询和解析模块
 */
const axios = require('axios');
const cheerio = require('cheerio');
const he = require('he'); // 新增：处理HTML实体
const { formatDate } = require('./fetcher'); // 导入formatDate函数

// 常量定义
const BASE_URL = 'https://ping0.cc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36';

/**
 * 查询IP信息
 * @param {Object} cookies - 包含必要cookie的对象 {js1key, pow}
 * @param {string} ip - 要查询的IP地址，为空则查询当前IP
 * @param {boolean} isVerbose - 是否输出详细日志
 * @returns {Promise<Object>} - 解析后的IP信息
 */
async function queryIpInfo(cookies, ip = '', isVerbose = false) {
  // 验证cookies是否完整
  if (!cookies.js1key || !cookies.pow) {
    throw new Error('必要的cookie不完整，无法进行查询');
  }

  try {
    // 准备查询URL和cookie字符串
    const url = ip ? `${BASE_URL}/ip/${encodeURIComponent(ip)}` : `${BASE_URL}`;
    const cookieStr = `js1key=${cookies.js1key}; pow=${cookies.pow}`;
    
    if (isVerbose) {
      console.log(formatDate(new Date()), `正在查询IP信息: ${ip || '当前IP'}`);
    }
    
    // 发送带有cookie的请求
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': cookieStr,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': BASE_URL
      },
      timeout: 10000, // 10秒超时
      validateStatus: status => status === 200 // 只接受200状态码
    });

    // 解析HTML响应
    const result = parseHtmlResponse(response.data);
    
    if (Object.keys(result).length === 0) {
      throw new Error('解析结果为空，可能是cookie已失效或网站结构发生变化');
    }
    
    return result;
  } catch (error) {
    // 创建要抛出的错误对象
    let errorObj = {
      message: '',
      status: null
    };
    
    // 美化错误信息
    if (error.response) {
      const status = error.response.status;
      errorObj.status = status;
      
      if (status === 403) {
        errorObj.message = '访问被拒绝，cookie可能已失效';
      } else if (status === 429) {
        errorObj.message = '请求过于频繁，请稍后再试';
      } else if (status === 404) {
        errorObj.message = '查询不到此IP信息，可能是无效IP或地址';
      } else if (status === 500) {
        errorObj.message = '网站服务器内部错误，请稍后再试';
      } else if (status === 502 || status === 503 || status === 504) {
        errorObj.message = '网站服务暂时不可用，可能正在维护';
      } else {
        errorObj.message = `查询失败，HTTP状态码: ${status}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorObj.message = '查询超时，请检查网络连接';
    } else if (error.code === 'ECONNREFUSED') {
      errorObj.message = '连接被拒绝，网站可能暂时无法访问';
    } else if (error.code === 'ETIMEDOUT') {
      errorObj.message = '网络连接超时，请检查网络状态';
    } else if (error.code === 'ENETUNREACH') {
      errorObj.message = '网络不可达，请检查网络连接';
    } else if (error.message.includes('certificate')) {
      errorObj.message = 'SSL证书验证失败，可能存在网络问题';
    } else if (error.message.includes('getaddrinfo')) {
      errorObj.message = 'DNS解析失败，无法连接到服务器';
    } else {
      // 如果是从parseHtmlResponse中抛出的自定义错误，直接使用
      errorObj.message = error.message || '未知错误';
    }
    
    // 添加详细诊断信息（仅在内部错误时）
    if (!error.response && error.code) {
      errorObj.message += ` (错误代码: ${error.code})`;
    }
    
    // 创建自定义错误对象
    const customError = new Error(errorObj.message);
    customError.status = errorObj.status;
    
    throw customError;
  }
}

/**
 * 从script标签中提取变量
 * @param {Object} $ - cheerio实例
 * @returns {Object} - 提取的变量对象
 */
function extractScriptVariables($) {
  const scriptValues = {};
  
  // 需要提取的变量名
  const varNames = [
    'window.ip', 'window.tar', 'window.longitude', 'window.latitude', 'window.loc'
  ];
  
  // 遍历所有脚本标签
  $('script').each((_, element) => {
    const content = $(element).html() || '';
    
    for (const varName of varNames) {
      if (content.includes(varName)) {
        // 使用正则表达式提取变量值
        const pattern = new RegExp(`${varName.replace('.', '\\.')}\\s*=\\s*['"]([^'"]*)['"](;|\\s)`, 'i');
        const match = content.match(pattern);
        
        if (match && match[1]) {
          scriptValues[varName] = match[1];
        }
      }
    }
  });
  
  return scriptValues;
}

/**
 * 提取HTML标签之间的文本，去除HTML标签
 * @param {string} html - HTML内容
 * @returns {string} - 清理后的文本
 */
function extractTextBetweenTags(html) {
  // 移除所有HTML标签
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // 移除Vue模板表达式
  text = text.replace(/{{[^}]*}}/g, '');
  
  // 清理多余空格
  text = text.replace(/\s+/g, ' ');
  
  return text.trim();
}

/**
 * 解码HTML实体为正确的Unicode字符
 * @param {string} text - 包含HTML实体的文本
 * @returns {string} - 解码后的文本
 */
function decodeHTMLEntities(text) {
  if (!text) return '';
  
  try {
    // 使用he库解码HTML实体
    return he.decode(text);
  } catch (error) {
    console.error('解码HTML实体失败:', error.message);
    return text;
  }
}

/**
 * 解析HTML响应数据，提取IP信息
 * @param {string} html - HTML响应内容
 * @returns {Object} - 解析后的IP信息
 */
function parseHtmlResponse(html) {
  // 如果HTML内容为空
  if (!html) {
    throw new Error('HTML内容为空');
  }
  
  // 检查是否为错误页面
  if (html.includes('系统发生错误')) {
    throw new Error('网站返回错误: 系统发生错误');
  }
  
  const $ = cheerio.load(html);
  const result = {};
  
  // 获取标题，用于识别错误页面
  const title = $('title').text();
  if (title.includes('系统发生错误') || title.includes('Error')) {
    throw new Error(`网站返回错误页面: ${title}`);
  }
  
  // 从脚本标签中提取变量
  const scriptValues = extractScriptVariables($);
  
  // 设置IP
  if (scriptValues['window.ip']) {
    result.ip = scriptValues['window.ip'];
  } else {
    // 备选方法：从title中提取
    const ipParts = title.split('-');
    if (ipParts.length > 0) {
      result.ip = ipParts[0].trim();
    }
  }
  
  // 如果无法提取到IP，页面可能是错误页面
  if (!result.ip) {
    // 检查页面内容，尝试确定更具体的错误原因
    const pageText = $('body').text();
    // 获取页面摘要，最多显示150个字符
    const pageExcerpt = pageText.length > 150 ? pageText.substring(0, 147) + '...' : pageText;
    
    if (html.includes('访问频率过高') || pageText.includes('访问频率过高')) {
      throw new Error('访问频率过高，请稍后再试');
    } else if (html.includes('系统发生错误') || pageText.includes('系统发生错误')) {
      throw new Error('网站系统错误，请稍后再试');
    } else if (html.includes('无法访问') || pageText.includes('无法访问')) {
      throw new Error('网站无法访问，可能临时维护中');
    } else if (html.includes('查询不到此IP') || pageText.includes('查询不到此IP')) {
      throw new Error('查询不到此IP信息，可能是无效IP或私有IP');
    } else if (html.includes('访问被拒绝') || pageText.includes('访问被拒绝')) {
      throw new Error('访问被拒绝，可能是Cookie已失效');
    } else if (html.includes('robots') || pageText.includes('robots') || pageText.includes('机器人')) {
      throw new Error('被网站识别为机器人或爬虫，请稍后再试');
    } else if (pageText.length < 1000) { // 页面内容过少，可能是错误页面
      throw new Error(`页面内容异常(内容长度: ${pageText.length})，内容: "${pageExcerpt}"`);
    } else {
      // 尝试获取更多上下文
      const title = $('title').text().trim();
      const h1Text = $('h1').text().trim();
      const errorText = $('.error, .alert, .message').text().trim();
      
      if (errorText) {
        throw new Error(`网站返回错误信息: "${errorText}"`);
      } else if (title && title !== 'Ping0.cc') {
        // 获取页面主体的前150个字符
        throw new Error(`页面标题异常: "${title}"，页面内容: "${pageExcerpt}"`);
      } else if (h1Text) {
        throw new Error(`页面内容异常，H1文本: "${h1Text}"，页面摘要: "${pageExcerpt}"`);
      } else {
        throw new Error(`无法从页面提取IP信息，页面内容: "${pageExcerpt}"`);
      }
    }
  }
  
  // 设置IP位置
  if (scriptValues['window.loc']) {
    result.ip_location = decodeHTMLEntities(scriptValues['window.loc']);
  } else {
    // 备选方法：从DOM中提取
    $('.line.loc .content').each((_, element) => {
      const html = $(element).html() || '';
      let text = extractTextBetweenTags(html);
      
      // 移除"错误提交"文本
      text = text.replace('错误提交', '');
      
      // 清理并解码
      text = decodeHTMLEntities(text.trim());
      
      if (text) {
        result.ip_location = text;
      }
    });
  }
  
  // 提取国家旗帜
  $('.line.loc .content img').each((_, element) => {
    const flagSrc = $(element).attr('src');
    if (flagSrc) {
      const parts = flagSrc.split('/');
      if (parts.length > 0) {
        const flagFile = parts[parts.length - 1];
        result.country_flag = flagFile.replace('.png', '');
      }
    }
  });
  
  // 提取ASN
  $('.line.asn .content a').each((_, element) => {
    result.asn = $(element).text().trim();
  });
  
  // 提取ASN所有者和类型
  $('.line.asnname .content').each((_, element) => {
    // 复制当前选择器用于后续提取标签
    const content = $(element).clone();
    
    // 移除标签元素，获取纯文本
    content.find('.label').remove();
    let asnOwner = content.text().trim();
    
    // 移除连字符和后面的内容
    const dashIndex = asnOwner.indexOf('—');
    if (dashIndex !== -1) {
      asnOwner = asnOwner.substring(0, dashIndex).trim();
    }
    
    // 应用HTML实体解码
    result.asn_owner = decodeHTMLEntities(asnOwner);
    
    // 提取ASN类型 - 收集所有类型并用分号分隔
    const asnTypes = [];
    $(element).find('.label').each((_, label) => {
      const asnType = $(label).text().trim();
      if (asnType) {
        asnTypes.push(asnType);
      }
    });
    
    // 用分号连接所有ASN类型
    if (asnTypes.length > 0) {
      result.asn_type = asnTypes.join('; ');
    } else {
      result.asn_type = '';
    }
  });
  
  // 提取组织信息和类型
  $('.line.orgname .content').each((_, element) => {
    // 复制当前选择器用于后续提取标签
    const content = $(element).clone();
    
    // 移除标签元素，获取纯文本
    content.find('.label').remove();
    let org = content.text().trim();
    
    // 移除连字符和后面的内容
    const dashIndex = org.indexOf('—');
    if (dashIndex !== -1) {
      org = org.substring(0, dashIndex).trim();
    }
    
    // 应用HTML实体解码
    result.organization = decodeHTMLEntities(org);
    
    // 提取组织类型 - 收集所有类型并用分号分隔
    const orgTypes = [];
    $(element).find('.label').each((_, label) => {
      const orgType = $(label).text().trim();
      if (orgType) {
        orgTypes.push(orgType);
      }
    });
    
    // 用分号连接所有组织类型
    if (orgTypes.length > 0) {
      result.org_type = orgTypes.join('; ');
    } else {
      result.org_type = '';
    }
  });
  
  // 提取经度
  if (scriptValues['window.longitude']) {
    result.longitude = scriptValues['window.longitude'];
  } else {
    $('.line').each((_, element) => {
      const name = $(element).find('.name').text().trim();
      if (name === '经度') {
        result.longitude = $(element).find('.content').text().trim();
      }
    });
  }
  
  // 提取纬度
  if (scriptValues['window.latitude']) {
    result.latitude = scriptValues['window.latitude'];
  } else {
    $('.line').each((_, element) => {
      const name = $(element).find('.name').text().trim();
      if (name === '纬度') {
        result.latitude = $(element).find('.content').text().trim();
      }
    });
  }
  
  // 提取IP类型 - 收集所有类型并用分号分隔
  const ipTypes = [];
  $('.line.line-iptype .content .label').each((_, element) => {
    const ipType = $(element).text().trim();
    if (ipType) {
      ipTypes.push(ipType);
    }
  });
  
  // 用分号连接所有IP类型
  if (ipTypes.length > 0) {
    result.ip_type = ipTypes.join('; ');
  }
  
  // 提取风控值
  $('.line.line-risk .content .riskbar .riskcurrent').each((_, element) => {
    const value = $(element).find('.value').text().trim();
    const lab = $(element).find('.lab').text().trim();
    if (value && lab) {
      result.risk_value = `${value} ${lab}`;
    }
  });
  
  // 提取原生IP
  $('.line.line-nativeip .content .label').each((_, element) => {
    result.native_ip = $(element).text().trim();
  });
  
  // 验证结果
  if (!result.ip) {
    return {};
  }

  result.princess = "https://linux.do/u/amna"
  
  return result;
}

module.exports = {
  queryIpInfo
}; 