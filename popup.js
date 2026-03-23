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
}

function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.style.display = 'none';
}

function showResult(html) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = html;
    hideError();
}

function showLoading() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> 检测中...';
    hideError();
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
    });
}

function getSearchKeyword(inputElement) {
    return inputElement.value.trim().toLowerCase();
}

function filterCountries(searchTerm) {
    if (!searchTerm) return allCountries;
    return allCountries.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        c.code.toLowerCase().includes(searchTerm)
    );
}

function updateSingleSelect(selectElement, filteredCountries, currentValue) {
    const selectedValue = currentValue !== undefined ? currentValue : selectElement.value;
    
    selectElement.innerHTML = '';
    
    for (const country of filteredCountries) {
        let displayName = country.name;
        if (country.regionGroup) {
            displayName = `${country.name} [${country.regionGroup}]`;
        }
        const option = new Option(displayName, country.key);
        selectElement.add(option);
    }
    
    if (filteredCountries.some(c => c.key === selectedValue)) {
        selectElement.value = selectedValue;
    } else if (filteredCountries.length > 0 && !selectedValue) {
        selectElement.value = filteredCountries[0].key;
    }
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
            key: c.key,
            code: c.code,
            name: c.name,
            symbol: c.symbol,
            regionGroup: c.regionGroup
        }));
        
        populateCountrySelects();
        loadSavedCountries();
        
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
            const priceDiffPercent = response.priceDiffPercent;
            const diffColor = Math.abs(priceDiffPercent) > 15 ? '#f87171' : '#4ade80';
            const diffSymbol = priceDiffPercent > 0 ? '+' : '';
            
            const resultHtml = `
                <div class="status ${canGift ? 'success' : 'error'}">
                    ${canGift ? '✅ 可以赠送！' : '❌ 不可以赠送'}
                </div>
                
                ${response.failReason ? `
                    <div style="margin-top: 8px; padding: 8px; background: rgba(248,113,113,0.2); border-radius: 6px; font-size: 12px;">
                        ⚠️ ${response.failReason}
                    </div>
                ` : ''}
                
                <div style="margin-top: 12px;">
                    <div style="font-size: 10px; color: #888; margin-bottom: 6px;">
                        数据来源: ${response.source || 'Steam 官方接口'}
                    </div>
                    
                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                        <div style="font-weight: bold; margin-bottom: 6px;">🔍 Steam API 查询结果</div>
                        <div style="font-size: 11px; font-family: monospace;">
                            <div>📍 发送方 (${senderSteamCC}):</div>
                            <div style="margin-left: 12px;">
                                价格: ${response.rawSenderPrice} ${response.senderCurrency || senderSteamCC}
                            </div>
                            <div style="margin-top: 6px;">📍 接收方 (${recipientSteamCC}):</div>
                            <div style="margin-left: 12px;">
                                价格: ${response.rawRecipientPrice} ${response.recipientCurrency || recipientSteamCC}
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                        <div style="font-weight: bold; margin-bottom: 6px;">🌍 区域价格差异检查 (≤15% 限制)</div>
                        <div style="font-size: 11px; font-family: monospace;">
                            接收方价格换算成发送方货币:<br>
                            ${response.rawRecipientPrice} ${recipientSteamCC} × ${senderRate.toFixed(4)} / ${recipientRate.toFixed(4)} <br>
                            = ${response.convertedRecipientToSender.toFixed(2)} ${senderSteamCC}
                        </div>
                        <div style="font-size: 12px; margin-top: 4px;">
                            发送方实际价格: ${response.senderPrice} ${senderSteamCC}<br>
                            价格差异: <span style="color: ${diffColor}; font-weight: bold;">${diffSymbol}${priceDiffPercent.toFixed(2)}%</span>
                        </div>
                        <div style="font-size: 12px; margin-top: 4px; color: ${response.isPriceDiffAcceptable ? '#4ade80' : '#f87171'}">
                            ${response.isPriceDiffAcceptable ? '✅ 通过 (差异 ≤15%)' : `❌ 不通过 (差异 ${Math.abs(priceDiffPercent).toFixed(2)}% > 15%)`}
                        </div>
                    </div>
                </div>
            `;
            showResult(resultHtml);
        } else {
            showError(response?.error || '无法获取价格数据，请稍后重试');
        }
    });
});

// ========== 事件监听 ==========

document.getElementById('senderSearch').addEventListener('input', updateSenderSelect);
document.getElementById('recipientSearch').addEventListener('input', updateRecipientSelect);
document.getElementById('swapBtn').addEventListener('click', swapCountries);
document.getElementById('closeErrorBtn').addEventListener('click', hideError);

// 页面加载时初始化
loadCountries();