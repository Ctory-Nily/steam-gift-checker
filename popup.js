// 全局变量
let exchangeRates = {};
let currentTab = null;

// 货币代码到中文国家名称的映射
function getCountryName(currencyCode) {
    const countryMap = {
        'USD': '美国',
        'RUB': '俄罗斯',
        'UAH': '乌克兰',
        'EUR': '欧元区',
        'GBP': '英国',
        'JPY': '日本',
        'CNY': '中国',
        'KRW': '韩国',
        'BRL': '巴西',
        'INR': '印度',
        'CAD': '加拿大',
        'AUD': '澳大利亚',
        'CHF': '瑞士',
        'PLN': '波兰',
        'NOK': '挪威',
        'IDR': '印度尼西亚',
        'MYR': '马来西亚',
        'PHP': '菲律宾',
        'SGD': '新加坡',
        'THB': '泰国',
        'VND': '越南',
        'TRY': '土耳其',
        'MXN': '墨西哥',
        'NZD': '新西兰',
        'CLP': '智利',
        'PEN': '秘鲁',
        'COP': '哥伦比亚',
        'ZAR': '南非',
        'HKD': '香港',
        'TWD': '台湾',
        'SAR': '沙特',
        'AED': '阿联酋',
        'ARS': '阿根廷',
        'ILS': '以色列',
        'KZT': '哈萨克斯坦',
        'KWD': '科威特',
        'QAR': '卡塔尔',
        'CRC': '哥斯达黎加',
        'UYU': '乌拉圭'
    };
    return countryMap[currencyCode] || `${currencyCode}`;
}

// 显示错误信息（可关闭）
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';
    
    // 滚动到错误提示位置
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
    hideError(); // 有新结果时隐藏错误提示
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

// 填充两个下拉菜单
function populateCountrySelects(rates) {
    const senderSelect = document.getElementById('senderCountry');
    const recipientSelect = document.getElementById('recipientCountry');
    
    senderSelect.innerHTML = '';
    recipientSelect.innerHTML = '';
    
    const currencies = Object.keys(rates).sort();
    
    for (const currencyCode of currencies) {
        const countryName = getCountryName(currencyCode);
        const option1 = new Option(`${countryName} (${currencyCode})`, currencyCode);
        const option2 = new Option(`${countryName} (${currencyCode})`, currencyCode);
        senderSelect.add(option1);
        recipientSelect.add(option2);
    }
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
    
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查是否在Steam商店页面
    if (!tab.url.includes('store.steampowered.com/app/')) {
        showError('请先访问 Steam 游戏页面（例如：store.steampowered.com/app/xxxxx）');
        return;
    }
    
    showLoading();
    
    // 向内容脚本发送消息，设置超时
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
            showError('无法连接到页面，请刷新 Steam 页面后重试\n\n提示：请确保当前在有效的 Steam 游戏页面');
            return;
        }
        
        // 在 popup.js 的检测结果部分
        if (response && !response.error) {
            const canGift = response.canGift;
            const senderCode = document.getElementById('senderCountry').value;
            const recipientCode = document.getElementById('recipientCountry').value;
            
            const resultHtml = `
                <div class="status ${canGift ? 'success' : 'error'}">
                    ${canGift ? '✅ 可以赠送！' : '❌ 不可以赠送'}
                </div>
                <div style="margin-top: 8px;">
                    <div style="font-size: 10px; color: #888; margin-bottom: 6px;">
                        数据来源: ${response.source || 'Steam API'}
                    </div>
                    <div><strong>计算过程：</strong></div>
                    <div style="font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; margin-top: 4px;">
                        ${response.senderPrice} ${senderCode} × 1.15 × ${recipientRate.toFixed(4)} / ${senderRate.toFixed(4)}<br>
                        = ${response.calculated.toFixed(2)} ${recipientCode}
                    </div>
                    <div style="margin-top: 8px;">
                        <strong>发送方价格：</strong> ${response.senderPrice} ${senderCode}<br>
                        <strong>接收方实际价格：</strong> ${response.actualPrice} ${recipientCode}<br>
                        <strong>差额：</strong> ${response.difference > 0 ? '+' : ''}${response.difference.toFixed(2)} ${recipientCode}
                    </div>
                    <div style="margin-top: 6px; font-size: 11px; padding: 6px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        ${canGift ? 
                            `✅ 计算结果 (${response.calculated.toFixed(2)}) > 实际价格 (${response.actualPrice})，可以赠送` : 
                            `❌ 计算结果 (${response.calculated.toFixed(2)}) < 实际价格 (${response.actualPrice})，无法赠送`}
                    </div>
                </div>
            `;
            showResult(resultHtml);
        } else {
            let errorMsg = response?.error || '无法获取价格数据，请稍后重试';
            // 美化错误信息
            if (errorMsg.includes('SteamDB')) {
                errorMsg = '无法从 SteamDB 获取价格数据，正在尝试备用方案...\n\n如果持续失败，请检查网络或稍后重试';
            } else if (errorMsg.includes('valid Steam game')) {
                errorMsg = '请确保当前在有效的 Steam 游戏页面\n\n例如：store.steampowered.com/app/XXX/';
            }
            showError(errorMsg);
        }
    });
});

// 关闭错误提示按钮
document.getElementById('closeErrorBtn').addEventListener('click', () => {
    hideError();
});

// 点击错误容器外部不关闭，只有点击关闭按钮才关闭
document.getElementById('errorContainer').addEventListener('click', (e) => {
    if (e.target === document.getElementById('errorContainer')) {
        // 点击背景不关闭，只有点击关闭按钮才关闭
        return;
    }
});

// 页面加载时初始化
loadCountries();