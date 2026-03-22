// 汇率更新定时器
let updateInterval = null;

// 获取并存储汇率
async function updateExchangeRates() {
    try {
        const response = await fetch('https://api.steaminventoryhelper.com/steam-rates?base=USD');
        const data = await response.json();
        
        if (data.success) {
            await chrome.storage.local.set({ 
                exchangeRates: data.data.rates,
                lastUpdate: Date.now()
            });
            console.log('Exchange rates updated successfully');
        }
    } catch (error) {
        console.error('Failed to update exchange rates:', error);
    }
}

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(() => {
    updateExchangeRates();
    
    // 每小时更新一次汇率
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateExchangeRates, 3600000);
});

// 插件启动时检查
chrome.runtime.onStartup.addListener(() => {
    updateExchangeRates();
});

console.log('Steam Gift Checker background service worker loaded');