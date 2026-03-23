// 后台服务 - 发起纯净的 Steam API 请求（不携带 Cookie）

// 货币代码到国家代码的映射
function getCountryCode(currencyCode) {
    const map = {
        'USD': 'us', 'RUB': 'ru', 'UAH': 'ua',
        'EUR': 'eu', 'GBP': 'gb', 'CNY': 'cn',
        'JPY': 'jp', 'KRW': 'kr', 'BRL': 'br',
        'CAD': 'ca', 'AUD': 'au', 'INR': 'in',
        'CHF': 'ch', 'PLN': 'pl', 'NOK': 'no',
        'IDR': 'id', 'MYR': 'my', 'PHP': 'ph',
        'SGD': 'sg', 'THB': 'th', 'VND': 'vn',
        'TRY': 'tr', 'MXN': 'mx', 'NZD': 'nz',
        'CLP': 'cl', 'PEN': 'pe', 'COP': 'co',
        'ZAR': 'za', 'HKD': 'hk', 'TWD': 'tw',
        'SAR': 'sa', 'AED': 'ae', 'ARS': 'ar',
        'ILS': 'il', 'KZT': 'kz', 'KWD': 'kw',
        'QAR': 'qa', 'CRC': 'cr', 'UYU': 'uy'
    };
    return map[currencyCode] || currencyCode.toLowerCase();
}

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSteamPrice') {
        fetchSteamPrice(request.appId, request.currencyCode)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// 发起纯净的 Steam API 请求（不携带 Cookie）
async function fetchSteamPrice(appId, currencyCode) {
    const countryCode = getCountryCode(currencyCode);
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${countryCode}&l=english`;
    
    console.log(`[Background] 请求 ${currencyCode} (${countryCode}) 价格: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data[appId] || !data[appId].success) {
            console.warn(`[Background] 游戏 ${appId} 在 ${currencyCode} 地区可能未上架`);
            return { price: null, currency: null, rawData: null };
        }
        
        const gameData = data[appId].data;
        
        if (gameData.price_overview) {
            const price = gameData.price_overview.final / 100;
            const currency = gameData.price_overview.currency;
            console.log(`[Background] 成功获取 ${currencyCode} 价格: ${price} ${currency}`);
            return {
                price: price,
                currency: currency,
                rawData: gameData.price_overview  // 返回原始价格数据
            };
        } else if (gameData.is_free) {
            console.log(`[Background] 游戏在 ${currencyCode} 地区是免费的`);
            return {
                price: 0,
                currency: currencyCode,
                rawData: { is_free: true }
            };
        } else {
            console.warn(`[Background] 游戏在 ${currencyCode} 地区没有价格信息`);
            return { price: null, currency: null, rawData: null };
        }
    } catch (error) {
        console.error(`[Background] 获取 ${currencyCode} 价格失败:`, error.message);
        throw error;
    }
}

// 汇率更新定时器
let updateInterval = null;

async function updateExchangeRates() {
    try {
        const response = await fetch('https://api.steaminventoryhelper.com/steam-rates?base=USD', {
            credentials: 'omit'
        });
        const data = await response.json();
        
        if (data.success) {
            await chrome.storage.local.set({ 
                exchangeRates: data.data.rates,
                lastUpdate: Date.now()
            });
            console.log('[Background] 汇率更新成功');
        }
    } catch (error) {
        console.error('[Background] 汇率更新失败:', error);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    updateExchangeRates();
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateExchangeRates, 3600000);
});

chrome.runtime.onStartup.addListener(() => {
    updateExchangeRates();
});

console.log('[Background] Steam Gift Checker 后台服务已启动');