import { EXCHANGE_RATES_API, STORAGE_KEYS } from './constants.js';

export class ExchangeRatesManager {
    constructor() {
        this.rates = null;
    }
    
    async getRates() {
        if (this.rates) return this.rates;
        
        const stored = await chrome.storage.local.get(STORAGE_KEYS.EXCHANGE_RATES);
        if (stored[STORAGE_KEYS.EXCHANGE_RATES]) {
            this.rates = stored[STORAGE_KEYS.EXCHANGE_RATES];
            return this.rates;
        }
        
        await this.fetchAndStore();
        return this.rates;
    }
    
    async fetchAndStore() {
        const response = await fetch(EXCHANGE_RATES_API);
        const data = await response.json();
        
        if (data.success) {
            this.rates = data.data.rates;
            await chrome.storage.local.set({
                [STORAGE_KEYS.EXCHANGE_RATES]: this.rates,
                [STORAGE_KEYS.LAST_UPDATE]: Date.now()
            });
        } else {
            throw new Error('Failed to fetch exchange rates');
        }
    }
    
    getRate(currencyCode) {
        return this.rates?.[currencyCode] || null;
    }
}