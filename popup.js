// 弹窗脚本 - popup.js

// 全局变量
let exchangeRates = {};
let allCountries = [];
let senderFilterTerm = '';
let recipientFilterTerm = '';
let isLoading = false;  // 添加加载状态标志

// ========== 辅助函数 ==========

function showError(message, isSuccess = false) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    if (isSuccess) {
        const errorContent = errorContainer.querySelector('.error-content');
        errorContent.style.background = 'rgba(88, 211, 133, 0.95)';
        errorContent.style.borderLeftColor = '#4ade80';
    } else {
        const errorContent = errorContainer.querySelector('.error-content');
        errorContent.style.background = 'rgba(220, 53, 69, 0.95)';
        errorContent.style.borderLeftColor = '#ff6b6b';
    }
    
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        if (errorContainer.style.display === 'block') {
            errorContainer.style.display = 'none';
            errorContainer.style.background = '';
            errorContainer.style.borderLeftColor = '';
        }
    }, 5000);
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.style.display = 'none';
}

// 货币格式化函数 - 根据货币代码返回格式化后的价格字符串
function formatPrice(price, currencyCode) {
    if (price === undefined || price === null) return 'N/A';
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return price.toString();
    
    // 根据货币代码格式化
    switch (currencyCode) {
        // 美元 (USD) 及 USD 区域组
        case 'us':
        case 'ar':
        case 'tr':
        case 'az':
        case 'pk':
            return `$${numPrice.toFixed(2)}`;
        
        // 人民币 (CNY)
        case 'cn':
            return `¥ ${numPrice.toFixed(2)}`;
        
        // 印尼卢比 (IDR)
        case 'id':
            return `Rp ${Math.round(numPrice).toLocaleString()}`;
        
        // 印度卢比 (INR)
        case 'in':
            return `₹ ${Math.round(numPrice).toLocaleString()}`;
        
        // 菲律宾比索 (PHP)
        case 'ph':
            return `₱${numPrice.toFixed(2)}`;
        
        // 越南盾 (VND)
        case 'vn':
            return `${Math.round(numPrice).toLocaleString()}₫`;
        
        // 韩国元 (KRW)
        case 'kr':
            return `₩ ${Math.round(numPrice).toLocaleString()}`;
        
        // 俄罗斯卢布 (RUB)
        case 'ru':
            return `${Math.round(numPrice)} ₽`;
        
        // 乌克兰格里夫纳 (UAH)
        case 'ua':
            return `${Math.round(numPrice)}₴`;
        
        // 哈萨克斯坦坚戈 (KZT)
        case 'kz':
            return `${Math.round(numPrice).toLocaleString()}₸`;
        
        // 新台币 (TWD)
        case 'tw':
            return `NT$ ${Math.round(numPrice).toLocaleString()}`;
        
        // 马来西亚林吉特 (MYR)
        case 'my':
            return `RM${numPrice.toFixed(2)}`;
        
        // 泰国铢 (THB)
        case 'th':
            return `฿${numPrice.toFixed(2)}`;
        
        // 日元 (JPY)
        case 'jp':
            return `¥ ${Math.round(numPrice).toLocaleString()}`;
        
        // 加拿大元 (CAD)
        case 'ca':
            return `CDN$ ${numPrice.toFixed(2)}`;
        
        // 智利比索 (CLP)
        case 'cl':
            return `CLP$ ${Math.round(numPrice).toLocaleString()}`;
        
        // 乌拉圭比索 (UYU)
        case 'uy':
            return `$U${Math.round(numPrice).toLocaleString()}`;
        
        // 巴西雷亚尔 (BRL)
        case 'br':
            return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
        
        // 新西兰元 (NZD)
        case 'nz':
            return `NZ$ ${numPrice.toFixed(2)}`;
        
        // 港币 (HKD)
        case 'hk':
            return `HK$ ${numPrice.toFixed(2)}`;
        
        // 科威特第纳尔 (KWD)
        case 'kw':
            return `${numPrice.toFixed(3)} KD`;
        
        // 秘鲁索尔 (PEN)
        case 'pe':
            return `S/.${numPrice.toFixed(2)}`;
        
        // 墨西哥比索 (MXN)
        case 'mx':
            return `Mex$ ${Math.round(numPrice).toLocaleString()}`;
        
        // 阿联酋迪拉姆 (AED)
        case 'ae':
            return `${numPrice.toFixed(2)} AED`;
        
        // 英镑 (GBP)
        case 'uk':
            return `£${numPrice.toFixed(2)}`;
        
        // 沙特里亚尔 (SAR)
        case 'sa':
            return `${Math.round(numPrice)} SR`;
        
        // 哥伦比亚比索 (COP)
        case 'co':
            return `COL$ ${Math.round(numPrice).toLocaleString()}`;
        
        // 卡塔尔里亚尔 (QAR)
        case 'qa':
            return `${Math.round(numPrice)} QR`;
        
        // 哥斯达黎加科朗 (CRC)
        case 'cr':
            return `₡${Math.round(numPrice).toLocaleString()}`;
        
        // 南非兰特 (ZAR)
        case 'za':
            return `R ${numPrice.toFixed(2)}`;
        
        // 澳大利亚元 (AUD)
        case 'au':
            return `A$ ${numPrice.toFixed(2)}`;
        
        // 挪威克朗 (NOK)
        case 'no':
            return `${numPrice.toFixed(2).replace('.', ',')} kr`;
        
        // 新加坡元 (SGD)
        case 'sg':
            return `S$${numPrice.toFixed(2)}`;
        
        // 欧元 (EUR)
        case 'eu':
            return `${numPrice.toFixed(2).replace('.', ',')}€`;
        
        // 波兰兹罗提 (PLN)
        case 'pl':
            return `${numPrice.toFixed(2).replace('.', ',')}zł`;
        
        // 瑞士法郎 (CHF)
        case 'ch':
            return `CHF ${numPrice.toFixed(2)}`;
        
        // 以色列新谢克尔 (ILS)
        case 'il':
            return `₪${Math.round(numPrice)}`;
        
        // 默认格式
        default:
            return `${numPrice.toFixed(2)} ${steamCC.toUpperCase()}`;
    }
}

// 在状态区域显示检测结果
function showResultInStatusArea(canGift, response, senderSteamCC, recipientSteamCC, senderRate, recipientRate) {
    const resultArea = document.getElementById('resultArea');
    const resultContent = document.getElementById('resultContent');
    
    // 获取货币代码
    const senderCurrencyCode = response.senderCurrency || senderSteamCC;
    const recipientCurrencyCode = response.recipientCurrency || recipientSteamCC;
    
    // 格式化价格
    const formattedSenderPrice = formatPrice(response.rawSenderPrice, senderCurrencyCode);
    const formattedRecipientPrice = formatPrice(response.rawRecipientPrice, recipientCurrencyCode);
    const formattedConvertedPrice = formatPrice(response.convertedRecipientToSender, senderCurrencyCode);
    
    // 如果是免费游戏
    if (response.isFreeGame) {
        const freeMessage = response.freeMessage;
        
        resultContent.innerHTML = `
            <div class="result-status error">❌ 不可以赠送！<br>${freeMessage}</div>
        `;
        resultArea.style.display = 'block';
        return;
    }
    
    // 正常显示
    const statusClass = canGift ? 'success' : 'error';
    const statusText = canGift ? '✅ 可以赠送！' : '❌ 不可以赠送';
    const priceDiffPercent = response.priceDiffPercent;
    const diffSymbol = priceDiffPercent > 0 ? '' : '+';
    
    resultContent.innerHTML = `
        <div class="result-status ${statusClass}">${statusText}</div>
        ${response.failReason ? `<div style="font-size: 11px; color: #f87171; margin-bottom: 8px;">⚠️ ${response.failReason}</div>` : ''}
        <div class="result-detail">
            <div class="result-detail-row">📊 价格差异: <span style="color: ${Math.abs(priceDiffPercent) > 15 ? '#f87171' : '#4ade80'}">${diffSymbol}${-priceDiffPercent.toFixed(2)}%</span> ${Math.abs(priceDiffPercent) > 15 ? '(超过15%限制)' : '(符合要求)'}</div>
            <div class="result-detail-row">💰 赠送方价格 (${senderCurrencyCode.toUpperCase()}): ${formattedSenderPrice}</div>
            <div class="result-detail-row">💰 收礼方价格 (${recipientCurrencyCode.toUpperCase()}): ${formattedRecipientPrice}</div>
            <div class="result-detail-row">🔄 换算后: ${formattedRecipientPrice} × ${senderRate.toFixed(4)} / ${recipientRate.toFixed(4)} = ${formattedConvertedPrice}</div>
        </div>
    `;
    
    resultArea.style.display = 'block';
}

function hideResultInStatusArea() {
    const resultArea = document.getElementById('resultArea');
    resultArea.style.display = 'none';
}

function showLoading() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> 检测中...';
    hideError();
    hideResultInStatusArea();
}

function hideLoading() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span> 检测该游戏';
}

function saveCountries() {
    const sender = document.getElementById('senderCountry').value;
    const recipient = document.getElementById('recipientCountry').value;
    if (sender && recipient) {
        chrome.storage.local.set({ 
            senderCountry: sender, 
            recipientCountry: recipient
        });
        updateStatusDisplay(true);  // 静默更新，不触发保存循环
    }
}

function loadSavedCountries() {
    chrome.storage.local.get(['senderCountry', 'recipientCountry'], (result) => {
        if (result.senderCountry) {
            document.getElementById('senderCountry').value = result.senderCountry;
        }
        if (result.recipientCountry) {
            document.getElementById('recipientCountry').value = result.recipientCountry;
        }
        updateStatusDisplay();
    });
}

// 更新状态显示区域
function updateStatusDisplay(silent = false) {
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    const senderCountry = allCountries.find(c => c.key === senderSteamCC);
    const recipientCountry = allCountries.find(c => c.key === recipientSteamCC);
    
    if (senderCountry) {
        document.getElementById('senderDisplay').textContent = `${senderCountry.name} (${senderCountry.key.toUpperCase()}) - ${senderCountry.code}`;
    } else {
        document.getElementById('senderDisplay').textContent = '未选择';
    }
    
    if (recipientCountry) {
        document.getElementById('recipientDisplay').textContent = `${recipientCountry.name} (${recipientCountry.key.toUpperCase()}) - ${recipientCountry.code}`;
    } else {
        document.getElementById('recipientDisplay').textContent = '未选择';
    }
}

// 根据 steamCC 获取国家名称
function getCountryNameBySteamCC(steamCC) {
    if (!steamCC) return '未知';
    const country = allCountries.find(c => c.key === steamCC);
    return country ? country.name : steamCC.toUpperCase();
}

// 从 content script 获取当前 Steam 国家
async function getCurrentSteamCountry(refresh = false) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.log('[Popup] 没有活动标签页');
                resolve(null);
                return;
            }
            
            const tabId = tabs[0].id;
            const action = refresh ? 'refreshCountry' : 'getCurrentCountry';
            
            console.log(`[Popup] 发送 ${action} 请求到 tab ${tabId}`);
            
            // 设置超时
            const timeoutId = setTimeout(() => {
                console.log('[Popup] 获取国家/地区超时');
                resolve(null);
            }, 5000);
            
            chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    console.log('[Popup] 获取当前国家/地区失败:', chrome.runtime.lastError.message);
                    resolve(null);
                    return;
                }
                
                if (response && response.success && response.countryCode) {
                    console.log(`[Popup] 获取到当前国家/地区: ${response.countryCode}`);
                    resolve(response.countryCode);
                } else {
                    console.log('[Popup] 响应中没有国家/地区代码');
                    resolve(null);
                }
            });
        });
    });
}

// 刷新并显示当前国家（用户点击刷新按钮时调用）
async function refreshCurrentCountry() {
    console.log('[Popup] 开始刷新当前国家/地区');
    
    // 如果正在加载，等待
    if (isLoading) {
        console.log('[Popup] 正在加载中，稍后重试');
        showError('正在加载中，请稍后重试');
        return;
    }
    
    const currentCountryText = document.getElementById('currentCountryText');
    currentCountryText.textContent = '获取中...';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        currentCountryText.textContent = '无法获取，请刷新页面';
        showError('没有活动标签页，请先打开 Steam 或 SteamDB 页面');
        return;
    }
    
    console.log(`[Popup] 当前标签页: ${tab.url}`);
    
    const supportedDomains = ['store.steampowered.com', 'steamdb.info'];
    const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
    
    if (!isSupported) {
        currentCountryText.textContent = '不支持的页面';
        showError('请在 Steam 商店页面或 SteamDB 页面使用此功能');
        return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
            console.error('[Popup] ping 失败:', chrome.runtime.lastError);
            currentCountryText.textContent = '无法连接，请刷新页面';
            showError('无法连接到页面，请刷新页面后重试');
            return;
        }
        
        getCurrentSteamCountry(true).then(currentCountry => {
            console.log('[Popup] 获取到当前国家/地区:', currentCountry);
            
            // 清空搜索框
            document.getElementById('senderSearch').value = '';
            document.getElementById('recipientSearch').value = '';
            senderFilterTerm = '';
            recipientFilterTerm = '';
            
            // 重新渲染下拉框
            const senderSelect = document.getElementById('senderCountry');
            const recipientSelect = document.getElementById('recipientCountry');
            renderSelect(senderSelect, '');
            renderSelect(recipientSelect, '');
            
            if (currentCountry) {
                const countryName = getCountryNameBySteamCC(currentCountry);
                currentCountryText.textContent = `${countryName} (${currentCountry.toUpperCase()})`;
                
                const countryExists = allCountries.some(c => c.key === currentCountry);
                if (countryExists) {
                    const currentSender = senderSelect.value;
                    
                    if (currentSender === currentCountry) {
                        console.log(`[Popup] 当前赠送方已是 ${countryName}，无需更改`);
                        updateStatusDisplay(true);
                    } else {
                        senderSelect.value = currentCountry;
                        updateStatusDisplay(true);
                        saveCountries();
                        showError(`已将赠送方设置为 ${countryName} (${currentCountry.toUpperCase()})`, true);
                        console.log(`[Popup] 自动设置赠送方为: ${currentCountry}`);
                    }
                } else {
                    currentCountryText.textContent = `${currentCountry.toUpperCase()} (不支持)`;
                    showError(`当前地区 ${currentCountry.toUpperCase()} 不在支持列表中，请手动选择赠送方国家/地区`);
                }
            } else {
                currentCountryText.textContent = '无法获取，请刷新页面';
                showError('无法获取当前国家/地区，请确保在 Steam 商店页面或 SteamDB 页面');
            }
        });
    });
}

function getSearchKeyword(inputElement) {
    return inputElement.value.trim().toLowerCase();
}

function filterCountries(searchTerm) {
    if (!searchTerm) return allCountries;
    const term = searchTerm.toLowerCase();
    return allCountries.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.code.toLowerCase().includes(term)
    );
}

// 渲染下拉框 - 根据搜索词过滤
function renderSelect(selectElement, filterTerm) {
    const filtered = filterCountries(filterTerm);
    const currentValue = selectElement.value;
    
    selectElement.innerHTML = '';
    
    for (const country of filtered) {
        const displayName = `${country.name} (${country.key.toUpperCase()}) - ${country.code}`;
        const option = new Option(displayName, country.key);
        selectElement.add(option);
    }
    
    if (filtered.some(c => c.key === currentValue)) {
        selectElement.value = currentValue;
    } else if (filtered.length > 0) {
        selectElement.value = filtered[0].key;
    }
    
    updateStatusDisplay(true);  // 静默更新
}

// 更新发送方下拉框
function updateSenderSelect() {
    const searchInput = document.getElementById('senderSearch');
    senderFilterTerm = searchInput.value;
    const senderSelect = document.getElementById('senderCountry');
    renderSelect(senderSelect, senderFilterTerm);
}

// 更新接收方下拉框
function updateRecipientSelect() {
    const searchInput = document.getElementById('recipientSearch');
    recipientFilterTerm = searchInput.value;
    const recipientSelect = document.getElementById('recipientCountry');
    renderSelect(recipientSelect, recipientFilterTerm);
}

// 初始化下拉框（显示全部）
function populateCountrySelects() {
    const sortedCountries = [...allCountries].sort((a, b) => a.name.localeCompare(b.name));
    allCountries = sortedCountries;
    
    // 清空搜索框
    document.getElementById('senderSearch').value = '';
    document.getElementById('recipientSearch').value = '';
    senderFilterTerm = '';
    recipientFilterTerm = '';
    
    // 渲染下拉框
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    renderSelect(senderSelect, '');
    renderSelect(recipientSelect, '');
}

// 对调国家
function swapCountries() {
    console.log('=== 对调国家/地区开始 ===');
    
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    const senderSearch = document.getElementById('senderSearch');
    const recipientSearch = document.getElementById('recipientSearch');
    
    // 获取当前选中的值
    const senderValue = senderSelect.value;
    const recipientValue = recipientSelect.value;
    
    console.log(`对调前 - 赠送方: ${senderValue}, 收礼方: ${recipientValue}`);
    
    if (!senderValue || !recipientValue) {
        showError('请先选择赠送方和收礼方国家/地区');
        return;
    }
    
    // 保存当前搜索词
    const senderSearchTerm = senderSearch.value;
    const recipientSearchTerm = recipientSearch.value;
    
    // 交换搜索词
    senderSearch.value = recipientSearchTerm;
    recipientSearch.value = senderSearchTerm;
    senderFilterTerm = recipientSearchTerm;
    recipientFilterTerm = senderSearchTerm;
    
    // 重新渲染下拉框（应用交换后的搜索词）
    renderSelect(senderSelect, senderFilterTerm);
    renderSelect(recipientSelect, recipientFilterTerm);
    
    // 交换选中的值
    senderSelect.value = recipientValue;
    recipientSelect.value = senderValue;
    
    // 验证设置是否成功
    console.log(`对调后 - 赠送方: ${senderSelect.value}, 收礼方: ${recipientSelect.value}`);
    
    // 保存设置
    saveCountries();
    
    // 隐藏检测结果
    hideResultInStatusArea();
    
    // 显示成功提示
    const senderCountry = allCountries.find(c => c.key === senderSelect.value);
    const recipientCountry = allCountries.find(c => c.key === recipientSelect.value);
    // showError(`已对调: ${senderCountry?.name} ↔ ${recipientCountry?.name}`, true);
    
    console.log('=== 对调国家/地区结束 ===');
}

function getCountryConfigBySteamCC(steamCC) {
    const country = allCountries.find(c => c.key === steamCC);
    return {
        currencyCode: country?.code || 'USD',
        name: country?.name || steamCC
    };
}

// ========== 数据加载 ==========

async function loadCountriesFromBackground() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getAllCountries' }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response && response.success) {
                resolve(response.countries);
            } else {
                reject(new Error('获取国家/地区列表失败'));
            }
        });
    });
}

async function loadExchangeRates() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['exchangeRates'], (result) => {
            if (result.exchangeRates) {
                resolve(result.exchangeRates);
            } else {
                reject(new Error('汇率数据不存在'));
            }
        });
    });
}

async function fetchExchangeRatesFromAPI() {
    const response = await fetch('https://api.steaminventoryhelper.com/steam-rates?base=USD');
    const data = await response.json();
    if (data.success) {
        return data.data.rates;
    }
    throw new Error('获取汇率失败');
}

async function loadCountries() {
    // 防止重复加载
    if (isLoading) {
        console.log('[Popup] 正在加载中，跳过');
        return;
    }
    
    isLoading = true;
    
    try {
        const countries = await loadCountriesFromBackground();
        
        let rates;
        try {
            rates = await loadExchangeRates();
        } catch (e) {
            console.log('从 storage 获取汇率失败，尝试从 API 获取');
            rates = await fetchExchangeRatesFromAPI();
        }
        
        exchangeRates = rates;
        
        allCountries = countries.map(c => ({
            key: c.key,
            code: c.code,
            name: c.name,
            symbol: c.symbol
        }));
        
        populateCountrySelects();
        
        // 加载保存的国家
        const savedSender = await new Promise((resolve) => {
            chrome.storage.local.get(['senderCountry'], (result) => {
                resolve(result.senderCountry);
            });
        });
        
        if (savedSender) {
            loadSavedCountries();
        } else {
            // 首次使用，尝试获取当前国家并设置
            const currentCountry = await getCurrentSteamCountry(false);
            if (currentCountry) {
                const countryExists = allCountries.some(c => c.key === currentCountry);
                if (countryExists) {
                    document.getElementById('senderCountry').value = currentCountry;
                    saveCountries();
                    console.log(`首次使用，自动设置赠送方为: ${currentCountry}`);
                }
            }
        }
        
        // 显示当前国家（不自动选择）
        await displayCurrentCountryOnly();
        
        console.log('国家/地区列表加载完成，共', allCountries.length, '个国家/地区');
    } catch (error) {
        console.error('Error loading countries:', error);
        showError('网络错误，无法加载国家/地区列表');
    } finally {
        isLoading = false;
    }
}

// 只显示当前国家，不自动选择
async function displayCurrentCountryOnly() {
    // 如果正在加载，跳过
    if (isLoading) {
        console.log('[Popup] 正在加载中，跳过显示当前国家/地区');
        return;
    }
    
    const currentCountryText = document.getElementById('currentCountryText');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        currentCountryText.textContent = '无法获取';
        return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
            currentCountryText.textContent = '无法连接';
            return;
        }
        
        getCurrentSteamCountry(false).then(currentCountry => {
            if (currentCountry) {
                const countryName = getCountryNameBySteamCC(currentCountry);
                currentCountryText.textContent = `${countryName} (${currentCountry.toUpperCase()})`;
            } else {
                currentCountryText.textContent = '无法获取';
            }
        });
    });
}

// ========== 检测逻辑 ==========

// 在检测按钮点击事件中
document.getElementById('checkBtn').addEventListener('click', async () => {
    console.log('=== 检测按钮被点击 ===');
    
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    console.log(`赠送方: ${senderSteamCC}, 收礼方: ${recipientSteamCC}`);
    
    if (!senderSteamCC || !recipientSteamCC) {
        showError('请选择赠送方国家/地区和收礼方国家/地区');
        return;
    }
    
    const senderConfig = getCountryConfigBySteamCC(senderSteamCC);
    const recipientConfig = getCountryConfigBySteamCC(recipientSteamCC);
    
    const senderRate = exchangeRates[senderConfig.currencyCode];
    const recipientRate = exchangeRates[recipientConfig.currencyCode];
    
    console.log(`赠送方汇率 (${senderConfig.currencyCode}): ${senderRate}`);
    console.log(`收礼方汇率 (${recipientConfig.currencyCode}): ${recipientRate}`);
    
    if (!senderRate || !recipientRate) {
        showError(`无效国家/地区选择: ${senderConfig.currencyCode} 或 ${recipientConfig.currencyCode}`);
        return;
    }
    
    saveCountries();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`当前标签页: ${tab.url}`);
    
    // 支持的域名
    const supportedDomains = ['store.steampowered.com', 'steamdb.info'];
    const isSupportedDomain = supportedDomains.some(domain => tab.url.includes(domain));
    
    if (!isSupportedDomain) {
        showError('请访问 Steam 商店页面 (store.steampowered.com) 或 SteamDB 页面 (steamdb.info)');
        return;
    }
    
    // 检查是否为 bundle（不支持）
    if (tab.url.includes('/bundle/')) {
        showError('捆绑包暂不支持检测');
        return;
    }
    
    showLoading();
    
    // 先 ping 测试 content script 是否存在
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
            console.error('ping 失败:', chrome.runtime.lastError);
            hideLoading();
            showError('无法连接到页面，请刷新页面后重试\n\n提示：请确保当前在支持的页面');
            return;
        }
        
        console.log('ping 成功:', pingResponse);
        
        // 发送检测请求
        let timeoutId = setTimeout(() => {
            hideLoading();
            showError('请求超时，请检查网络连接后重试');
        }, 30000);
        
        chrome.tabs.sendMessage(tab.id, {
            action: 'checkGift',
            senderCode: senderSteamCC,
            recipientCode: recipientSteamCC,
            senderRate: senderRate,
            recipientRate: recipientRate
        }, (response) => {
            clearTimeout(timeoutId);
            hideLoading();
            
            console.log('检测响应:', response);
            
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                showError('无法连接到页面，请刷新页面后重试');
                return;
            }
            
            if (response && !response.error) {
                const canGift = response.canGift;
                showResultInStatusArea(canGift, response, senderSteamCC, recipientSteamCC, senderRate, recipientRate);
            } else {
                showError(response?.error || '无法获取价格数据，请稍后重试');
                hideResultInStatusArea();
            }
        });
    });
});

// ========== 事件监听 ==========

document.getElementById('senderSearch').addEventListener('input', updateSenderSelect);
document.getElementById('recipientSearch').addEventListener('input', updateRecipientSelect);
document.getElementById('swapBtn').addEventListener('click', swapCountries);
document.getElementById('closeErrorBtn').addEventListener('click', hideError);
document.getElementById('refreshCountryBtn').addEventListener('click', () => {
    refreshCurrentCountry();
});

// 监听下拉框变化
document.getElementById('senderCountry').addEventListener('change', () => {
    updateStatusDisplay();
    hideResultInStatusArea();
    saveCountries();
});
document.getElementById('recipientCountry').addEventListener('change', () => {
    updateStatusDisplay();
    hideResultInStatusArea();
    saveCountries();
});

// 页面加载时初始化
loadCountries();

// 页面加载时初始化
async function initPopup() {
    await loadCountries();
    
    // 延迟一下再获取当前国家，确保页面已加载
    setTimeout(() => {
        refreshCurrentCountry();
    }, 500);
}

// 页面加载时初始化
initPopup();