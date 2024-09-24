import axios from 'axios';
import { ethers, BigNumberish } from 'ethers';
import dotenv from 'dotenv';
import { createCollectionWideOfferSignature, CollectionWideOfferPayload, createPredicate } from './createCollectionOfferSignature';

dotenv.config();

type PlaceCollectionOfferParams = {
  offerTerms: CollectionWideOfferPayload;
};

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

    const signaturePayload = {
      ...offerTerms,
      nonce: currentNonce,
      items: [itemPredicate],
    };

    const signature = await createCollectionWideOfferSignature(
      signaturePayload,
      signer,
      offerTerms.collateralAddress
    );

    if (!signature) {
      throw new Error("Failed to create and sign collection-wide offer terms");
    }

    const apiPayload = {
      loanTerms: {
        durationSecs: ethers.BigNumber.from(offerTerms.durationSecs).toNumber(),
        principal: offerTerms.principal,
        proratedInterestRate: offerTerms.proratedInterestRate,
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
      role: "lender",
      itemPredicates: [itemPredicate]
    };

    const response = await axios.post(
      `https://api.arcade.xyz/api/v2/accounts/${accountId}/loanterms/`,
      apiPayload
    );

    console.log("Collection-wide offer placed successfully!");
    return response.data;

  } catch (error) {
    console.error("Error placing collection-wide offer:", error);
    throw error;
  }
}

export { placeCollectionOffer };