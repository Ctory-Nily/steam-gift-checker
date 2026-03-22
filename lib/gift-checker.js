import { GIFT_FEE_MULTIPLIER } from '../utils/constants.js';
import { SteamPriceFetcher } from './steam-price-fetcher.js';

export class GiftChecker {
    constructor() {
        this.priceFetcher = new SteamPriceFetcher();
    }
    
    async checkGiftability(params) {
        const { senderCode, recipientCode, senderRate, recipientRate } = params;
        
        const appId = this.getAppId();
        if (!appId) {
            throw new Error('Not a valid Steam game page');
        }
        
        const prices = await this.priceFetcher.fetchPrices(appId, senderCode, recipientCode);
        
        if (!prices.senderPrice || !prices.recipientPrice) {
            throw new Error(`Price not found for ${senderCode} or ${recipientCode}`);
        }
        
        const calculated = prices.senderPrice * GIFT_FEE_MULTIPLIER * recipientRate / senderRate;
        const canGift = calculated < prices.recipientPrice;
        
        return {
            canGift: canGift,
            calculated: calculated,
            actualPrice: prices.recipientPrice,
            senderPrice: prices.senderPrice,
            difference: prices.recipientPrice - calculated
        };
    }
    
    getAppId() {
        const match = window.location.pathname.match(/\/app\/(\d+)/);
        return match ? match[1] : null;
    }
}