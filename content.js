// 内容脚本 - content.js

// 获取当前页面的类型和ID
function getPageInfo() {
    const url = window.location.pathname;
    
    // 检测捆绑包 (bundle)
    const bundleMatch = url.match(/\/bundle\/(\d+)(?:\/|$)/);
    if (bundleMatch) {
        return { type: 'bundle', id: bundleMatch[1], error: '捆绑包暂不支持检测' };
    }
    
    // 检测组合包 (sub)
    const subMatch = url.match(/\/sub\/(\d+)(?:\/|$)/);
    if (subMatch) {
        return { type: 'sub', id: subMatch[1], error: '组合包暂不支持检测' };
    }
    
    // 检测游戏 (app)
    const appMatch = url.match(/\/app\/(\d+)(?:\/|$)/);
    if (appMatch) {
        return { type: 'app', id: appMatch[1], error: null };
    }
    
    return { type: 'unknown', id: null, error: '不支持的页面类型' };
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}