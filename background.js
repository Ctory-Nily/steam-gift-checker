// 后台服务 - background.js

// ========== 国家/货币配置表 ==========
const countryConfig = {
    // 标准国家（有独立货币）
    'cn': { currencyCode: 'CNY', currencyName: '中国', symbol: '¥', steamCC: 'cn' },
    'ua': { currencyCode: 'UAH', currencyName: '乌克兰', symbol: '₴', steamCC: 'ua' },
    'vn': { currencyCode: 'VND', currencyName: '越南', symbol: '₫', steamCC: 'vn' },
    'id': { currencyCode: 'IDR', currencyName: '印度尼西亚', symbol: 'Rp', steamCC: 'id' },
    'ph': { currencyCode: 'PHP', currencyName: '菲律宾', symbol: '₱', steamCC: 'ph' },
    'in': { currencyCode: 'INR', currencyName: '印度', symbol: '₹', steamCC: 'in' },
    'br': { currencyCode: 'BRL', currencyName: '巴西', symbol: 'R$', steamCC: 'br' },
    'ru': { currencyCode: 'RUB', currencyName: '俄罗斯', symbol: '₽', steamCC: 'ru' },
    'kr': { currencyCode: 'KRW', currencyName: '韩国', symbol: '₩', steamCC: 'kr' },
    'cl': { currencyCode: 'CLP', currencyName: '智利', symbol: 'CLP$', steamCC: 'cl' },
    'tw': { currencyCode: 'TWD', currencyName: '台湾', symbol: 'NT$', steamCC: 'tw' },
    'hk': { currencyCode: 'HKD', currencyName: '香港', symbol: 'HK$', steamCC: 'hk' },
    'kz': { currencyCode: 'KZT', currencyName: '哈萨克斯坦', symbol: '₸', steamCC: 'kz' },
    'pe': { currencyCode: 'PEN', currencyName: '秘鲁', symbol: 'S/.', steamCC: 'pe' },
    'th': { currencyCode: 'THB', currencyName: '泰国', symbol: '฿', steamCC: 'th' },
    'jp': { currencyCode: 'JPY', currencyName: '日本', symbol: '¥', steamCC: 'jp' },
    'mx': { currencyCode: 'MXN', currencyName: '墨西哥', symbol: 'Mex$', steamCC: 'mx' },
    'co': { currencyCode: 'COP', currencyName: '哥伦比亚', symbol: 'COL$', steamCC: 'co' },
    'uy': { currencyCode: 'UYU', currencyName: '乌拉圭', symbol: '$U', steamCC: 'uy' },
    'my': { currencyCode: 'MYR', currencyName: '马来西亚', symbol: 'RM', steamCC: 'my' },
    'sg': { currencyCode: 'SGD', currencyName: '新加坡', symbol: 'S$', steamCC: 'sg' },
    'za': { currencyCode: 'ZAR', currencyName: '南非', symbol: 'R', steamCC: 'za' },
    'nz': { currencyCode: 'NZD', currencyName: '新西兰', symbol: 'NZ$', steamCC: 'nz' },
    'ca': { currencyCode: 'CAD', currencyName: '加拿大', symbol: 'CDN$', steamCC: 'ca' },
    'kw': { currencyCode: 'KWD', currencyName: '科威特', symbol: 'KD', steamCC: 'kw' },
    'sa': { currencyCode: 'SAR', currencyName: '沙特', symbol: 'SR', steamCC: 'sa' },
    'us': { currencyCode: 'USD', currencyName: '美国', symbol: '$', steamCC: 'us' },
    'au': { currencyCode: 'AUD', currencyName: '澳大利亚', symbol: 'A$', steamCC: 'au' },
    'cr': { currencyCode: 'CRC', currencyName: '哥斯达黎加', symbol: '₡', steamCC: 'cr' },
    'qa': { currencyCode: 'QAR', currencyName: '卡塔尔', symbol: 'QR', steamCC: 'qa' },
    'ae': { currencyCode: 'AED', currencyName: '阿联酋', symbol: 'AED', steamCC: 'ae' },
    'pl': { currencyCode: 'PLN', currencyName: '波兰', symbol: 'zł', steamCC: 'pl' },
    'eu': { currencyCode: 'EUR', currencyName: '欧元区', symbol: '€', steamCC: 'eu' },
    'no': { currencyCode: 'NOK', currencyName: '挪威', symbol: 'kr', steamCC: 'no' },
    'uk': { currencyCode: 'GBP', currencyName: '英国', symbol: '£', steamCC: 'uk' },
    'il': { currencyCode: 'ILS', currencyName: '以色列', symbol: '₪', steamCC: 'il' },
    'ch': { currencyCode: 'CHF', currencyName: '瑞士', symbol: 'CHF', steamCC: 'ch' },
    
    // 使用 USD 的区域组（使用各自的 Steam CC）
    'ar': { currencyCode: 'USD', currencyName: '阿根廷', symbol: '$', steamCC: 'ar', regionGroup: 'LATAM' },
    'tr': { currencyCode: 'USD', currencyName: '土耳其', symbol: '$', steamCC: 'tr', regionGroup: 'MENA' },
    'az': { currencyCode: 'USD', currencyName: '阿塞拜疆', symbol: '$', steamCC: 'az', regionGroup: 'CIS' },
    'pk': { currencyCode: 'USD', currencyName: '南亚', symbol: '$', steamCC: 'pk', regionGroup: 'ASIA' },
};

// 获取所有国家列表（用于下拉框，key 使用 steamCC）
function getAllCountries() {
    const countries = [];
    for (const [steamCC, config] of Object.entries(countryConfig)) {
        countries.push({
            key: steamCC,
            code: config.currencyCode,
            steamCC: steamCC,
            name: config.currencyName,
            symbol: config.symbol,
            regionGroup: config.regionGroup || null
        });
    }
    return countries;
}

// 根据 Steam CC 获取货币代码
function getCurrencyCode(steamCC) {
    return countryConfig[steamCC]?.currencyCode || 'USD';
}

// 获取 app 价格 (原有接口)
async function fetchAppPrice(appId, steamCC) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${steamCC}&l=english`;
    
    console.log(`[Background] 请求 App ${appId} (${steamCC}): ${url}`);
    
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
            console.warn(`[Background] 游戏 ${appId} 在 ${steamCC} 地区可能未上架`);
            return { price: null, currency: null, rawData: null, isFree: false, isFreeTrial: false, message: null };
        }
        
        const gameData = data[appId].data;
        
        if (gameData.price_overview) {
            const price = gameData.price_overview.final / 100;
            const currency = gameData.price_overview.currency;  // 货币代码
            const discountPercent = gameData.price_overview.discount_percent || 0;
            const initialPrice = gameData.price_overview.initial / 100;
            
            if (discountPercent === 100) {
                return {
                    price: 0,
                    currency: currency,
                    rawData: gameData.price_overview,
                    isFree: false,
                    isFreeTrial: true,
                    originalPrice: initialPrice,
                    message: '限时免费游戏'
                };
            }
            
            return {
                price: price,
                currency: currency,  // 返回货币代码
                rawData: gameData.price_overview,
                isFree: false,
                isFreeTrial: false,
                message: null
            };
        } 
        else if (gameData.is_free) {
            return {
                price: 0,
                currency: getCurrencyCode(steamCC),
                rawData: { is_free: true },
                isFree: true,
                isFreeTrial: false,
                message: '永久免费游戏'
            };
        } 
        else {
            return { price: null, currency: null, rawData: null, isFree: false, isFreeTrial: false, message: null };
        }
    } catch (error) {
        console.error(`[Background] 获取 App ${appId} 价格失败:`, error.message);
        throw error;
    }
}

// 获取 sub (组合包) 价格 - 新增 sub 接口
async function fetchSubPrice(packageId, steamCC) {
    const url = `https://store.steampowered.com/api/packagedetails?packageids=${packageId}&cc=${steamCC}&l=english`;
    
    console.log(`[Background] 请求 Sub ${packageId} (${steamCC}): ${url}`);
    
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
        
        if (!data[packageId] || !data[packageId].success) {
            console.warn(`[Background] 组合包 ${packageId} 在 ${steamCC} 地区可能未上架`);
            return { price: null, currency: null, rawData: null, isFree: false, isFreeTrial: false, message: null };
        }
        
        const packageData = data[packageId].data;
        
        if (packageData.price) {
            const price = packageData.price.final / 100;
            const currency = packageData.price.currency;  // 货币代码
            const discountPercent = packageData.price.discount_percent || 0;
            const initialPrice = packageData.price.initial / 100;
            
            if (discountPercent === 100) {
                return {
                    price: 0,
                    currency: currency,
                    rawData: packageData.price,
                    isFree: false,
                    isFreeTrial: true,
                    originalPrice: initialPrice,
                    message: '限时免费组合包'
                };
            }
            
            return {
                price: price,
                currency: currency,  // 返回货币代码
                rawData: packageData.price,
                isFree: false,
                isFreeTrial: false,
                message: null
            };
        } 
        else if (packageData.is_free) {
            return {
                price: 0,
                currency: getCurrencyCode(steamCC),
                rawData: { is_free: true },
                isFree: true,
                isFreeTrial: false,
                message: '永久免费组合包'
            };
        } 
        else {
            return { price: null, currency: null, rawData: null, isFree: false, isFreeTrial: false, message: null };
        }
    } catch (error) {
        console.error(`[Background] 获取 Sub ${packageId} 价格失败:`, error.message);
        throw error;
    }
}

// 统一的价格获取接口
async function fetchPrice(apiType, id, steamCC) {
    if (apiType === 'app') {
        return await fetchAppPrice(id, steamCC);
    } else if (apiType === 'package') {
        return await fetchSubPrice(id, steamCC);
    } else {
        throw new Error(`不支持的 API 类型: ${apiType}`);
    }
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSteamPrice') {
        fetchPrice(request.apiType, request.id, request.steamCC)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'getAllCountries') {
        sendResponse({ success: true, countries: getAllCountries() });
        return true;
    }
});

// 汇率更新
let updateInterval = null;

async function updateExchangeRates() {
    try {
        const response = await fetch('https://api.steaminventoryhelper.com/steam-rates?base=USD', {
            credentials: 'omit'
        });
        const data = await response.json();
        
        if (data.success) {
            const neededCurrencies = [...new Set(Object.values(countryConfig).map(c => c.currencyCode))];
            const filteredRates = {};
            for (const currency of neededCurrencies) {
                if (data.data.rates[currency]) {
                    filteredRates[currency] = data.data.rates[currency];
                }
            }
            
            await chrome.storage.local.set({ 
                exchangeRates: filteredRates,
                allCountries: getAllCountries(),
                lastUpdate: Date.now()
            });
            console.log('[Background] 汇率更新成功，共', Object.keys(filteredRates).length, '种货币');
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