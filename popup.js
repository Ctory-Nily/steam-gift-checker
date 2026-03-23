// 全局变量
let exchangeRates = {};
let allCountries = [];

// 货币代码到中文国家名称的映射
function getCountryName(currencyCode) {
    const countryMap = {
        'USD': '美国 (USD)', 'RUB': '俄罗斯 (RUB)', 'UAH': '乌克兰 (UAH)',
        'EUR': '欧元区 (EUR)', 'GBP': '英国 (GBP)', 'JPY': '日本 (JPY)',
        'CNY': '中国 (CNY)', 'KRW': '韩国 (KRW)', 'BRL': '巴西 (BRL)',
        'INR': '印度 (INR)', 'CAD': '加拿大 (CAD)', 'AUD': '澳大利亚 (AUD)',
        'CHF': '瑞士 (CHF)', 'PLN': '波兰 (PLN)', 'NOK': '挪威 (NOK)',
        'IDR': '印度尼西亚 (IDR)', 'MYR': '马来西亚 (MYR)', 'PHP': '菲律宾 (PHP)',
        'SGD': '新加坡 (SGD)', 'THB': '泰国 (THB)', 'VND': '越南 (VND)',
        'TRY': '土耳其 (TRY)', 'MXN': '墨西哥 (MXN)', 'NZD': '新西兰 (NZD)',
        'CLP': '智利 (CLP)', 'PEN': '秘鲁 (PEN)', 'COP': '哥伦比亚 (COP)',
        'ZAR': '南非 (ZAR)', 'HKD': '香港 (HKD)', 'TWD': '台湾 (TWD)',
        'SAR': '沙特 (SAR)', 'AED': '阿联酋 (AED)', 'ARS': '阿根廷 (ARS)',
        'ILS': '以色列 (ILS)', 'KZT': '哈萨克斯坦 (KZT)', 'KWD': '科威特 (KWD)',
        'QAR': '卡塔尔 (QAR)', 'CRC': '哥斯达黎加 (CRC)', 'UYU': '乌拉圭 (UYU)'
    };
    return countryMap[currencyCode] || currencyCode;
}

// 获取搜索关键词
function getSearchKeyword(inputElement) {
    return inputElement.value.trim().toLowerCase();
}

// 过滤国家列表
function filterCountries(searchTerm) {
    if (!searchTerm) return allCountries;
    return allCountries.filter(c => 
        c.name.toLowerCase().includes(searchTerm) || 
        c.code.toLowerCase().includes(searchTerm)
    );
}

// 更新单个下拉框的选项（保留当前选中值）
function updateSingleSelect(selectElement, filteredCountries, currentValue) {
    // 保存当前选中值
    const selectedValue = currentValue !== undefined ? currentValue : selectElement.value;
    
    // 清空并重新填充选项
    selectElement.innerHTML = '';
    
    for (const country of filteredCountries) {
        const option = new Option(country.name, country.code);
        selectElement.add(option);
    }
    
    // 如果之前选中的值在过滤后的列表中，恢复选中
    if (filteredCountries.some(c => c.code === selectedValue)) {
        selectElement.value = selectedValue;
    } else if (filteredCountries.length > 0 && !selectedValue) {
        // 如果没有选中值且列表非空，默认选中第一个
        selectElement.value = filteredCountries[0].code;
    }
}

// 更新发送方下拉框
function updateSenderSelect() {
    const searchTerm = getSearchKeyword(document.getElementById('senderSearch'));
    const filtered = filterCountries(searchTerm);
    const senderSelect = document.getElementById('senderCountry');
    const currentValue = senderSelect.value;
    updateSingleSelect(senderSelect, filtered, currentValue);
}

// 更新接收方下拉框
function updateRecipientSelect() {
    const searchTerm = getSearchKeyword(document.getElementById('recipientSearch'));
    const filtered = filterCountries(searchTerm);
    const recipientSelect = document.getElementById('recipientCountry');
    const currentValue = recipientSelect.value;
    updateSingleSelect(recipientSelect, filtered, currentValue);
}

// 同时更新两个下拉框
function updateBothSelects() {
    updateSenderSelect();
    updateRecipientSelect();
}

// 填充下拉菜单
function populateCountrySelects(rates) {
    const currencies = Object.keys(rates).sort();
    allCountries = currencies.map(code => ({
        code: code,
        name: getCountryName(code)
    }));
    
    // 初始化下拉框
    updateBothSelects();
}

// 对调国家
function swapCountries() {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    
    const senderValue = senderSelect.value;
    const recipientValue = recipientSelect.value;
    
    if (senderValue && recipientValue) {
        // 交换选中的值
        senderSelect.value = recipientValue;
        recipientSelect.value = senderValue;
        
        // 清空搜索框
        document.getElementById('senderSearch').value = '';
        document.getElementById('recipientSearch').value = '';
        
        // 重新刷新下拉框（恢复全部选项）
        updateBothSelects();
        
        saveCountries();
    }
}

// 显示错误信息
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 隐藏错误提示
function hideError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.style.display = 'none';
}

// 显示结果信息
function showResult(html) {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = html;
    hideError();
}

// 保存选择的国家
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

// 加载保存的国家
function loadSavedCountries() {
    chrome.storage.local.get(['senderCountry', 'recipientCountry'], (result) => {
        if (result.senderCountry && exchangeRates[result.senderCountry]) {
            document.getElementById('senderCountry').value = result.senderCountry;
        }
        if (result.recipientCountry && exchangeRates[result.recipientCountry]) {
            document.getElementById('recipientCountry').value = result.recipientCountry;
        }
    });
}

// 从API加载所有国家/货币
async function loadCountries() {
    try {
        const response = await fetch('https://api.steaminventoryhelper.com/steam-rates?base=USD');
        const data = await response.json();
        
        if (data.success) {
            exchangeRates = data.data.rates;
            populateCountrySelects(exchangeRates);
            loadSavedCountries();
        } else {
            showError('加载国家列表失败，请稍后重试');
        }
    } catch (error) {
        console.error('Error fetching countries:', error);
        showError('网络错误，无法加载国家列表');
    }
}

// 显示加载状态
function showLoading() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> 检测中...';
    hideError();
}

// 隐藏加载状态
function hideLoading() {
    const btn = document.getElementById('checkBtn');
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span> 检测当前页面';
}

// 检查按钮点击事件
document.getElementById('checkBtn').addEventListener('click', async () => {
    const senderCode = document.getElementById('senderCountry').value;
    const recipientCode = document.getElementById('recipientCountry').value;
    
    if (!senderCode || !recipientCode) {
        showError('请选择发送方国家和接收方国家');
        return;
    }
    
    const senderRate = exchangeRates[senderCode];
    const recipientRate = exchangeRates[recipientCode];
    
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
        senderCode: senderCode,
        recipientCode: recipientCode,
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
                    
                    <!-- API 查询结果展示 -->
                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                        <div style="font-weight: bold; margin-bottom: 6px;">🔍 Steam API 查询结果</div>
                        <div style="font-size: 11px; font-family: monospace;">
                            <div>📍 发送方 (${senderCode}):</div>
                            <div style="margin-left: 12px;">
                                价格: ${response.rawSenderPrice} ${response.senderCurrency || senderCode}
                            </div>
                            <div style="margin-top: 6px;">📍 接收方 (${recipientCode}):</div>
                            <div style="margin-left: 12px;">
                                价格: ${response.rawRecipientPrice} ${response.recipientCurrency || recipientCode}
                            </div>
                        </div>
                    </div>
                    
                    <!-- 价格差异检查 -->
                    <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                        <div style="font-weight: bold; margin-bottom: 6px;">🌍 区域价格差异检查 (≤15% 限制)</div>
                        <div style="font-size: 11px; font-family: monospace;">
                            接收方价格换算成发送方货币:<br>
                            ${response.rawRecipientPrice} ${recipientCode} × ${senderRate.toFixed(4)} / ${recipientRate.toFixed(4)}<br>
                            = ${response.convertedRecipientToSender.toFixed(2)} ${senderCode}
                        </div>
                        <div style="font-size: 12px; margin-top: 4px;">
                            发送方实际价格: ${response.senderPrice} ${senderCode}<br>
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

// 搜索框事件监听 - 只过滤下拉选项，不影响选中值
document.getElementById('senderSearch').addEventListener('input', () => {
    updateSenderSelect();
});

document.getElementById('recipientSearch').addEventListener('input', () => {
    updateRecipientSelect();
});

// 对调按钮
document.getElementById('swapBtn').addEventListener('click', swapCountries);

// 关闭错误提示按钮
document.getElementById('closeErrorBtn').addEventListener('click', () => {
    hideError();
});

// 页面加载时初始化
loadCountries();