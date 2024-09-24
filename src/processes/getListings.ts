import dotenv from 'dotenv';
dotenv.config();

import { arcadeApiRequest } from '../sub-processes/arcadeapi';
import fs from 'fs';
import moment from 'moment';

interface Listing {
    listingId: number;
    collateralAddress: string;
    collateralId: string;
    vault?: string;
}

async function getListings(filters: Record<string, any> = {}): Promise<Listing[] | null> {
    try {
        console.log('Starting to fetch listings');
        
        const listings: Listing[] = await arcadeApiRequest('get', 'lend');
        
        if (!listings || listings.length === 0) {
            return null;
        }

        const minListingId = Number(process.env.MIN_LISTING_ID);
        if (isNaN(minListingId)) {
            throw new Error("MIN_LISTING_ID environment variable is not a valid number");
        }

        const filteredListings = listings.filter(listing => listing.listingId >= minListingId);

        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const logFileName = `Listings_${timestamp}.log`;
        
        let logContent = `Filtered Listings - ${timestamp}\n\n`;
        
        filteredListings.forEach((listing, index) => {
            logContent += `Listing ${index + 1}:\n`;
            logContent += `  Listing ID: ${listing.listingId}\n`;
            logContent += `  Collateral Address: ${listing.collateralAddress}\n`;
            logContent += `  Collateral ID: ${listing.collateralId}\n`;
            logContent += `  Vault: ${listing.vault || 'N/A'}\n\n`;
        });

        fs.writeFileSync(logFileName, logContent);
        console.log(`Filtered listings logged to file: ${logFileName}`);

        return filteredListings;
    } catch (error) {
        return null;
    }
}

getListings().then(result => {
    if (result) {
        console.log('Listings fetched successfully');
    } else {
        console.log('No listings found or an error occurred');
    }
}).catch(error => {
    console.error('Error executing getListings:', error);
});

export { getListings };