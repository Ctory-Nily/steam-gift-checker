// 内容脚本 - content.js

// 获取当前页面的类型和ID
function getPageInfo() {
    const url = window.location.pathname;
    
    const bundleMatch = url.match(/\/bundle\/(\d+)(?:\/|$)/);
    if (bundleMatch) {
        return { type: 'bundle', id: bundleMatch[1], error: '捆绑包暂不支持检测' };
    }
    
    const subMatch = url.match(/\/sub\/(\d+)(?:\/|$)/);
    if (subMatch) {
        return { type: 'sub', id: subMatch[1], error: '组合包暂不支持检测' };
    }
    
    const appMatch = url.match(/\/app\/(\d+)(?:\/|$)/);
    if (appMatch) {
        return { type: 'app', id: appMatch[1], error: null };
    }
    
    return { type: 'unknown', id: null, error: '不支持的页面类型' };
}

// 从 application_config 元素中提取 COUNTRY
function getCountryFromApplicationConfig() {
    try {
        const appConfigElement = document.getElementById('application_config');
        if (appConfigElement) {
            const dataConfig = appConfigElement.getAttribute('data-config');
            if (dataConfig) {
                // 解析 JSON 字符串
                const config = JSON.parse(dataConfig);
                if (config.COUNTRY) {
                    // 转换为小写，与 background.js 中的 key 保持一致
                    const countryCode = config.COUNTRY.toLowerCase();
                    console.log(`[Content] 从 application_config 获取到当前国家: ${countryCode} (原始: ${config.COUNTRY})`);
                    return countryCode;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('[Content] 解析 application_config 失败:', error);
        return null;
    }
}

// 获取当前 Steam 账号所在的国家 - 多种方式
function getCurrentSteamCountry() {
    try {
        // 方法1: 从 application_config 元素获取（最可靠）
        const countryFromElement = getCountryFromApplicationConfig();
        if (countryFromElement) {
            return countryFromElement;
        }
        
        // 方法2: 从 GStoreItemData 获取
        if (typeof GStoreItemData !== 'undefined' && 
            GStoreItemData.rgNavParams && 
            GStoreItemData.rgNavParams.__page_default_obj && 
            GStoreItemData.rgNavParams.__page_default_obj.countrycode) {
            let countryCode = GStoreItemData.rgNavParams.__page_default_obj.countrycode;
            // 转换为小写
            countryCode = countryCode.toLowerCase();
            console.log(`[Content] 从 GStoreItemData 获取到当前国家: ${countryCode}`);
            return countryCode;
        }
        
        // 方法3: 从 application_config 变量获取
        if (typeof application_config !== 'undefined' && application_config.COUNTRY) {
            let countryCode = application_config.COUNTRY;
            // 转换为小写
            countryCode = countryCode.toLowerCase();
            console.log(`[Content] 从 application_config 变量获取到当前国家: ${countryCode}`);
            return countryCode;
        }
        
        console.log('[Content] 无法获取当前国家');
        return null;
    } catch (error) {
        console.error('[Content] 获取当前国家失败:', error);
        return null;
    }
}

// 强制刷新获取国家（不刷新页面，只重新读取变量）
function refreshCurrentCountry() {
    const countryCode = getCurrentSteamCountry();
    console.log(`[Content] 刷新后获取到当前国家: ${countryCode}`);
    return countryCode;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkGift') {
        const pageInfo = getPageInfo();
        
        if (pageInfo.type !== 'app') {
            sendResponse({ error: pageInfo.error || '当前页面不是游戏单品页面，请进入游戏页面后重试' });
            return true;
        }
        
        checkGiftability(request)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
    
    // 获取当前国家
    if (request.action === 'getCurrentCountry') {
        const countryCode = getCurrentSteamCountry();
        sendResponse({ success: true, countryCode: countryCode });
        return true;
    }
    
    // 刷新当前国家（不刷新页面）
    if (request.action === 'refreshCountry') {
        const countryCode = refreshCurrentCountry();
        sendResponse({ success: true, countryCode: countryCode });
        return true;
    }
});

// 通过 background 获取指定国家的价格
async function fetchPriceFromSteamAPI(appId, steamCC) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'fetchSteamPrice',
            appId: appId,
            steamCC: steamCC
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            
            if (response && response.success) {
                resolve({
                    price: response.price,
                    currency: response.currency,
                    rawData: response.rawData
                });
            } else {
                reject(new Error(response?.error || '获取价格失败'));
            }
        });
    });
}

// 获取两个国家的价格
async function fetchBothPrices(appId, senderSteamCC, recipientSteamCC) {
    console.log(`通过 Background 获取 ${senderSteamCC} 和 ${recipientSteamCC} 的价格...`);
    
    const [senderResult, recipientResult] = await Promise.all([
        fetchPriceFromSteamAPI(appId, senderSteamCC),
        fetchPriceFromSteamAPI(appId, recipientSteamCC)
    ]);
    
    if (senderResult.price === null) {
        throw new Error(`无法获取 ${senderSteamCC} 的价格\n\n该游戏可能在发送方地区未上架`);
    }
    
    if (recipientResult.price === null) {
        throw new Error(`无法获取 ${recipientSteamCC} 的价格\n\n该游戏可能在接收方地区未上架`);
    }
    
    console.log(`成功获取价格: ${senderSteamCC}=${senderResult.price}, ${recipientSteamCC}=${recipientResult.price}`);
    
    return {
        senderPrice: senderResult.price,
        recipientPrice: recipientResult.price,
        senderCurrency: senderResult.currency,
        recipientCurrency: recipientResult.currency,
        source: 'Steam 官方接口'
    };
}

// 计算价格差异百分比
function calculatePriceDifference(senderPrice, recipientPrice, senderRate, recipientRate) {
    const convertedRecipientToSender = recipientPrice * senderRate / recipientRate;
    const difference = convertedRecipientToSender - senderPrice;
    const percentage = (difference / senderPrice) * 100;
    return {
        percentage: percentage,
        convertedRecipientToSender: convertedRecipientToSender,
        isAcceptable: Math.abs(percentage) <= 15
    };
}

// 主要检查逻辑
async function checkGiftability(params) {
    const { senderCode, recipientCode, senderRate, recipientRate } = params;
    
    console.log('=== Steam 礼物检测开始 ===');
    console.log(`发送方 Steam CC: ${senderCode}, 汇率: ${senderRate}`);
    console.log(`接收方 Steam CC: ${recipientCode}, 汇率: ${recipientRate}`);
    
    const pageInfo = getPageInfo();
    const appId = pageInfo.id;
    console.log(`游戏 ID: ${appId}`);
    
    const { senderPrice, recipientPrice, source } = await fetchBothPrices(appId, senderCode, recipientCode);
    
    console.log(`发送方价格: ${senderPrice}`);
    console.log(`接收方价格: ${recipientPrice}`);
    
    const priceDiff = calculatePriceDifference(senderPrice, recipientPrice, senderRate, recipientRate);
    const canGift = priceDiff.isAcceptable;
    
    console.log(`价格差异: ${priceDiff.percentage.toFixed(2)}%`);
    console.log(`可以赠送: ${canGift ? '✅ 是' : '❌ 否'}`);
    
    return {
        canGift: canGift,
        senderPrice: senderPrice,
        recipientPrice: recipientPrice,
        source: source,
        isPriceDiffAcceptable: priceDiff.isAcceptable,
        priceDiffPercent: priceDiff.percentage,
        convertedRecipientToSender: priceDiff.convertedRecipientToSender,
        senderCurrency: senderCode,
        recipientCurrency: recipientCode,
        rawSenderPrice: senderPrice,
        rawRecipientPrice: recipientPrice,
        appId: appId,
        pageType: pageInfo.type,
        failReason: priceDiff.isAcceptable ? null : `价格差异 ${Math.abs(priceDiff.percentage).toFixed(2)}% > 15%`
    };
}

// 初始化
function init() {
    console.log('Steam Gift Checker 已加载');
    const pageInfo = getPageInfo();
    console.log(`当前页面类型: ${pageInfo.type}`);
    if (pageInfo.error) {
        console.log(`提示: ${pageInfo.error}`);
    }
    
    // 获取当前国家并保存到 storage
    const currentCountry = getCurrentSteamCountry();
    if (currentCountry) {
        chrome.storage.local.set({ currentSteamCountry: currentCountry });
        console.log(`已保存当前 Steam 国家: ${currentCountry}`);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}