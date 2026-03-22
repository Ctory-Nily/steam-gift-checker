import { CORS_PROXY, STEAMDB_BASE } from '../utils/constants.js';
import { SteamDBParser } from './steamdb-parser.js';

export class SteamPriceFetcher {
    constructor() {
        this.parser = new SteamDBParser();
    }
    
    async fetchPrices(appId, senderCode, recipientCode) {
        try {
            return await this.fetchFromSteamDB(appId, senderCode, recipientCode);
        } catch (error) {
            console.warn('SteamDB fetch failed:', error);
            return await this.fetchFromSteamAPI(appId, senderCode, recipientCode);
        }
    }
    
    async fetchFromSteamDB(appId, senderCode, recipientCode) {
        const url = `${STEAMDB_BASE}/app/${appId}/`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (!data.contents) {
            throw new Error('Failed to fetch SteamDB page');
        }
        
        return this.parser.extractPrices(data.contents, senderCode, recipientCode);
    }
    
    async fetchFromSteamAPI(appId, senderCode, recipientCode) {
        const prices = {};
        
        for (const code of [senderCode, recipientCode]) {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${code.toLowerCase()}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data[appId]?.success && data[appId].data?.price_overview) {
                prices[`${code}Price`] = data[appId].data.price_overview.final / 100;
            } else {
                throw new Error(`Price not available for ${code}`);
            }
        }
        
        return {
            senderPrice: prices[`${senderCode}Price`],
            recipientPrice: prices[`${recipientCode}Price`]
        };
    }
}