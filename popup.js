// 弹窗脚本 - popup.js

// 全局变量
let exchangeRates = {};
let allCountries = [];
let senderFilterTerm = '';
let recipientFilterTerm = '';
let isLoading = false;
let isInitialized = false;  

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
            <div class="result-detail-row">📊 价格差异: <span style="color: ${Math.abs(priceDiffPercent) > 15 ? '#f87171' : '#4ade80'}">${diffSymbol}${-(Math.floor(priceDiffPercent * 10000) / 10000).toFixed(4)}%</span> ${Math.abs(priceDiffPercent) > 15 ? '(超过15%限制)' : '(符合要求)'}</div>
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

// 保存选择的国家
function saveCountries() {
    const sender = document.getElementById('senderCountry').getAttribute('data-value') || '';
    const recipient = document.getElementById('recipientCountry').getAttribute('data-value') || '';
    
    const toSave = {};
    if (sender && allCountries.some(c => c.key === sender)) {
        toSave.senderCountry = sender;
    }
    if (recipient && allCountries.some(c => c.key === recipient)) {
        toSave.recipientCountry = recipient;
    }
    
    chrome.storage.local.set(toSave);
    console.log('保存国家/地区:', toSave);
}

// 加载保存的国家
function loadSavedCountries() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['senderCountry', 'recipientCountry'], (result) => {
            const senderSelect = document.getElementById('senderCountry');
            const recipientSelect = document.getElementById('recipientCountry');
            
            // 设置发送方
            if (result.senderCountry && allCountries.some(c => c.key === result.senderCountry)) {
                senderSelect.setAttribute('data-value', result.senderCountry);
                senderSelect.value = result.senderCountry;
            } else {
                senderSelect.setAttribute('data-value', '');
                senderSelect.value = '';
            }
            
            // 设置接收方
            if (result.recipientCountry && allCountries.some(c => c.key === result.recipientCountry)) {
                recipientSelect.setAttribute('data-value', result.recipientCountry);
                recipientSelect.value = result.recipientCountry;
            } else {
                recipientSelect.setAttribute('data-value', '');
                recipientSelect.value = '';
            }
            
            // 渲染收起状态
            renderSelect(senderSelect, '', false);
            renderSelect(recipientSelect, '', false);
            updateStatusDisplay();
            resolve();
        });
    });
}

// 更新状态显示区域
function updateStatusDisplay() {
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    const senderCountry = senderSteamCC ? allCountries.find(c => c.key === senderSteamCC) : null;
    const recipientCountry = recipientSteamCC ? allCountries.find(c => c.key === recipientSteamCC) : null;
    
    document.getElementById('senderDisplay').textContent = senderCountry ? `${senderCountry.name} (${senderCountry.key.toUpperCase()}) - ${senderCountry.code}` : '未选择';
    document.getElementById('recipientDisplay').textContent = recipientCountry ? `${recipientCountry.name} (${recipientCountry.key.toUpperCase()}) - ${recipientCountry.code}` : '未选择';
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

// 刷新并显示当前国家
async function refreshCurrentCountry(silent = false) {
    const currentCountryText = document.getElementById('currentCountryText');
    currentCountryText.textContent = '获取中...';
    
    // 清空搜索框
    const senderSearch = document.getElementById('senderSearch');
    const recipientSearch = document.getElementById('recipientSearch');
    if (senderSearch) senderSearch.value = '';
    if (recipientSearch) recipientSearch.value = '';
    senderFilterTerm = '';
    recipientFilterTerm = '';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        currentCountryText.textContent = '无法获取';
        if (!silent) showError('没有活动标签页');
        return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
            currentCountryText.textContent = '无法连接';
            if (!silent) showError('无法连接到页面，请刷新页面后重试');
            return;
        }
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCurrentCountry' }, (response) => {
            if (chrome.runtime.lastError || !response?.success || !response.countryCode) {
                currentCountryText.textContent = '获取失败';
                if (!silent) showError('获取当前国家/地区失败');
                return;
            }
            
            const countryCode = response.countryCode;
            const countryName = getCountryNameBySteamCC(countryCode);
            currentCountryText.textContent = `${countryName} (${countryCode.toUpperCase()})`;
            
            const senderSelect = document.getElementById('senderCountry');
            const currentSender = senderSelect.getAttribute('data-value') || senderSelect.value;
            
            if (allCountries.some(c => c.key === countryCode)) {
                if (currentSender === countryCode) {
                    // 相同地区，静默更新
                    senderSelect.setAttribute('data-value', countryCode);
                    senderSelect.value = countryCode;
                    renderSelect(senderSelect, '', false);
                    updateStatusDisplay();
                } else {
                    // 不同地区，更新并显示提示
                    senderSelect.setAttribute('data-value', countryCode);
                    senderSelect.value = countryCode;
                    renderSelect(senderSelect, '', false);
                    saveCountries();
                    updateStatusDisplay();
                    if (!silent) {
                        showError(`已将赠送方设置为 ${countryName} (${countryCode.toUpperCase()})`, true);
                    }
                }
            } else if (!silent) {
                showError(`当前国家/地区 ${countryCode.toUpperCase()} 不在支持列表中`);
            }
        });
    });
}

function getSearchKeyword(inputElement) {
    return inputElement.value.trim().toLowerCase();
}

// 过滤国家列表
function filterCountries(searchTerm) {
    if (!searchTerm) return allCountries;
    const term = searchTerm.toLowerCase();
    return allCountries.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.code.toLowerCase().includes(term)
    );
}

// 渲染下拉框
function renderSelect(selectElement, filterTerm, isExpanded) {
    const currentValue = selectElement.getAttribute('data-value') || selectElement.value;
    let filtered = filterCountries(filterTerm);
    
    selectElement.innerHTML = '';
    
    if (isExpanded) {
        // 展开状态
        // 判断是否有搜索结果
        const hasResults = filtered.length > 0;
        
        if (!hasResults) {
            // 搜索不到内容时，显示"请选择国家/地区"选项
            const noResultOption = new Option('请选择国家/地区', '');
            selectElement.add(noResultOption);
        } else {
            // 有搜索结果
            if (!filterTerm) {
                // 无搜索词：显示"请选择国家/地区"
                const placeholderOption = new Option('请选择国家/地区', '');
                selectElement.add(placeholderOption);
            }
            
            // 添加所有国家选项
            for (const country of filtered) {
                const option = new Option(`${country.name} (${country.key.toUpperCase()}) - ${country.code}`, country.key);
                selectElement.add(option);
            }
        }
        
        // 设置选中的值
        if (currentValue && filtered.some(c => c.key === currentValue)) {
            // 有当前值且在列表中，保持选中
            selectElement.value = currentValue;
        } else if (filterTerm && filtered.length > 0) {
            // 有搜索词且有结果，自动选中第一个
            selectElement.value = filtered[0].key;
            selectElement.setAttribute('data-value', filtered[0].key);
        } else {
            selectElement.value = '';
        }
    } else {
        // 收起状态：只显示当前选中的国家或占位符
        if (currentValue && allCountries.some(c => c.key === currentValue)) {
            const selectedCountry = allCountries.find(c => c.key === currentValue);
            const displayText = `${selectedCountry.name} (${selectedCountry.key.toUpperCase()}) - ${selectedCountry.code}`;
            const option = new Option(displayText, currentValue);
            selectElement.add(option);
            selectElement.value = currentValue;
        } else {
            const option = new Option('请选择国家/地区', '');
            selectElement.add(option);
            selectElement.value = '';
        }
    }
    
    selectElement.setAttribute('data-value', selectElement.value);
    updateStatusDisplay();
}

// 更新发送方下拉框 - 搜索时实时更新
function updateSenderSelect() {
    const searchInput = document.getElementById('senderSearch');
    const searchTerm = searchInput.value;
    senderFilterTerm = searchTerm;
    
    const senderSelect = document.getElementById('senderCountry');
    const isExpanded = senderSelect.classList.contains('expanded');
    
    if (isExpanded) {
        // 展开状态：重新渲染过滤后的选项
        renderSelect(senderSelect, senderFilterTerm, true);
    }
}

// 更新接收方下拉框
function updateRecipientSelect() {
    const searchInput = document.getElementById('recipientSearch');
    const searchTerm = searchInput.value;
    recipientFilterTerm = searchTerm;
    
    const recipientSelect = document.getElementById('recipientCountry');
    const isExpanded = recipientSelect.classList.contains('expanded');
    
    if (isExpanded) {
        renderSelect(recipientSelect, recipientFilterTerm, true);
    }
}

// 填充下拉框（初始化时调用）
function populateCountrySelects() {
    const sortedCountries = [...allCountries].sort((a, b) => a.name.localeCompare(b.name));
    allCountries = sortedCountries;
    
    // 清空搜索框
    document.getElementById('senderSearch').value = '';
    document.getElementById('recipientSearch').value = '';
    senderFilterTerm = '';
    recipientFilterTerm = '';
    
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    
    senderSelect.classList.remove('expanded');
    recipientSelect.classList.remove('expanded');
    
    // 加载保存的值
    chrome.storage.local.get(['senderCountry', 'recipientCountry'], (saved) => {
        // 设置发送方
        if (saved.senderCountry && allCountries.some(c => c.key === saved.senderCountry)) {
            senderSelect.value = saved.senderCountry;
        } else {
            senderSelect.value = '';
        }
        
        // 设置接收方
        if (saved.recipientCountry && allCountries.some(c => c.key === saved.recipientCountry)) {
            recipientSelect.value = saved.recipientCountry;
        } else {
            recipientSelect.value = '';
        }
        
        // 更新显示
        updateSelectDisplay(senderSelect);
        updateSelectDisplay(recipientSelect);
    });
}

// 设置发送方国家（用于自动定位和刷新）
function setSenderCountry(steamCC) {
    const senderSelect = document.getElementById('senderCountry');
    const countryExists = allCountries.some(c => c.key === steamCC);
    
    if (countryExists) {
        senderSelect.value = steamCC;
        // 重新渲染为收起状态
        renderSelect(senderSelect, '', false);
        saveCountries();
        updateStatusDisplay(true);
        return true;
    }
    return false;
}

// 初始化下拉框行为
function initSelectBehavior() {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    const senderSearch = document.getElementById('senderSearch');
    const recipientSearch = document.getElementById('recipientSearch');
    
    // 点击下拉框时展开/收起 - 使用 click 事件
    senderSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (senderSelect.classList.contains('expanded')) {
            senderSelect.classList.remove('expanded');
            renderSelect(senderSelect, '', false);
        } else {
            closeAllSelects();
            senderSelect.classList.add('expanded');
            renderSelect(senderSelect, senderFilterTerm, true);
        }
    });
    
    recipientSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (recipientSelect.classList.contains('expanded')) {
            recipientSelect.classList.remove('expanded');
            renderSelect(recipientSelect, '', false);
        } else {
            closeAllSelects();
            recipientSelect.classList.add('expanded');
            renderSelect(recipientSelect, recipientFilterTerm, true);
        }
    });
    
    // 点击搜索框时展开
    senderSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllSelects();
        senderSelect.classList.add('expanded');
        renderSelect(senderSelect, senderFilterTerm, true);
    });
    
    recipientSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllSelects();
        recipientSelect.classList.add('expanded');
        renderSelect(recipientSelect, recipientFilterTerm, true);
    });
    
    // 搜索框输入时实时过滤
    senderSearch.addEventListener('input', () => {
        senderFilterTerm = senderSearch.value;
        if (senderSelect.classList.contains('expanded')) {
            renderSelect(senderSelect, senderFilterTerm, true);
        }
    });
    
    recipientSearch.addEventListener('input', () => {
        recipientFilterTerm = recipientSearch.value;
        if (recipientSelect.classList.contains('expanded')) {
            renderSelect(recipientSelect, recipientFilterTerm, true);
        }
    });
    
    // 选择选项后保存并关闭
    senderSelect.addEventListener('change', () => {
        const selectedValue = senderSelect.value;
        if (selectedValue && selectedValue !== '') {
            senderSelect.setAttribute('data-value', selectedValue);
            saveCountries();
        }
        senderSelect.classList.remove('expanded');
        renderSelect(senderSelect, '', false);
    });
    
    recipientSelect.addEventListener('change', () => {
        const selectedValue = recipientSelect.value;
        if (selectedValue && selectedValue !== '') {
            recipientSelect.setAttribute('data-value', selectedValue);
            saveCountries();
        }
        recipientSelect.classList.remove('expanded');
        renderSelect(recipientSelect, '', false);
    });
    
    // 点击其他地方关闭
    document.addEventListener('click', (e) => {
        if (!senderSelect.contains(e.target) && !senderSearch.contains(e.target) &&
            !recipientSelect.contains(e.target) && !recipientSearch.contains(e.target)) {
            if (senderSelect.classList.contains('expanded') || recipientSelect.classList.contains('expanded')) {
                closeAllSelects();
                renderSelect(senderSelect, '', false);
                renderSelect(recipientSelect, '', false);
            }
        }
    });
}

// 关闭所有下拉框
function closeAllSelects() {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    
    if (senderSelect) {
        senderSelect.classList.remove('expanded');
        // 关闭时更新显示
        updateSelectDisplay(senderSelect);
    }
    if (recipientSelect) {
        recipientSelect.classList.remove('expanded');
        updateSelectDisplay(recipientSelect);
    }
}

// 对调国家
function swapCountries() {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    const senderSearch = document.getElementById('senderSearch');
    const recipientSearch = document.getElementById('recipientSearch');
    
    const senderValue = senderSelect.getAttribute('data-value') || senderSelect.value;
    const recipientValue = recipientSelect.getAttribute('data-value') || recipientSelect.value;
    
    console.log('对调前 - 赠送方:', senderValue, '收礼方:', recipientValue);
    
    if (!senderValue || !recipientValue || senderValue === '' || recipientValue === '') {
        showError('请先选择赠送方和收礼方国家/地区');
        return;
    }
    
    // 保存搜索框内容
    const senderSearchTerm = senderSearch.value;
    const recipientSearchTerm = recipientSearch.value;
    
    // 交换值
    senderSelect.setAttribute('data-value', recipientValue);
    recipientSelect.setAttribute('data-value', senderValue);
    
    // 更新 select 元素的值
    senderSelect.value = recipientValue;
    recipientSelect.value = senderValue;
    
    // 交换搜索框
    senderSearch.value = recipientSearchTerm;
    recipientSearch.value = senderSearchTerm;
    senderFilterTerm = recipientSearchTerm;
    recipientFilterTerm = senderSearchTerm;
    
    // 关闭展开
    senderSelect.classList.remove('expanded');
    recipientSelect.classList.remove('expanded');
    
    // 重新渲染收起状态
    renderSelect(senderSelect, '', false);
    renderSelect(recipientSelect, '', false);
    
    // 保存
    saveCountries();
    hideResultInStatusArea();
    
    const newSender = allCountries.find(c => c.key === recipientValue);
    const newRecipient = allCountries.find(c => c.key === senderValue);
    
    if (newSender && newRecipient) {
        showError(`已对调: ${newSender.name} ↔ ${newRecipient.name}`, true);
    }
}

// 更新下拉框显示（不重新创建选项）
function updateSelectDisplay(selectElement) {
    const currentValue = selectElement.value;
    
    if (currentValue && allCountries.some(c => c.key === currentValue)) {
        const selectedCountry = allCountries.find(c => c.key === currentValue);
        const displayText = `${selectedCountry.name} (${selectedCountry.key.toUpperCase()}) - ${selectedCountry.code}`;
        
        // 更新现有选项的文本
        if (selectElement.options.length > 0) {
            selectElement.options[0].text = displayText;
            selectElement.options[0].value = currentValue;
        } else {
            // 如果没有选项，创建新选项
            const option = new Option(displayText, currentValue);
            selectElement.add(option);
        }
    } else {
        // 没有选中值，显示占位符
        if (selectElement.options.length > 0) {
            selectElement.options[0].text = '请选择国家/地区';
            selectElement.options[0].value = '';
        } else {
            const option = new Option('请选择国家/地区', '');
            selectElement.add(option);
        }
        selectElement.value = '';
    }
}

function getCountryConfigBySteamCC(steamCC) {
    const country = allCountries.find(c => c.key === steamCC);
    return {
        currencyCode: country?.code || 'USD',
        name: country?.name || steamCC
    };
}

// 动态计算高度
function initStickyPositions() {
    const checkBtn = document.querySelector('.check-button');
    const statusArea = document.querySelector('.status-area');
    const errorContainer = document.querySelector('.error-container');
    
    if (!checkBtn) return;
    
    // 获取按钮高度和 margin
    const btnHeight = checkBtn.offsetHeight;
    const btnMarginBottom = parseInt(getComputedStyle(checkBtn).marginBottom) || 0;
    const btnTotal = btnHeight + btnMarginBottom;
    
    // 设置状态区域 top（如果有的话，但状态区域不悬浮，所以不需要设置）
    if (statusArea) {
        // 状态区域不设置 sticky，保持自然滚动
        statusArea.style.position = '';
        statusArea.style.top = '';
    }
    
    // 错误容器不设置 sticky
    if (errorContainer) {
        errorContainer.style.position = '';
        errorContainer.style.top = '';
    }
    
    console.log('Sticky 位置初始化完成，按钮高度:', btnTotal);
}

// 页面加载和窗口大小变化时重新计算
window.addEventListener('load', initStickyPositions);
window.addEventListener('resize', initStickyPositions);

// 在页面加载完成后调用
window.addEventListener('load', initStickyPositions);
// 如果内容变化，重新计算
window.addEventListener('resize', initStickyPositions);

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

// 加载国家列表
async function loadCountries() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const countries = await loadCountriesFromBackground();
        
        let rates;
        try {
            rates = await loadExchangeRates();
        } catch (e) {
            rates = await fetchExchangeRatesFromAPI();
        }
        
        exchangeRates = rates;
        
        allCountries = countries.map(c => ({
            key: c.key,
            code: c.code,
            name: c.name,
            symbol: c.symbol
        }));
        
        allCountries.sort((a, b) => a.name.localeCompare(b.name));
        
        // 初始化下拉框
        const senderSelect = document.getElementById('senderCountry');
        const recipientSelect = document.getElementById('recipientCountry');
        
        senderSelect.classList.remove('expanded');
        recipientSelect.classList.remove('expanded');
        
        // 加载保存的值
        await loadSavedCountries();
        
        // 初始化行为（只初始化一次）
        if (!isInitialized) {
            initSelectBehavior();
            isInitialized = true;
        }
        
        // 显示当前地区时使用静默模式
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'getCurrentCountry' }, (response) => {
                const countryText = document.getElementById('currentCountryText');
                if (response?.success && response.countryCode) {
                    const countryName = getCountryNameBySteamCC(response.countryCode);
                    countryText.textContent = `${countryName} (${response.countryCode.toUpperCase()})`;
                    
                    // 静默同步到发送方（相同地区不提示）
                    const senderSelect = document.getElementById('senderCountry');
                    const currentSender = senderSelect.getAttribute('data-value') || senderSelect.value;
                    
                    if (allCountries.some(c => c.key === response.countryCode) && currentSender !== response.countryCode) {
                        senderSelect.setAttribute('data-value', response.countryCode);
                        senderSelect.value = response.countryCode;
                        renderSelect(senderSelect, '', false);
                        saveCountries();
                        updateStatusDisplay();
                        // 静默模式，不显示提示
                    }
                } else {
                    countryText.textContent = '无法获取';
                }
            });
        }
        
        console.log('国家/地区列表加载完成，赠送方:', senderSelect.value, '收礼方:', recipientSelect.value);
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
        showError('请选择赠送方国家/地区 和 收礼方国家/地区');
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

// 搜索框输入事件
document.getElementById('senderSearch').addEventListener('input', (e) => {
    senderFilterTerm = e.target.value;
    const senderSelect = document.getElementById('senderCountry');
    if (senderSelect.classList.contains('expanded')) {
        renderSelect(senderSelect, senderFilterTerm, true);
    }
});

document.getElementById('recipientSearch').addEventListener('input', (e) => {
    recipientFilterTerm = e.target.value;
    const recipientSelect = document.getElementById('recipientCountry');
    if (recipientSelect.classList.contains('expanded')) {
        renderSelect(recipientSelect, recipientFilterTerm, true);
    }
});

// 点击搜索框时展开
document.getElementById('senderSearch').addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllSelects();
    const senderSelect = document.getElementById('senderCountry');
    senderSelect.classList.add('expanded');
    renderSelect(senderSelect, senderFilterTerm, true);
});

document.getElementById('recipientSearch').addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllSelects();
    const recipientSelect = document.getElementById('recipientCountry');
    recipientSelect.classList.add('expanded');
    renderSelect(recipientSelect, recipientFilterTerm, true);
});

document.getElementById('swapBtn').addEventListener('click', swapCountries);
document.getElementById('closeErrorBtn').addEventListener('click', hideError);
// 刷新按钮点击事件 - 非静默模式
document.getElementById('refreshCountryBtn').addEventListener('click', () => {
    refreshCurrentCountry(false);  // false = 显示提示
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