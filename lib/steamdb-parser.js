export class SteamDBParser {
    extractPrices(html, senderCode, recipientCode) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const senderPrice = this.extractPriceByCurrency(doc, senderCode);
        const recipientPrice = this.extractPriceByCurrency(doc, recipientCode);
        
        return { senderPrice, recipientPrice };
    }
    
    extractPriceByCurrency(doc, currencyCode) {
        const rows = doc.querySelectorAll('table tbody tr');
        
        for (const row of rows) {
            if (row.textContent.includes(currencyCode)) {
                const price = this.findPriceInRow(row);
                if (price !== null) return price;
            }
        }
        
        throw new Error(`Price not found for currency: ${currencyCode}`);
    }
    
    findPriceInRow(row) {
        const cells = row.querySelectorAll('td');
        
        for (const cell of cells) {
            const price = this.parsePriceFromText(cell.textContent);
            if (price !== null) return price;
        }
        
        return null;
    }
    
    parsePriceFromText(text) {
        const match = text.match(/(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/);
        if (match) {
            const price = parseFloat(match[1].replace(/[,\s]/g, ''));
            if (!isNaN(price) && price > 0) {
                return price;
            }
        }
        return null;
    }
}