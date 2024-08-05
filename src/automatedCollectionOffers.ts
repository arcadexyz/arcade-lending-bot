import inquirer from 'inquirer';
import { ethers } from 'ethers';
import { setTimeout } from 'timers/promises';
import { getFloorPrice } from './reservoir';
import { getETHToTokenRate } from './coingeckoRates';
import { CollectionWideOfferPayload, createCollectionWideOfferSignature } from './createCollectionOfferSignature';
import { placeCollectionOffer } from './placeCollectionOffer';
import * as helpers from './helpers';
import fs from 'fs';
import path from 'path';

interface OfferSettings {
  collections: string[];
  ltv: number;
  currency: helpers.CurrencyCode;
  loanDuration: number;
  apr: number;
  bidLifetime: string;
}

async function getUserSettings(): Promise<OfferSettings> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'collections',
      message: 'Enter collection addresses (comma-separated):',
      filter: (input: string) => input.split(',').map(addr => addr.trim()),
    },
    {
      type: 'number',
      name: 'ltv',
      message: 'Enter LTV percentage (e.g., 50 for 50%):',
      validate: (input: number) => input > 0 && input < 100,
    },
    {
      type: 'list',
      name: 'currency',
      message: 'Select the currency for the offers:',
      choices: Object.keys(helpers.CURRENCY_INFO),
    },
    {
      type: 'number',
      name: 'loanDuration',
      message: 'Enter loan duration in days:',
      validate: (input: number) => input > 0,
    },
    {
      type: 'number',
      name: 'apr',
      message: 'Enter APR percentage:',
      validate: (input: number) => input > 0 && input < 100,
    },
    {
      type: 'list',
      name: 'bidLifetime',
      message: 'How long do you want to keep your bid alive?',
      choices: [
        { name: '30 minutes', value: '30' },
        { name: '1 hour', value: '60' },
        { name: '2 hours', value: '120' },
        { name: '6 hours', value: '360' },
        { name: '12 hours', value: '720' },
      ],
    },
  ]);

  return answers as OfferSettings;
}

async function confirmOffer(offerDetails: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Please review the offer details:\n\n${offerDetails}\n\nDo you want to place this offer?`,
      default: false,
    },
  ]);
  return confirmed;
}

interface CollectionData {
    id: string;
    name: string;
  }
  
  function getCollectionNames(): Map<string, string> {
    const collectionsData = fs.readFileSync(path.join(__dirname, '..', 'collections_data.json'), 'utf8');
    const collections: CollectionData[] = JSON.parse(collectionsData);
    return new Map(collections.map(c => [c.id.toLowerCase(), c.name]));
  }
  
  const collectionNames = getCollectionNames();

async function placeOffers(settings: OfferSettings): Promise<void> {
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!);
    const ethToTokenRate = await getETHToTokenRate(settings.currency);
  
    for (const collection of settings.collections) {
      const floorPriceInETH = await getFloorPrice(collection);
      if (floorPriceInETH === null) {
        console.log(`Couldn't fetch floor price for collection: ${collection}. Skipping.`);
        continue;
      }
  
      const floorPriceInToken = floorPriceInETH * ethToTokenRate;
      const offerAmount = floorPriceInToken * settings.ltv / 100;
      
      const currencyDecimals = helpers.getCurrencyDecimals(settings.currency);
      const roundedOfferAmount = Number(offerAmount.toFixed(currencyDecimals));
      
      const principal = helpers.calculateProtocolPrincipal(roundedOfferAmount.toString(), settings.currency);
  
      const aprDecimal = settings.apr / 100;
      const repaymentAmount = roundedOfferAmount * (1 + (aprDecimal * settings.loanDuration / 365));
      const roundedRepaymentAmount = Number(repaymentAmount.toFixed(currencyDecimals));
      const repayment = helpers.calculateProtocolPrincipal(roundedRepaymentAmount.toString(), settings.currency);
  
      const formattedInterestRate = helpers.calculateInterestRate(
        principal.toString(),
        repayment.toString()
      );
  
      const offerTerms: CollectionWideOfferPayload = {
        proratedInterestRate: formattedInterestRate,
        principal: principal.toString(),
        collateralAddress: collection,
        durationSecs: helpers.daysToSeconds(settings.loanDuration),
        items: [], // This will be filled by createCollectionWideOfferSignature
        payableCurrency: helpers.makePayableCurrency(settings.currency).address,
        deadline: helpers.makeDeadline(parseInt(settings.bidLifetime)),
        affiliateCode: ethers.constants.HashZero,
        nonce: Date.now(),
        side: 1, // lender
      };
  
      const collectionName = collectionNames.get(collection.toLowerCase()) || 'Unknown Collection';
      const offerDetails = `
        Collection: ${collectionName} (${collection})
        Floor Price: ${floorPriceInETH.toFixed(4)} ETH (${floorPriceInToken.toFixed(currencyDecimals)} ${settings.currency})
        Offer Amount: ${roundedOfferAmount.toFixed(currencyDecimals)} ${settings.currency}
        Repayment Amount: ${roundedRepaymentAmount.toFixed(currencyDecimals)} ${settings.currency}
        LTV: ${settings.ltv}%
        Loan Duration: ${settings.loanDuration} days
        APR: ${settings.apr}%
        Bid Lifetime: ${settings.bidLifetime} minutes
        `;
  
      const confirmed = await confirmOffer(offerDetails);
  
      if (confirmed) {
        try {
          const signature = await createCollectionWideOfferSignature(offerTerms, signer, collection);
          await placeCollectionOffer({ offerTerms });
          console.log(`Offer placed successfully for collection: ${collectionName} (${collection})`);
        } catch (error) {
          console.error(`Error placing offer for collection ${collectionName} (${collection}):`, error);
        }
      } else {
        console.log(`Offer cancelled for collection: ${collectionName} (${collection})`);
      }
    }
  }

async function runAutomatedOffers() {
  const settings = await getUserSettings();

  while (true) {
    await placeOffers(settings);
    console.log(`Waiting for ${settings.bidLifetime} minutes before next round...`);
    await setTimeout(parseInt(settings.bidLifetime) * 60 * 1000);
  }
}

runAutomatedOffers().catch(console.error);