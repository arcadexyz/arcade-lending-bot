// placeCollectionOffer.ts

import axios from 'axios';
import { ethers, BigNumberish } from 'ethers';
import dotenv from 'dotenv';
import { createCollectionWideOfferSignature, CollectionWideOfferPayload } from './createCollectionOfferSignature';

dotenv.config();

const COLLECTION_OFFER_VERIFIER = '0x1B6e58AaE43bFd2a435AA348F3328f3137DDA544';

type PlaceCollectionOfferParams = {
  offerTerms: CollectionWideOfferPayload;
};

function createPredicate(collection: string) {
  return {
    verifier: COLLECTION_OFFER_VERIFIER,
    data: ethers.utils.defaultAbiCoder.encode(['address'], [collection]),
  };
}

async function placeCollectionOffer({ offerTerms }: PlaceCollectionOfferParams) {
  try {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;

    if (!accountId || !privateKey) {
      throw new Error("Wallet access not set");
    }

    const provider = new ethers.providers.JsonRpcProvider();
    const signer = new ethers.Wallet(privateKey, provider);

    const currentNonce = ethers.BigNumber.from(Date.now());
    const itemPredicate = createPredicate(offerTerms.collateralAddress);

    const signature = await createCollectionWideOfferSignature(
      { ...offerTerms, nonce: currentNonce, items: [itemPredicate] },
      signer,
      offerTerms.collateralAddress
    );

    if (!signature) {
      throw new Error("Failed to create and sign collection-wide offer terms");
    }

    const apiPayload = {
      loanTerms: {
        durationSecs: ethers.BigNumber.from(offerTerms.durationSecs).toNumber(),
        principal: ethers.BigNumber.from(offerTerms.principal).toString(),
        proratedInterestRate: ethers.BigNumber.from(offerTerms.proratedInterestRate).toString(),
        collateralAddress: offerTerms.collateralAddress,
        collateralId: "-1",
        payableCurrency: offerTerms.payableCurrency,
        deadline: ethers.BigNumber.from(offerTerms.deadline).toString(),
        affiliateCode: offerTerms.affiliateCode
      },
      collectionId: offerTerms.collateralAddress,
      signature: signature,
      extraData: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: currentNonce.toString(),
      kind: "collection",
      role: offerTerms.side === 1 ? "lender" : "borrower",
      itemPredicates: [itemPredicate]
    };

    console.log('Payload:', JSON.stringify(apiPayload, null, 2));

    const response = await axios.post(
      `https://api.arcade.xyz/api/v2/accounts/${accountId}/loanterms/`,
      apiPayload
    );

    console.log("Collection-wide offer placed successfully:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error placing collection-wide offer:", error);
    throw error;
  }
}

async function main() {
  const offerTerms: CollectionWideOfferPayload = {
    proratedInterestRate: "1300000000000000000000", // 13% interest rate
    principal: "10000000", // 10 USDC
    collateralAddress: "0x364c828ee171616a39897688a831c2499ad972ec", // Sappy Seal
    durationSecs: 86400 * 1, // 1 day
    items: [], // filled by the createCollectionWideOfferSignature function
    payableCurrency: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    affiliateCode: ethers.constants.HashZero,
    nonce: Date.now(),
    side: 1 // lender
  };

  try {
    const result = await placeCollectionOffer({ offerTerms });
  } catch (error) {
    console.error("Failed to place collection-wide offer:", error);
  }
}

main();

export { placeCollectionOffer };