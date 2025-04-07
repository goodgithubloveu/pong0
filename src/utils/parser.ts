/**
 * 解析模块
 * 负责解析Ping0.cc网站返回的IP信息
 */
import * as cheerio from "cheerio";
import { buildHeaders, log } from "./common.ts";

/**
 * 查询IP信息
 * @param cookies - 包含cookie信息的对象
 * @param ip - 要查询的IP地址（可选）
 * @param isVerbose - 是否输出详细日志
 * @returns 查询结果对象
 */
export async function queryIpInfo(
  cookies: { js1key: string | null; pow: string | null },
  ip = '',
  isVerbose = false
): Promise<Record<string, any>> {
  try {
    const startTime = Date.now();
    log(`开始查询${ip ? ip : '本机'}IP信息...`, isVerbose);
    
    // 构建URL - 修正URL格式
    const url = ip ? `https://ping0.cc/ip/${encodeURIComponent(ip)}` : 'https://ping0.cc/';
    
    log(`请求URL: ${url}`, isVerbose);
    
    // 发送请求
    const response = await fetch(url, {
      headers: buildHeaders(cookies)
    });
    
    // 检查响应状态
    if (!response.ok) {
      throw new Error(`请求失败，状态码: ${response.status}`);
    }
    
    // 获取HTML内容
    const html = await response.text();
    if (isVerbose) {
      if (html.length > 300 && html.length < 320) {
        log(`接收到 ${html.length} 字节的响应数据: \n${html}`, isVerbose);
        return { error: `解析失败，可能原因：官方加密文件已更新，可以尝试 -r 参数更新加密文件后重试` };
      }
      else {
        log(`接收到 ${html.length} 字节的响应数据`, isVerbose);
      }
    }
    
    // 解析HTML获取IP信息
    const ipInfo = parseHtml(html, isVerbose);
    
    // 计算耗时
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    log(`IP信息查询完成，耗时: ${executionTime}ms`, isVerbose);
    
    return ipInfo;
  } catch (error) {
    log('查询IP信息失败: ' + error.message, isVerbose, true);
    throw error;
  }
}

/**
 * 从JavaScript变量中提取基本IP信息
 * @param html - HTML内容
 * @param isVerbose - 是否输出详细日志
 * @returns 提取的基本IP信息
 */
function extractBasicInfoFromScript(html: string, isVerbose = false): Record<string, any> {
  const result: Record<string, any> = {};
  
  // 尝试使用正则表达式一次性匹配所有变量
  const scriptRegex = /<script[^>]*>[\s\S]*?window\.ip\s*=\s*'([^']*)'[\s\S]*?window\.ipnum\s*=\s*'([^']*)'[\s\S]*?window\.asndomain\s*=\s*'([^']*)'[\s\S]*?window\.orgdomain\s*=\s*'([^']*)'[\s\S]*?window\.rdns\s*=\s*'([^']*)'[\s\S]*?window\.longitude\s*=\s*'([^']*)'[\s\S]*?window\.latitude\s*=\s*'([^']*)'[\s\S]*?window\.loc\s*=\s*`([^`]*)`[\s\S]*?<\/script>/;
  
  const scriptMatch = html.match(scriptRegex);
  if (scriptMatch) {
    // 从匹配中提取数据
    result.ip = scriptMatch[1];
    result.ipnum = scriptMatch[2];
    const asnDomain = scriptMatch[3];
    const orgDomain = scriptMatch[4];
    const rdns = scriptMatch[5];
    result.longitude = scriptMatch[6];
    result.latitude = scriptMatch[7];
    result.ip_location = scriptMatch[8].replace(/&mdash;.*$/, '').trim();
    
    if (rdns && rdns.length > 0) {
      result.rdns = rdns;
    }
    
    if (isVerbose) {
      log(`从JavaScript变量提取到IP信息: ${result.ip}`, isVerbose);
    }
    
    return result;
  }
  
  // 如果整体匹配失败，则单独提取各个变量
  const ipMatch = html.match(/window\.ip\s*=\s*'([^']*)'/);
  const ipnumMatch = html.match(/window\.ipnum\s*=\s*'([^']*)'/);
  const rdnsMatch = html.match(/window\.rdns\s*=\s*'([^']*)'/);
  const longitudeMatch = html.match(/window\.longitude\s*=\s*'([^']*)'/);
  const latitudeMatch = html.match(/window\.latitude\s*=\s*'([^']*)'/);
  const locMatch = html.match(/window\.loc\s*=\s*`([^`]*)`/);
  
  // 提取IP
  if (ipMatch && ipMatch[1]) {
    result.ip = ipMatch[1].trim();
    if (isVerbose) {
      log(`从JavaScript变量提取到IP信息: ${result.ip}`, isVerbose);
    }
  }
  
  // 获取IP数值
  if (ipnumMatch && ipnumMatch[1]) {
    result.ipnum = ipnumMatch[1].trim();
  }
  
  // 获取反向域名(RDNS)
  if (rdnsMatch && rdnsMatch[1] && rdnsMatch[1].length > 0) {
    result.rdns = rdnsMatch[1];
  }
  
  // 获取经纬度
  if (longitudeMatch && longitudeMatch[1] && latitudeMatch && latitudeMatch[1]) {
    result.longitude = longitudeMatch[1];
    result.latitude = latitudeMatch[1];
  }
  
  // 获取地理位置
  if (locMatch && locMatch[1]) {
    const locParts = locMatch[1].split('&mdash;');
    if (locParts.length >= 1) {
      result.ip_location = locParts[0].trim();
    }
  }
  
  return result;
}

/**
 * 从HTML中提取IP信息的备选方法
 * @param $ - Cheerio实例
 * @param result - 已有的结果对象
 */
function extractIPFromHTML($: cheerio.CheerioAPI, result: Record<string, any>) {
  if (!result.ip) {
    // 获取IP地址信息
    const ipAddress = $('.line.ip .content .ip span').first().text().trim();
    if (ipAddress) {
      result.ip = ipAddress;
    }
  }
}

/**
 * 提取地理位置信息
 * @param $ - Cheerio实例
 * @param result - 已有的结果对象
 */
function extractLocationInfo($: cheerio.CheerioAPI, result: Record<string, any>) {
  // 如果已有位置信息则不处理
  if (result.ip_location) return;
  
  // 备用解析方法 - 直接提取位置文本
  const locationElem = $('.line.loc .content').first();
  if (locationElem.length) {
    const locationText = locationElem.clone().children().remove().end().text().trim();
    const locationParts = locationText.split('—')[0].trim();
    result.ip_location = locationParts;
  }
  
  // 如果没有经纬度信息，尝试从HTML元素中获取
  if (!result.longitude || !result.latitude) {
    $('.line').each((index, element) => {
      const name = $(element).find('.name').text().trim();
      const content = $(element).find('.content').text().trim();
      
      if (name === '经度') {
        result.longitude = content;
      } else if (name === '纬度') {
        result.latitude = content;
      }
    });
  }
  
  // 获取国家/地区国旗
  const flagImg = $('.line.loc .content img').first();
  if (flagImg.length) {
    const flagSrc = flagImg.attr('src');
    if (flagSrc) {
      const flagMatch = flagSrc.match(/\/flags\/([^.]+)\.png/);
      if (flagMatch && flagMatch[1]) {
        result.country_flag = flagMatch[1].toLowerCase();
      }
    }
  }
}

/**
 * 提取ASN相关信息
 * @param $ - Cheerio实例
 * @param result - 已有的结果对象
 */
function extractASNInfo($: cheerio.CheerioAPI, result: Record<string, any>) {
  // 获取ASN信息
  const asnElem = $('.line.asn .content a').first();
  if (asnElem.length) {
    const asnText = asnElem.text().trim();
    result.asn = asnText;
  }
  
  // 获取ASN所有者和类型
  const asnOwnerElem = $('.line.asnname .content').first();
  if (asnOwnerElem.length) {
    const asnOwnerText = asnOwnerElem.clone().children().remove().end().text().trim();
    result.asn_owner = asnOwnerText;
    
    // 获取ASN类型
    const asnTypeElem = asnOwnerElem.find('.label').first();
    if (asnTypeElem.length) {
      // 直接提取label中的文本，如IDC、ISP等
      const labelText = asnTypeElem.text().trim();
      result.asn_type = labelText;
      
      // 如果title属性存在，则使用title
      const titleAttr = asnTypeElem.attr('title');
      if (titleAttr && titleAttr.length > 0) {
        // 提取title文本中的类型信息
        const titleMatch = titleAttr.match(/(IDC|ISP|GOV|EDU|MIL)/i);
        if (titleMatch) {
          result.asn_type = titleMatch[1].toUpperCase();
        }
      }
    } else {
      // 从ASN所有者文本中匹配可能的类型
      const typeMatch = asnOwnerText.match(/(IDC|ISP|GOV|EDU|MIL)/i);
      if (typeMatch) {
        result.asn_type = typeMatch[1].toUpperCase();
      } else {
        // 默认为IDC，因为大多数ASN是IDC
        result.asn_type = "IDC";
      }
    }
  }
}

/**
 * 提取组织相关信息
 * @param $ - Cheerio实例
 * @param result - 已有的结果对象
 */
function extractOrganizationInfo($: cheerio.CheerioAPI, result: Record<string, any>) {
  // 获取企业信息
  const orgElem = $('.line.orgname .content').first();
  if (orgElem.length) {
    const orgText = orgElem.clone().children().remove().end().text().trim();
    result.organization = orgText;
    
    // 获取组织类型
    const orgTypeElem = orgElem.find('.label').first();
    if (orgTypeElem.length) {
      // 直接提取label中的文本，如IDC、ISP等
      const labelText = orgTypeElem.text().trim();
      result.org_type = labelText;
      
      // 如果title属性存在，则使用title
      const titleAttr = orgTypeElem.attr('title');
      if (titleAttr && titleAttr.length > 0) {
        // 提取title文本中的类型信息
        const titleMatch = titleAttr.match(/(IDC|ISP|GOV|EDU|MIL)/i);
        if (titleMatch) {
          result.org_type = titleMatch[1].toUpperCase();
        }
      }
    } else {
      // 从组织文本中匹配可能的类型
      const typeMatch = orgText.match(/(IDC|ISP|GOV|EDU|MIL)/i);
      if (typeMatch) {
        result.org_type = typeMatch[1].toUpperCase();
      }
    }
  }
  
  // 确保asn_type和org_type字段存在，即使为空
  if (!result.hasOwnProperty('asn_type')) {
    result.asn_type = '';
  }
  
  if (!result.hasOwnProperty('org_type')) {
    result.org_type = '';
  }
}

/**
 * 提取IP类型和其他附加信息
 * @param $ - Cheerio实例
 * @param result - 已有的结果对象
 */
function extractAdditionalInfo($: cheerio.CheerioAPI, result: Record<string, any>) {
  // 获取IP类型
  const ipTypeElem = $('.line.line-iptype .content');
  if (ipTypeElem.length) {
    // 收集所有label元素的文本
    const ipTypes: string[] = [];
    ipTypeElem.find('.label').each((_, element) => {
      const labelText = $(element).text().trim();
      if (labelText) {
        ipTypes.push(labelText);
      }
    });
    
    // 将所有类型组合成一个分号分隔的字符串
    if (ipTypes.length > 0) {
      result.ip_type = ipTypes.join('；');
    }
  }
  
  // 获取风险等级
  const riskElem = $('.riskbar .riskcurrent').first();
  if (riskElem.length) {
    const valueElem = riskElem.find('.value').first();
    const labelElem = riskElem.find('.lab').first();
    
    if (valueElem.length && labelElem.length) {
      const value = valueElem.text().trim();
      const label = labelElem.text().trim();
      result.risk_value = `${value} ${label}`;
    }
  }
  
  // 获取原生IP信息
  const nativeIpElem = $('.line.line-nativeip .content .label').first();
  if (nativeIpElem.length) {
    result.native_ip = nativeIpElem.text().trim();
  }
}

/**
 * 解析HTML内容获取IP信息
 * @param html - HTML内容
 * @param isVerbose - 是否输出详细日志
 * @returns 解析后的IP信息对象
 */
function parseHtml(html: string, isVerbose = false): Record<string, any> {
  try {
    const $ = cheerio.load(html);
    
    // 初始化结果对象
    const result = extractBasicInfoFromScript(html, isVerbose);
    
    // 补充解析HTML中的IP信息
    extractIPFromHTML($, result);
    
    // 如果没有找到IP地址，返回错误
    if (!result.ip) {
      if (isVerbose) {
        log('未能从HTML中找到IP地址信息', isVerbose);
      }
      return { error: "无法解析IP地址信息" };
    }
    
    // 提取地理位置信息
    extractLocationInfo($, result);
    
    // 提取ASN信息
    extractASNInfo($, result);
    
    // 提取组织信息
    extractOrganizationInfo($, result);
    
    // 提取IP类型和附加信息
    extractAdditionalInfo($, result);
    
    if (isVerbose) {
      log('完成HTML解析，已提取IP信息', isVerbose);
    }

    result.princess = 'https://linux.do/u/amna';
    
    return result;
  } catch (error) {
    log('解析HTML内容失败: ' + error.message, isVerbose, true);
    return { error: `解析失败: ${error.message}` };
  }
}