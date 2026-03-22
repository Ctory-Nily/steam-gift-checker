// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkGift') {
        checkGiftability(request)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// 获取当前页面的App ID
function getAppId() {
    const match = window.location.pathname.match(/\/app\/(\d+)/);
    return match ? match[1] : null;
}

// 验证是否在有效的Steam游戏页面
function isValidSteamPage() {
    const url = window.location.href;
    if (!url.includes('store.steampowered.com')) {
        return false;
    }
    const appId = getAppId();
    if (!appId) {
        return false;
    }
    return true;
}

// 从SteamDB获取指定国家的价格
async function fetchPriceFromSteamDB(appId, currencyCode) {
    const steamDbUrl = `https://steamdb.info/app/${appId}/`;
    
    // 使用多个代理服务，提高成功率
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(steamDbUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(steamDbUrl)}`
    ];
    
    for (const proxy of proxies) {
        try {
            console.log(`尝试通过代理获取 ${currencyCode} 价格: ${proxy}`);
            const response = await fetch(proxy);
            
            if (!response.ok) {
                console.warn(`代理返回 HTTP ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            const html = data.contents || data;
            
            if (!html || html.includes('403') || html.includes('Access Denied')) {
                console.warn('代理返回被拒绝');
                continue;
            }
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const price = extractPriceByCurrencyFromSteamDB(doc, currencyCode);
            if (price !== null) {
                console.log(`成功获取 ${currencyCode} 价格: ${price}`);
                return price;
            }
        } catch (error) {
            console.warn(`代理请求失败:`, error.message);
        }
    }
    
    console.error(`无法获取 ${currencyCode} 的价格`);
    return null;
}

// 从SteamDB HTML中提取指定货币的价格
function extractPriceByCurrencyFromSteamDB(doc, currencyCode) {
    // SteamDB 的价格表格结构
    // 通常: 国家名称 | 货币代码 | 价格 | 折扣
    const rows = doc.querySelectorAll('table tbody tr');
    
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
            // 第二列是货币代码
            const currencyCell = cells[1];
            const currencyText = currencyCell ? currencyCell.textContent.trim() : '';
            
            // 精确匹配货币代码
            if (currencyText === currencyCode) {
                // 第三列是价格
                const priceCell = cells[2];
                if (priceCell) {
                    const priceText = priceCell.textContent.trim();
                    console.log(`找到 ${currencyCode} 价格单元格: "${priceText}"`);
                    
                    // 提取数字
                    const priceMatch = priceText.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/);
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1].replace(/[,\s]/g, ''));
                        if (!isNaN(price) && price > 0) {
                            return price;
                        }
                    }
                }
            }
        }
    }
    
    // 如果精确匹配失败，尝试模糊匹配（行文本包含货币代码）
    for (const row of rows) {
        const rowText = row.textContent;
        if (rowText.includes(currencyCode)) {
            const price = findPriceInRow(row);
            if (price !== null) {
                console.log(`通过模糊匹配找到 ${currencyCode} 价格: ${price}`);
                return price;
            }
        }
    }
    
    return null;
}

// 在表格行中查找价格
function findPriceInRow(row) {
    const cells = row.querySelectorAll('td');
    
    for (const cell of cells) {
        const cellText = cell.textContent.trim();
        // 匹配价格数字
        const priceMatch = cellText.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/);
        if (priceMatch) {
            const price = parseFloat(priceMatch[1].replace(/[,\s]/g, ''));
            if (!isNaN(price) && price > 0 && price < 100000) {
                return price;
            }
        }
    }
    
    return null;
}

// 获取两个国家的价格（仅使用 SteamDB）
async function fetchBothPrices(appId, senderCode, recipientCode) {
    console.log(`从 SteamDB 获取 ${senderCode} 和 ${recipientCode} 的价格...`);
    
    // 并行获取两个国家的价格
    const [senderPrice, recipientPrice] = await Promise.all([
        fetchPriceFromSteamDB(appId, senderCode),
        fetchPriceFromSteamDB(appId, recipientCode)
    ]);
    
    if (senderPrice === null) {
        throw new Error(`无法获取 ${senderCode} 的价格，该游戏可能在俄罗斯地区未上架`);
    }
    
    if (recipientPrice === null) {
        throw new Error(`无法获取 ${recipientCode} 的价格，该游戏可能在乌克兰地区未上架`);
    }
    
    console.log(`成功获取价格: ${senderCode}=${senderPrice}, ${recipientCode}=${recipientPrice}`);
    
    return { senderPrice, recipientPrice, source: 'SteamDB' };
}

// 主要检查逻辑
async function checkGiftability(params) {
    const { senderCode, recipientCode, senderRate, recipientRate } = params;
    
    console.log('=== Steam 礼物检测开始 ===');
    console.log(`发送方: ${senderCode}, 汇率: ${senderRate}`);
    console.log(`接收方: ${recipientCode}, 汇率: ${recipientRate}`);
    
    // 验证页面
    if (!isValidSteamPage()) {
        throw new Error('请确保当前在有效的 Steam 游戏页面');
    }
    
    const appId = getAppId();
    console.log(`游戏 ID: ${appId}`);
    
    // 从 SteamDB 获取价格
    const { senderPrice, recipientPrice, source } = await fetchBothPrices(appId, senderCode, recipientCode);
    
    console.log(`发送方价格: ${senderPrice} ${senderCode}`);
    console.log(`接收方价格: ${recipientPrice} ${recipientCode}`);
    
    // 计算公式: 发送国价格 × 1.15 × 接收国汇率 / 发送国汇率
    const calculated = senderPrice * 1.15 * recipientRate / senderRate;
    
    // 按照你的原始逻辑: 计算结果 > 实际价格 = 可以赠送
    const canGift = calculated > recipientPrice;
    const difference = calculated - recipientPrice;
    
    console.log('=== 计算结果 ===');
    console.log(`数据来源: ${source}`);
    console.log(`计算: ${senderPrice} × 1.15 × ${recipientRate} / ${senderRate} = ${calculated.toFixed(2)} ${recipientCode}`);
    console.log(`实际价格: ${recipientPrice} ${recipientCode}`);
    console.log(`差额: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} ${recipientCode}`);
    console.log(`结果: ${canGift ? '✅ 可以赠送 (计算结果 > 实际价格)' : '❌ 无法赠送 (计算结果 < 实际价格)'}`);
    
    return {
        canGift: canGift,
        calculated: calculated,
        actualPrice: recipientPrice,
        senderPrice: senderPrice,
        difference: difference,
        source: source
    };
}

// 初始化
function init() {
    console.log('Steam Gift Checker 已加载');
    if (isValidSteamPage()) {
        console.log('有效的 Steam 游戏页面, App ID:', getAppId());
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}