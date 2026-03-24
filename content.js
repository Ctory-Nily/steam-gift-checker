// 内容脚本 - content.js

// 获取当前页面的类型、ID和API类型
function getPageInfo() {
    const url = window.location.pathname;
    const hostname = window.location.hostname;
    
    // ========== Steam 商店页面 ==========
    if (hostname === 'store.steampowered.com') {
        const bundleMatch = url.match(/\/bundle\/(\d+)(?:\/|$)/);
        if (bundleMatch) {
            return { type: 'bundle', id: bundleMatch[1], error: '捆绑包暂不支持检测', apiType: null, source: 'steam' };
        }
        
        const subMatch = url.match(/\/sub\/(\d+)(?:\/|$)/);
        if (subMatch) {
            return { type: 'sub', id: subMatch[1], error: null, apiType: 'package', source: 'steam' };
        }
        
        const appMatch = url.match(/\/app\/(\d+)(?:\/|$)/);
        if (appMatch) {
            return { type: 'app', id: appMatch[1], error: null, apiType: 'app', source: 'steam' };
        }
    }
    
    // ========== SteamDB 页面 ==========
    if (hostname === 'steamdb.info') {
        const appMatch = url.match(/\/app\/(\d+)(?:\/|$)/);
        if (appMatch) {
            return { type: 'app', id: appMatch[1], error: null, apiType: 'app', source: 'steamdb' };
        }
        
        const subMatch = url.match(/\/sub\/(\d+)(?:\/|$)/);
        if (subMatch) {
            return { type: 'sub', id: subMatch[1], error: null, apiType: 'package', source: 'steamdb' };
        }
    }
    
    return { type: 'unknown', id: null, error: '不支持的页面类型\n\n支持的页面：\n- store.steampowered.com/app/xxxxx\n- store.steampowered.com/sub/xxxxx\n- steamdb.info/app/xxxxx\n- steamdb.info/sub/xxxxx', apiType: null, source: null };
}

const currencyToCountryMap = {
    // 标准货币
    'Ukrainian Hryvnia': 'ua',
    'Russian Ruble': 'ru',
    'U.S. Dollar': 'us',
    'Euro': 'eu',
    'British Pound': 'uk',
    'Chinese Yuan': 'cn',
    'Japanese Yen': 'jp',
    'South Korean Won': 'kr',
    'Brazilian Real': 'br',
    'Indian Rupee': 'in',
    'Canadian Dollar': 'ca',
    'Australian Dollar': 'au',
    'Swiss Franc': 'ch',
    'Polish Zloty': 'pl',
    'Norwegian Krone': 'no',
    'Indonesian Rupiah': 'id',
    'Malaysian Ringgit': 'my',
    'Philippine Peso': 'ph',
    'Singapore Dollar': 'sg',
    'Thai Baht': 'th',
    'Vietnamese Dong': 'vn',
    'Turkish Lira': 'tr',
    'Mexican Peso': 'mx',
    'New Zealand Dollar': 'nz',
    'Chilean Peso': 'cl',
    'Peruvian Sol': 'pe',
    'Colombian Peso': 'co',
    'South African Rand': 'za',
    'Hong Kong Dollar': 'hk',
    'Taiwan Dollar': 'tw',
    'Saudi Riyal': 'sa',
    'U.A.E. Dirham': 'ae',
    'Argentine Peso': 'ar',
    'Israeli New Shekel': 'il',
    'Kazakhstani Tenge': 'kz',
    'Kuwaiti Dinar': 'kw',
    'Qatari Riyal': 'qa',
    'Costa Rican Colon': 'cr',
    'Uruguayan Peso': 'uy',
    // 区域组（使用 USD 的地区）- 必须放在 U.S. Dollar 之前，确保优先匹配
    'LATAM - U.S. Dollar': 'ar',
    'CIS - U.S. Dollar': 'az',
    'South Asia - USD': 'pk',
    'MENA - U.S. Dollar': 'tr'
};

// 从 SteamDB 页面获取当前显示的国家（增强版）
function getSteamDBCountry() {
    try {
        console.log('[Content] 开始获取 SteamDB 国家...');
        
        // 方法1: 从货币选择器按钮获取
        const currencyBtn = document.querySelector('#js-currency-selector-btn');
        if (currencyBtn) {
            console.log('[Content] 找到货币选择器按钮');
            
            // 查找货币名称 span
            const currencySpan = currencyBtn.querySelector('.single-price-name');
            if (currencySpan) {
                const currencyText = currencySpan.textContent.trim();
                console.log(`[Content] SteamDB 货币选择器文本: "${currencyText}"`);
                
                // 优先匹配区域组（长文本），避免被 U.S. Dollar 匹配
                // 区域组映射顺序：LATAM, CIS, South Asia, MENA 优先匹配
                const regionGroupOrder = [
                    'LATAM - U.S. Dollar',
                    'CIS - U.S. Dollar', 
                    'South Asia - USD',
                    'MENA - U.S. Dollar'
                ];
                
                // 先检查区域组
                for (const regionText of regionGroupOrder) {
                    if (currencyText === regionText || currencyText.includes(regionText)) {
                        const countryCode = currencyToCountryMap[regionText];
                        console.log(`[Content] 匹配到区域组: ${regionText} -> ${countryCode}`);
                        return countryCode;
                    }
                }
                
                // 再检查其他货币
                for (const [currencyName, countryCode] of Object.entries(currencyToCountryMap)) {
                    // 跳过已经检查过的区域组
                    if (regionGroupOrder.includes(currencyName)) continue;
                    
                    if (currencyText === currencyName || currencyText.includes(currencyName)) {
                        console.log(`[Content] 匹配到货币: ${currencyName} -> ${countryCode}`);
                        return countryCode;
                    }
                }
                
                // 如果没有精确匹配，尝试模糊匹配
                for (const [currencyName, countryCode] of Object.entries(currencyToCountryMap)) {
                    if (currencyText.toLowerCase().includes(currencyName.toLowerCase()) || 
                        currencyName.toLowerCase().includes(currencyText.toLowerCase())) {
                        console.log(`[Content] 模糊匹配到: ${currencyName} -> ${countryCode}`);
                        return countryCode;
                    }
                }
                
                console.log(`[Content] 未找到匹配的货币: ${currencyText}`);
            } else {
                console.log('[Content] 未找到 .single-price-name 元素');
            }
        } else {
            console.log('[Content] 未找到 #js-currency-selector-btn 按钮');
        }
        
        // 方法2: 从页面中的 flag 图片获取
        const flagImg = document.querySelector('.flag');
        if (flagImg && flagImg.src) {
            const flagMatch = flagImg.src.match(/\/country\/([a-z]{2})\.svg/i);
            if (flagMatch) {
                const countryCode = flagMatch[1].toLowerCase();
                console.log(`[Content] 从 flag 图片获取到当前国家: ${countryCode}`);
                return countryCode;
            }
        }
        
        // 方法3: 从 URL 参数获取
        const urlParams = new URLSearchParams(window.location.search);
        const ccParam = urlParams.get('cc');
        if (ccParam) {
            console.log(`[Content] 从 URL 参数获取到当前国家: ${ccParam}`);
            return ccParam.toLowerCase();
        }
        
        console.log('[Content] 无法获取 SteamDB 国家');
        return null;
    } catch (error) {
        console.error('[Content] 获取 SteamDB 国家失败:', error);
        return null;
    }
}

// 获取当前 Steam 账号所在的国家 - 支持所有页面
function getCurrentSteamCountry() {
    const pageInfo = getPageInfo();
    console.log(`[Content] 获取当前国家, 页面来源: ${pageInfo.source}`);
    
    // SteamDB 页面：从页面元素获取
    if (pageInfo.source === 'steamdb') {
        const countryFromSteamDB = getSteamDBCountry();
        if (countryFromSteamDB) {
            console.log(`[Content] SteamDB 获取到国家: ${countryFromSteamDB}`);
            return countryFromSteamDB;
        }
        console.log('[Content] SteamDB 无法获取国家，返回 null');
        return null;
    }
    
    // Steam 商店页面：原有逻辑
    try {
        // 方法1: 从 application_config 元素获取
        const appConfigElement = document.getElementById('application_config');
        if (appConfigElement) {
            const dataConfig = appConfigElement.getAttribute('data-config');
            if (dataConfig) {
                const config = JSON.parse(dataConfig);
                if (config.COUNTRY) {
                    const countryCode = config.COUNTRY.toLowerCase();
                    console.log(`[Content] 从 application_config 元素获取到当前国家: ${countryCode}`);
                    return countryCode;
                }
            }
        }
        
        // 方法2: 从 GStoreItemData 获取
        if (typeof GStoreItemData !== 'undefined' && 
            GStoreItemData.rgNavParams && 
            GStoreItemData.rgNavParams.__page_default_obj && 
            GStoreItemData.rgNavParams.__page_default_obj.countrycode) {
            let countryCode = GStoreItemData.rgNavParams.__page_default_obj.countrycode;
            countryCode = countryCode.toLowerCase();
            console.log(`[Content] 从 GStoreItemData 获取到当前国家: ${countryCode}`);
            return countryCode;
        }
        
        // 方法3: 从 application_config 变量获取
        if (typeof application_config !== 'undefined' && application_config.COUNTRY) {
            let countryCode = application_config.COUNTRY;
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
    console.log('[Content] 收到消息:', request);
    
    if (request.action === 'checkGift') {
        console.log('[Content] 开始检测礼物...');
        const pageInfo = getPageInfo();
        
        if (pageInfo.error) {
            console.log('[Content] 页面错误:', pageInfo.error);
            sendResponse({ error: pageInfo.error });
            return true;
        }
        
        if (pageInfo.type !== 'app' && pageInfo.type !== 'sub') {
            console.log('[Content] 不支持的页面类型:', pageInfo.type);
            sendResponse({ error: `暂不支持此页面类型: ${pageInfo.type}` });
            return true;
        }
        
        checkGiftability(request, pageInfo)
            .then(result => {
                console.log('[Content] 检测完成:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('[Content] 检测失败:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
    
    // 获取当前国家
    if (request.action === 'getCurrentCountry') {
        const countryCode = getCurrentSteamCountry();
        console.log('[Content] 返回当前国家:', countryCode);
        sendResponse({ success: true, countryCode: countryCode });
        return true;
    }
    
    // 刷新当前国家
    if (request.action === 'refreshCountry') {
        const countryCode = getCurrentSteamCountry();
        console.log('[Content] 刷新后国家:', countryCode);
        sendResponse({ success: true, countryCode: countryCode });
        return true;
    }
    
    // ping 测试
    if (request.action === 'ping') {
        console.log('[Content] 响应 ping, 页面:', window.location.href);
        const pageInfo = getPageInfo();
        sendResponse({ 
            success: true, 
            message: 'pong', 
            url: window.location.href, 
            source: pageInfo.source,
            type: pageInfo.type
        });
        return true;
    }
    
    return true;
});

// 通过 background 获取指定国家的价格 - 支持多种类型
async function fetchPriceFromSteamAPI(apiType, id, steamCC) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'fetchSteamPrice',
            apiType: apiType,
            id: id,
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
                    rawData: response.rawData,
                    isFree: response.isFree,
                    isFreeTrial: response.isFreeTrial,
                    originalPrice: response.originalPrice,
                    message: response.message
                });
            } else {
                reject(new Error(response?.error || '获取价格失败'));
            }
        });
    });
}

// 获取两个国家的价格
async function fetchBothPrices(apiType, id, senderSteamCC, recipientSteamCC) {
    console.log(`通过 Background 获取 ${senderSteamCC} 和 ${recipientSteamCC} 的价格...`);
    console.log(`类型: ${apiType}, ID: ${id}`);
    
    const [senderResult, recipientResult] = await Promise.all([
        fetchPriceFromSteamAPI(apiType, id, senderSteamCC),
        fetchPriceFromSteamAPI(apiType, id, recipientSteamCC)
    ]);
    
    if (senderResult.price === null) {
        throw new Error(`无法获取 ${senderSteamCC} 的价格\n\n该内容可能在发送方地区未上架`);
    }
    
    if (recipientResult.price === null) {
        throw new Error(`无法获取 ${recipientSteamCC} 的价格\n\n该内容可能在接收方地区未上架`);
    }
    
    console.log(`成功获取价格: ${senderSteamCC}=${senderResult.price}, ${recipientSteamCC}=${recipientResult.price}`);
    
    return {
        senderPrice: senderResult.price,
        recipientPrice: recipientResult.price,
        senderCurrency: senderResult.currency,
        recipientCurrency: recipientResult.currency,
        source: 'Steam 官方接口',
        senderIsFree: senderResult.isFree,
        senderIsFreeTrial: senderResult.isFreeTrial,
        senderMessage: senderResult.message,
        senderOriginalPrice: senderResult.originalPrice,
        recipientIsFree: recipientResult.isFree,
        recipientIsFreeTrial: recipientResult.isFreeTrial,
        recipientMessage: recipientResult.message,
        recipientOriginalPrice: recipientResult.originalPrice
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
async function checkGiftability(params, pageInfo) {
    const { senderCode, recipientCode, senderRate, recipientRate } = params;
    
    console.log('=== Steam 礼物检测开始 ===');
    console.log(`页面来源: ${pageInfo.source}, 类型: ${pageInfo.type}, ID: ${pageInfo.id}`);
    console.log(`发送方 Steam CC: ${senderCode}, 汇率: ${senderRate}`);
    console.log(`接收方 Steam CC: ${recipientCode}, 汇率: ${recipientRate}`);
    
    const id = pageInfo.id;
    const apiType = pageInfo.apiType;
    
    const prices = await fetchBothPrices(apiType, id, senderCode, recipientCode);
    
    const { 
        senderPrice, recipientPrice, source,
        senderIsFree, senderIsFreeTrial, senderMessage, senderOriginalPrice,
        recipientIsFree, recipientIsFreeTrial, recipientMessage, recipientOriginalPrice
    } = prices;
    
    // 处理免费游戏
    if (senderIsFree || senderIsFreeTrial) {
        let freeMessage = '';
        if (senderIsFreeTrial) {
            freeMessage = `🎉 发送方地区: ${senderMessage} (原价 ${senderOriginalPrice} ${senderCode})`;
        } else {
            freeMessage = `🎉 发送方地区: ${senderMessage}`;
        }
        
        return {
            canGift: true,
            senderPrice: senderPrice,
            recipientPrice: recipientPrice,
            source: source,
            isPriceDiffAcceptable: true,
            priceDiffPercent: 0,
            convertedRecipientToSender: 0,
            senderCurrency: senderCode,
            recipientCurrency: recipientCode,
            rawSenderPrice: senderPrice,
            rawRecipientPrice: recipientPrice,
            appId: id,
            pageType: pageInfo.type,
            isFreeGame: true,
            freeMessage: freeMessage,
            originalPrice: senderOriginalPrice,
            isFreeTrial: senderIsFreeTrial
        };
    }
    
    if (recipientIsFree || recipientIsFreeTrial) {
        let freeMessage = '';
        if (recipientIsFreeTrial) {
            freeMessage = `🎉 接收方地区: ${recipientMessage} (原价 ${recipientOriginalPrice} ${recipientCode})`;
        } else {
            freeMessage = `🎉 接收方地区: ${recipientMessage}`;
        }
        
        return {
            canGift: true,
            senderPrice: senderPrice,
            recipientPrice: recipientPrice,
            source: source,
            isPriceDiffAcceptable: true,
            priceDiffPercent: 0,
            convertedRecipientToSender: 0,
            senderCurrency: senderCode,
            recipientCurrency: recipientCode,
            rawSenderPrice: senderPrice,
            rawRecipientPrice: recipientPrice,
            appId: id,
            pageType: pageInfo.type,
            isFreeGame: true,
            freeMessage: freeMessage,
            originalPrice: recipientOriginalPrice,
            isFreeTrial: recipientIsFreeTrial
        };
    }
    
    // 正常价格计算
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
        appId: id,
        pageType: pageInfo.type,
        isFreeGame: false,
        failReason: priceDiff.isAcceptable ? null : `价格差异 ${Math.abs(priceDiff.percentage).toFixed(2)}% > 15%`
    };
}

// 初始化
function init() {
    console.log('[Content] ========== Steam Gift Checker 已加载 ==========');
    console.log('[Content] 当前页面:', window.location.href);
    console.log('[Content] 页面来源:', window.location.hostname);
    
    const pageInfo = getPageInfo();
    console.log(`[Content] 页面类型: ${pageInfo.type}, 来源: ${pageInfo.source}`);
    if (pageInfo.error) {
        console.log(`[Content] 提示: ${pageInfo.error}`);
    } else if (pageInfo.type === 'app' || pageInfo.type === 'sub') {
        console.log(`[Content] 支持检测, ID: ${pageInfo.id}`);
    }
    
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}