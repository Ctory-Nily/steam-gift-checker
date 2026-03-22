// API端点
export const EXCHANGE_RATES_API = 'https://api.steaminventoryhelper.com/steam-rates?base=USD';
export const STEAM_API_BASE = 'https://store.steampowered.com/api';
export const STEAMDB_BASE = 'https://steamdb.info';
export const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// Storage键名
export const STORAGE_KEYS = {
    EXCHANGE_RATES: 'exchangeRates',
    SENDER_COUNTRY: 'senderCountry',
    RECIPIENT_COUNTRY: 'recipientCountry',
    LAST_UPDATE: 'lastUpdate'
};

// 送礼费用倍数
export const GIFT_FEE_MULTIPLIER = 1.15;

// 国家映射
export const COUNTRY_NAMES = {
    'USD': 'United States', 'RUB': 'Russia', 'UAH': 'Ukraine',
    'EUR': 'Eurozone', 'GBP': 'United Kingdom', 'JPY': 'Japan',
    'CNY': 'China', 'KRW': 'South Korea', 'BRL': 'Brazil',
    'INR': 'India', 'CAD': 'Canada', 'AUD': 'Australia'
};