import dotenv from 'dotenv';
dotenv.config();

import { arcadeApiRequest, log } from './arcadeapi';
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
        log('Starting to fetch listings');
        
        const listings: Listing[] = await arcadeApiRequest('get', 'lend');
        
        if (!listings || listings.length === 0) {
            log('No listings fetched');
            return null;
        }

        log(`Total listings fetched: ${listings.length}`);
        
        const minListingId = Number(process.env.MIN_LISTING_ID);
        if (isNaN(minListingId)) {
            throw new Error("MIN_LISTING_ID environment variable is not a valid number");
        }

        const filteredListings = listings.filter(listing => listing.listingId >= minListingId);
        
        log(`Listings after MIN_LISTING_ID filter: ${filteredListings.length}`);

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
        log(`Filtered listings logged to file: ${logFileName}`);

        return filteredListings;
    } catch (error) {
        if (error instanceof Error) {
            log(`Error in getListings: ${error.message}`);
        } else {
            log(`Unknown error in getListings`);
        }
        return null;
    }
}

// Execute the function to see if it runs properly
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
