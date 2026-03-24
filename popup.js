// 弹窗脚本 - popup.js

// 全局变量
let exchangeRates = {};
let allCountries = [];
let senderFilterTerm = '';
let recipientFilterTerm = '';

// ========== 辅助函数 ==========

function showError(message, isSuccess = false) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    if (isSuccess) {
        errorContainer.style.background = 'rgba(74, 222, 128, 0.95)';
        errorContainer.style.borderLeftColor = '#4ade80';
    } else {
        errorContainer.style.background = 'rgba(220, 53, 69, 0.95)';
        errorContainer.style.borderLeftColor = '#ff6b6b';
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
    }, 3000);
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.style.display = 'none';
}

// 在状态区域显示检测结果
function showResultInStatusArea(canGift, response, senderSteamCC, recipientSteamCC, senderRate, recipientRate) {
    const resultArea = document.getElementById('resultArea');
    const resultContent = document.getElementById('resultContent');
    
    // 如果是免费游戏
    if (response.isFreeGame) {
        const freeMessage = response.freeMessage;
        const isFreeTrial = response.isFreeTrial;
        
        resultContent.innerHTML = `
            <div class="result-status error">❌ 不可以赠送！<br>${freeMessage}</div>
        `;
        resultArea.style.display = 'block';
        return;
    }
    
    // 正常显示逻辑...
    const statusClass = canGift ? 'success' : 'error';
    const statusText = canGift ? '✅ 可以赠送！' : '❌ 不可以赠送';
    const priceDiffPercent = response.priceDiffPercent;
    const diffSymbol = priceDiffPercent > 0 ? '+' : '';
    
    resultContent.innerHTML = `
        <div class="result-status ${statusClass}">${statusText}</div>
        ${response.failReason ? `<div style="font-size: 11px; color: #f87171; margin-bottom: 8px;">⚠️ ${response.failReason}</div>` : ''}
        <div class="result-detail">
            <div class="result-detail-row">📊 价格差异: <span style="color: ${Math.abs(priceDiffPercent) > 15 ? '#f87171' : '#4ade80'}">${diffSymbol}${priceDiffPercent.toFixed(2)}%</span> ${Math.abs(priceDiffPercent) > 15 ? '(超过15%限制)' : '(符合要求)'}</div>
            <div class="result-detail-row">💰 发送方价格: ${response.rawSenderPrice} ${senderSteamCC}</div>
            <div class="result-detail-row">💰 接收方价格: ${response.rawRecipientPrice} ${recipientSteamCC}</div>
            <div class="result-detail-row">🔄 换算后: ${response.rawRecipientPrice} × ${senderRate.toFixed(4)} / ${recipientRate.toFixed(4)} = ${response.convertedRecipientToSender.toFixed(2)} ${senderSteamCC}</div>
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
    btn.innerHTML = '<span>🔍</span> 检测当前页面';
}

function saveCountries() {
    const sender = document.getElementById('senderCountry').value;
    const recipient = document.getElementById('recipientCountry').value;
    if (sender && recipient) {
        chrome.storage.local.set({ 
            senderCountry: sender, 
            recipientCountry: recipient
        });
        updateStatusDisplay();
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
function updateStatusDisplay() {
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    const senderCountry = allCountries.find(c => c.key === senderSteamCC);
    const recipientCountry = allCountries.find(c => c.key === recipientSteamCC);
    
    if (senderCountry) {
        document.getElementById('senderDisplay').textContent = `${senderCountry.name} (${senderCountry.code})`;
    } else {
        document.getElementById('senderDisplay').textContent = '未选择';
    }
    
    if (recipientCountry) {
        document.getElementById('recipientDisplay').textContent = `${recipientCountry.name} (${recipientCountry.code})`;
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
                resolve(null);
                return;
            }
            
            const action = refresh ? 'refreshCountry' : 'getCurrentCountry';
            
            chrome.tabs.sendMessage(tabs[0].id, { action: action }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('无法获取当前国家');
                    resolve(null);
                    return;
                }
                
                if (response && response.success && response.countryCode) {
                    resolve(response.countryCode);
                } else {
                    resolve(null);
                }
            });
        });
    });
}

// 刷新并显示当前国家，同时清空搜索框
async function refreshCurrentCountry() {
    document.getElementById('currentCountryText').textContent = '获取中...';
    const currentCountry = await getCurrentSteamCountry(true);
    
    // 清空搜索框
    document.getElementById('senderSearch').value = '';
    document.getElementById('recipientSearch').value = '';
    senderFilterTerm = '';
    recipientFilterTerm = '';
    
    // 重新渲染下拉框（显示全部）
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    renderSelect(senderSelect, '');
    renderSelect(recipientSelect, '');
    
    if (currentCountry) {
        const countryName = getCountryNameBySteamCC(currentCountry);
        document.getElementById('currentCountryText').textContent = `${countryName} (${currentCountry.toUpperCase()})`;
        
        const countryExists = allCountries.some(c => c.key === currentCountry);
        if (countryExists) {
            document.getElementById('senderCountry').value = currentCountry;
            updateStatusDisplay();
            saveCountries();
            showError(`已将发送方设置为 ${countryName} (${currentCountry.toUpperCase()})`, true);
        } else {
            document.getElementById('currentCountryText').textContent = `${currentCountry.toUpperCase()} (不支持)`;
            showError(`当前地区 ${currentCountry.toUpperCase()} 不在支持列表中，请手动选择发送方国家`);
        }
    } else {
        document.getElementById('currentCountryText').textContent = '无法获取，请刷新页面';
        showError('无法获取当前地区，请确保在 Steam 商店页面');
    }
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
        const displayName = `${country.name} (${country.code})`;
        const option = new Option(displayName, country.key);
        selectElement.add(option);
    }
    
    // 如果当前选中的值在过滤后的列表中，保持选中
    if (filtered.some(c => c.key === currentValue)) {
        selectElement.value = currentValue;
    } else if (filtered.length > 0) {
        // 否则选中第一个
        selectElement.value = filtered[0].key;
    }
    
    updateStatusDisplay();
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

// 对调国家 - 修复版
function swapCountries() {
    console.log('=== 对调国家开始 ===');
    
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    const senderSearch = document.getElementById('senderSearch');
    const recipientSearch = document.getElementById('recipientSearch');
    
    // 获取当前选中的值
    const senderValue = senderSelect.value;
    const recipientValue = recipientSelect.value;
    
    console.log(`对调前 - 发送方: ${senderValue}, 接收方: ${recipientValue}`);
    
    if (!senderValue || !recipientValue) {
        showError('请先选择发送方和接收方国家');
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
    console.log(`对调后 - 发送方: ${senderSelect.value}, 接收方: ${recipientSelect.value}`);
    
    // 保存设置
    saveCountries();
    
    // 隐藏检测结果
    hideResultInStatusArea();
    
    // 显示成功提示
    const senderCountry = allCountries.find(c => c.key === senderSelect.value);
    const recipientCountry = allCountries.find(c => c.key === recipientSelect.value);
    // showError(`已对调: ${senderCountry?.name} ↔ ${recipientCountry?.name}`, true);
    
    console.log('=== 对调国家结束 ===');
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
                reject(new Error('获取国家列表失败'));
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
        
        // 先尝试加载保存的国家
        const savedSender = await new Promise((resolve) => {
            chrome.storage.local.get(['senderCountry'], (result) => {
                resolve(result.senderCountry);
            });
        });
        
        if (!savedSender) {
            const currentCountry = await getCurrentSteamCountry(false);
            if (currentCountry) {
                const countryExists = allCountries.some(c => c.key === currentCountry);
                if (countryExists) {
                    document.getElementById('senderCountry').value = currentCountry;
                    console.log(`自动选择当前 Steam 国家作为发送方: ${currentCountry}`);
                    saveCountries();
                }
            }
        } else {
            loadSavedCountries();
        }
        
        // 显示当前国家
        await refreshCurrentCountry();
        
        console.log('国家列表加载完成，共', allCountries.length, '个国家');
    } catch (error) {
        console.error('Error loading countries:', error);
        showError('网络错误，无法加载国家列表');
    }
}

// ========== 检测逻辑 ==========

document.getElementById('checkBtn').addEventListener('click', async () => {
    console.log('=== 检测按钮被点击 ===');
    
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    console.log(`发送方: ${senderSteamCC}, 接收方: ${recipientSteamCC}`);
    
    if (!senderSteamCC || !recipientSteamCC) {
        showError('请选择发送方国家和接收方国家');
        return;
    }
    
    const senderConfig = getCountryConfigBySteamCC(senderSteamCC);
    const recipientConfig = getCountryConfigBySteamCC(recipientSteamCC);
    
    const senderRate = exchangeRates[senderConfig.currencyCode];
    const recipientRate = exchangeRates[recipientConfig.currencyCode];
    
    console.log(`发送方汇率 (${senderConfig.currencyCode}): ${senderRate}`);
    console.log(`接收方汇率 (${recipientConfig.currencyCode}): ${recipientRate}`);
    
    if (!senderRate || !recipientRate) {
        showError(`无效的国家选择: ${senderConfig.currencyCode} 或 ${recipientConfig.currencyCode}`);
        return;
    }
    
    saveCountries();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`当前标签页: ${tab.url}`);
    
    if (!tab.url.includes('store.steampowered.com/')) {
        showError('请先访问 Steam 页面');
        return;
    }
    
    if (tab.url.includes('/bundle/') || tab.url.includes('/sub/')) {
        showError('捆绑包和组合包暂不支持检测，请进入游戏单品页面');
        return;
    }
    
    showLoading();
    
    let timeoutId = setTimeout(() => {
        hideLoading();
        showError('请求超时，请检查网络连接后重试');
    }, 30000);
    
    console.log('发送消息到 content script...');
    
    chrome.tabs.sendMessage(tab.id, {
        action: 'checkGift',
        senderCode: senderSteamCC,
        recipientCode: recipientSteamCC,
        senderRate: senderRate,
        recipientRate: recipientRate
    }, (response) => {
        clearTimeout(timeoutId);
        hideLoading();
        
        console.log('收到响应:', response);
        
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