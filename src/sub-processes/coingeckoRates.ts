import fetch from 'node-fetch';
import { CurrencyCode, CURRENCY_INFO } from '../utils/helpers';

function getCurrencySymbol(currency: CurrencyCode): string {
    switch(currency) {
        case 'ETH': return 'eth';
        case 'USDC': return 'usd';
        case 'DAI': return 'dai';
        default:
            throw new Error(`Unsupported currency: ${currency}`);
    }
}

export async function getETHToTokenRate(token: CurrencyCode): Promise<number> {
    const symbol = getCurrencySymbol(token);
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=${symbol}`);
    const data = await response.json();
    
    if (!data.ethereum || !data.ethereum[symbol]) {
        throw new Error(`Failed to get exchange rate for ETH to ${token}`);
    }
    
    return data.ethereum[symbol];
}