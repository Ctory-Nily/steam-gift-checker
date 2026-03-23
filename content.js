// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkGift') {
        checkGiftability(request)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// 获取当前页面的类型和ID - 支持多种 URL 格式
function getPageInfo() {
    const url = window.location.pathname;
    
    // 检测捆绑包 (bundle) - 支持 /bundle/62019/ 和 /bundle/62019/_/ 等格式
    const bundleMatch = url.match(/\/bundle\/(\d+)(?:\/|$)/);
    if (bundleMatch) {
        return { type: 'bundle', id: bundleMatch[1], error: '捆绑包暂不支持检测' };
    }
    
    // 检测组合包 (sub) - 支持 /sub/1010505/ 和 /sub/1010505/_/ 等格式
    const subMatch = url.match(/\/sub\/(\d+)(?:\/|$)/);
    if (subMatch) {
        return { type: 'sub', id: subMatch[1], error: '组合包暂不支持检测' };
    }
    
    // 检测游戏 (app) - 支持 /app/2436940/ 和 /app/2436940/xxx/ 等格式
    const appMatch = url.match(/\/app\/(\d+)(?:\/|$)/);
    if (appMatch) {
        return { type: 'app', id: appMatch[1], error: null };
    }
    
    return { type: 'unknown', id: null, error: '不支持的页面类型' };
}

// 验证是否在有效的Steam游戏页面
function isValidSteamPage() {
    const pageInfo = getPageInfo();
    return pageInfo.type === 'app';
}

// 通过 background 获取指定国家的价格（返回完整数据）
async function fetchPriceFromSteamAPI(appId, currencyCode) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'fetchSteamPrice',
            appId: appId,
            currencyCode: currencyCode
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
async function fetchBothPrices(appId, senderCode, recipientCode) {
    console.log(`通过 Background 获取 ${senderCode} 和 ${recipientCode} 的价格...`);
    
    const [senderResult, recipientResult] = await Promise.all([
        fetchPriceFromSteamAPI(appId, senderCode),
        fetchPriceFromSteamAPI(appId, recipientCode)
    ]);
    
    if (senderResult.price === null) {
        throw new Error(`无法获取 ${senderCode} 的价格\n\n可能原因：
1. 该游戏在发送方地区未上架
2. 网络连接问题
3. 请稍后重试`);
    }
    
    if (recipientResult.price === null) {
        throw new Error(`无法获取 ${recipientCode} 的价格\n\n可能原因：
1. 该游戏在接收方地区未上架
2. 网络连接问题
3. 请稍后重试`);
    }
    
    console.log(`成功获取价格: ${senderCode}=${senderResult.price}, ${recipientCode}=${recipientResult.price}`);
    
    return {
        senderPrice: senderResult.price,
        recipientPrice: recipientResult.price,
        senderCurrency: senderResult.currency,
        recipientCurrency: recipientResult.currency,
        senderRawData: senderResult.rawData,
        recipientRawData: recipientResult.rawData,
        source: 'Steam 官方接口'
    };
}

// 计算价格差异百分比（以发送方货币为基准）
// 公式: (接收方价格换算成发送方货币 - 发送方实际价格) / 发送方实际价格 × 100%
function calculatePriceDifference(senderPrice, recipientPrice, senderRate, recipientRate) {
    // 将接收方价格换算成发送方货币
    const convertedRecipientToSender = recipientPrice * senderRate / recipientRate;
    // 计算差异百分比（以发送方实际价格为基准）
    const difference = convertedRecipientToSender - senderPrice;
    const percentage = (difference / senderPrice) * 100;
    return {
        percentage: percentage,
        convertedRecipientToSender: convertedRecipientToSender,
        isAcceptable: Math.abs(percentage) <= 15
    };
}

// 主要检查逻辑 - 只保留15%价格差异检查
async function checkGiftability(params) {
    const { senderCode, recipientCode, senderRate, recipientRate } = params;
    
    console.log('=== Steam 礼物检测开始 ===');
    console.log(`发送方: ${senderCode}, 汇率: ${senderRate}`);
    console.log(`接收方: ${recipientCode}, 汇率: ${recipientRate}`);
    
    // 验证页面类型
    const pageInfo = getPageInfo();
    if (pageInfo.error) {
        throw new Error(pageInfo.error);
    }
    
    if (pageInfo.type !== 'app') {
        throw new Error('当前页面不是游戏单品页面，请进入游戏页面后重试');
    }
    
    const appId = pageInfo.id;
    console.log(`游戏 ID: ${appId}`);
    
    // 获取两个国家的价格
    const {
        senderPrice, recipientPrice,
        senderCurrency, recipientCurrency,
        source
    } = await fetchBothPrices(appId, senderCode, recipientCode);
    
    console.log(`发送方价格: ${senderPrice} ${senderCurrency}`);
    console.log(`接收方价格: ${recipientPrice} ${recipientCurrency}`);
    
    // ========== 价格差异检查（15% 限制）- 唯一检查方式 ==========
    const priceDiff = calculatePriceDifference(senderPrice, recipientPrice, senderRate, recipientRate);
    
    // 最终判断：价格差异不超过 15%
    const canGift = priceDiff.isAcceptable;
    
    console.log('=== 价格差异检查 (15% 限制) ===');
    console.log(`发送方价格: ${senderPrice} ${senderCode}`);
    console.log(`接收方价格换算成发送方货币: ${priceDiff.convertedRecipientToSender.toFixed(2)} ${senderCode}`);
    console.log(`价格差异: ${priceDiff.percentage > 0 ? '+' : ''}${priceDiff.percentage.toFixed(2)}%`);
    console.log(`结果: ${priceDiff.isAcceptable ? '✅ 可以赠送 (差异 ≤15%)' : `❌ 无法赠送 (差异 ${Math.abs(priceDiff.percentage).toFixed(2)}% > 15%)`}`);
    
    console.log('=== 最终结果 ===');
    console.log(`可以赠送: ${canGift ? '✅ 是' : '❌ 否'}`);
    
    // 生成详细的结果说明
    let failReason = '';
    if (!priceDiff.isAcceptable) {
        const absPercent = Math.abs(priceDiff.percentage).toFixed(2);
        failReason = `价格差异检查不通过：两地价格差异 ${absPercent}% > 15%，差价过大`;
    }
    
    return {
        canGift: canGift,
        senderPrice: senderPrice,
        recipientPrice: recipientPrice,
        source: source,
        // 价格差异相关
        isPriceDiffAcceptable: priceDiff.isAcceptable,
        priceDiffPercent: priceDiff.percentage,
        convertedRecipientToSender: priceDiff.convertedRecipientToSender,
        failReason: failReason,
        // 原始价格数据
        senderCurrency: senderCurrency,
        recipientCurrency: recipientCurrency,
        rawSenderPrice: senderPrice,
        rawRecipientPrice: recipientPrice,
        appId: appId,
        pageType: pageInfo.type
    };
}

// 初始化
function init() {
    console.log('Steam Gift Checker 已加载');
    const pageInfo = getPageInfo();
    if (pageInfo.type === 'app') {
        console.log('有效的 Steam 游戏页面, App ID:', pageInfo.id);
    } else if (pageInfo.error) {
        console.log(pageInfo.error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}