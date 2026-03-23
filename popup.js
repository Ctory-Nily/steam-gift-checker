// 弹窗脚本 - popup.js

// 全局变量
let exchangeRates = {};
let allCountries = [];

// ========== 辅助函数 ==========

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        if (errorContainer.style.display === 'block') {
            errorContainer.style.display = 'none';
        }
    }, 5000);
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.style.display = 'none';
}

// 在状态区域显示检测结果
function showResultInStatusArea(canGift, response, senderSteamCC, recipientSteamCC, senderRate, recipientRate) {
    const resultArea = document.getElementById('resultArea');
    const resultContent = document.getElementById('resultContent');
    
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

// 根据 steamCC 获取国家名称（支持大小写）
function getCountryNameBySteamCC(steamCC) {
    if (!steamCC) return '未知';
    const countryLower = steamCC.toLowerCase();
    const country = allCountries.find(c => c.key === countryLower);
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

// 刷新并显示当前国家，同时更新发送方下拉框
async function refreshCurrentCountry() {
    document.getElementById('currentCountryText').textContent = '获取中...';
    const currentCountry = await getCurrentSteamCountry(true);
    
    if (currentCountry) {
        // 转换为小写进行匹配
        const countryLower = currentCountry.toLowerCase();
        const countryExists = allCountries.some(c => c.key === countryLower);
        
        if (countryExists) {
            const countryInfo = allCountries.find(c => c.key === countryLower);
            const countryName = countryInfo ? countryInfo.name : countryLower.toUpperCase();
            document.getElementById('currentCountryText').textContent = `${countryName} (${countryLower.toUpperCase()})`;
            
            // 自动将发送方下拉框设置为当前国家
            document.getElementById('senderCountry').value = countryLower;
            updateStatusDisplay();
            saveCountries();
            console.log(`自动将发送方设置为当前国家: ${countryLower}`);
            
            // 显示成功提示
            const successMsg = `已将赠送方设置为 ${countryName} (${countryLower.toUpperCase()})`;
            showError(successMsg);
            // 2秒后自动隐藏成功提示（因为是成功提示，可以短一些）
            setTimeout(() => {
                const errorContainer = document.getElementById('errorContainer');
                if (errorContainer.style.display === 'block' && errorContainer.innerText.includes(successMsg)) {
                    errorContainer.style.display = 'none';
                }
            }, 5000);
        } else {
            // 国家不在支持列表中
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

function updateSingleSelect(selectElement, filteredCountries, currentValue) {
    const selectedValue = currentValue !== undefined ? currentValue : selectElement.value;
    
    selectElement.innerHTML = '';
    
    for (const country of filteredCountries) {
        const displayName = `${country.name} (${country.code})`;
        const option = new Option(displayName, country.key);
        selectElement.add(option);
    }
    
    if (filteredCountries.some(c => c.key === selectedValue)) {
        selectElement.value = selectedValue;
    } else if (filteredCountries.length > 0 && !selectedValue) {
        selectElement.value = filteredCountries[0].key;
    }
    updateStatusDisplay();
}

function updateSenderSelect() {
    const searchTerm = getSearchKeyword(document.getElementById('senderSearch'));
    const filtered = filterCountries(searchTerm);
    const senderSelect = document.getElementById('senderCountry');
    const currentValue = senderSelect.value;
    updateSingleSelect(senderSelect, filtered, currentValue);
}

function updateRecipientSelect() {
    const searchTerm = getSearchKeyword(document.getElementById('recipientSearch'));
    const filtered = filterCountries(searchTerm);
    const recipientSelect = document.getElementById('recipientCountry');
    const currentValue = recipientSelect.value;
    updateSingleSelect(recipientSelect, filtered, currentValue);
}

function populateCountrySelects() {
    const sortedCountries = [...allCountries].sort((a, b) => a.name.localeCompare(b.name));
    allCountries = sortedCountries;
    updateSenderSelect();
    updateRecipientSelect();
}

function swapCountries() {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    
    const senderValue = senderSelect.value;
    const recipientValue = recipientSelect.value;
    
    if (senderValue && recipientValue) {
        senderSelect.value = recipientValue;
        recipientSelect.value = senderValue;
        
        document.getElementById('senderSearch').value = '';
        document.getElementById('recipientSearch').value = '';
        
        updateSenderSelect();
        updateRecipientSelect();
        saveCountries();
        hideResultInStatusArea();
    }
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
            key: c.key,           // key 是小写，如 'ua'
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
                // 转换为小写进行匹配
                const countryLower = currentCountry.toLowerCase();
                const countryExists = allCountries.some(c => c.key === countryLower);
                if (countryExists) {
                    document.getElementById('senderCountry').value = countryLower;
                    console.log(`自动选择当前 Steam 国家作为发送方: ${countryLower}`);
                    saveCountries();
                } else {
                    console.log(`当前国家 ${currentCountry} 不在支持列表中`);
                    // 默认选择美国
                    if (allCountries.some(c => c.key === 'us')) {
                        document.getElementById('senderCountry').value = 'us';
                    }
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
    const senderSteamCC = document.getElementById('senderCountry').value;
    const recipientSteamCC = document.getElementById('recipientCountry').value;
    
    if (!senderSteamCC || !recipientSteamCC) {
        showError('请选择发送方国家和接收方国家');
        return;
    }
    
    const senderConfig = getCountryConfigBySteamCC(senderSteamCC);
    const recipientConfig = getCountryConfigBySteamCC(recipientSteamCC);
    
    const senderRate = exchangeRates[senderConfig.currencyCode];
    const recipientRate = exchangeRates[recipientConfig.currencyCode];
    
    if (!senderRate || !recipientRate) {
        showError('无效的国家选择，请重新选择');
        return;
    }
    
    saveCountries();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('store.steampowered.com/')) {
        showError('请先访问 Steam 页面');
        return;
    }
    
    showLoading();
    
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
        
        if (chrome.runtime.lastError) {
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

// 监听下拉框变化更新状态显示
document.getElementById('senderCountry').addEventListener('change', () => {
    updateStatusDisplay();
    hideResultInStatusArea();
});
document.getElementById('recipientCountry').addEventListener('change', () => {
    updateStatusDisplay();
    hideResultInStatusArea();
});

// 页面加载时初始化
loadCountries();