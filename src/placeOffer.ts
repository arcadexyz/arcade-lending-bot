import axios from 'axios';
import { ethers, BigNumberish } from 'ethers';
import dotenv from 'dotenv';
import { createLoanTermsSignature, LoanTermsPayload } from './createLoanTermsSignature';

dotenv.config();

type PlaceOfferParams = {
  loanTerms: LoanTermsPayload;
};

async function placeOffer({ loanTerms }: PlaceOfferParams) {
  try {
    const accountId = process.env.ACCOUNT_ID;
    const apiKey = process.env.ARCADE_API_KEY;
    const privateKey = process.env.PRIVATE_KEY;

    if (!accountId || !apiKey || !privateKey) {
      throw new Error("Missing environment variables");
    }

    const provider = new ethers.providers.JsonRpcProvider();
    const signer = new ethers.Wallet(privateKey, provider);

    const currentNonce = ethers.BigNumber.from(Date.now());

    const signature = await createLoanTermsSignature({ ...loanTerms, nonce: currentNonce }, signer);

    if (!signature) {
      throw new Error("Failed to create and sign loan terms");
    }

    const apiPayload = {
      loanTerms: {
        durationSecs: ethers.BigNumber.from(loanTerms.durationSecs).toNumber(),
        principal: ethers.BigNumber.from(loanTerms.principal).toString(),
        proratedInterestRate: ethers.BigNumber.from(loanTerms.interestRate).toString(),
        collateralAddress: loanTerms.collateralAddress,
        collateralId: ethers.BigNumber.from(loanTerms.collateralId).toString(),
        payableCurrency: loanTerms.payableCurrency,
        deadline: ethers.BigNumber.from(loanTerms.deadline).toString(),
        affiliateCode: "0x0000000000000000000000000000000000000000000000000000000000000000"
      },
      collectionId: loanTerms.collateralAddress,
      signature: signature,
      extraData: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: currentNonce.toString(),
      kind: "asset",
      role: "lender"
    };

    console.log('Payload:', JSON.stringify(apiPayload, null, 2));

    const response = await axios.post(
      `https://api.arcade.xyz/api/v2/accounts/${accountId}/loanterms/`,

      apiPayload,
      
    );

    console.log("Offer placed successfully:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error placing offer:", error);
    throw error;
  }
}

async function main() {
  const loanTerms: LoanTermsPayload = {
    durationSecs: 86400 * 1, // 1 day
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    numInstallments: 0,
    interestRate: "1300000000000000000000", // 13 % amount of interest
    principal: "10000000", // 10
    collateralAddress: "0x364c828ee171616a39897688a831c2499ad972ec", // fidenza
    collateralId: 3278,
    payableCurrency: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // usdc
    nonce: Date.now(),
    side: 1 // lender
  };

  try {
    const result = await placeOffer({ loanTerms });
  } catch (error) {
    console.error("Failed to place offer:", error);
  }
}

main();

export { placeOffer };