import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { createLoanTermsSignature, LoanTermsPayload } from './createLoanTermsSignature';
import { CONFIG_ETH_MAINNET_V3 } from '../utils/constants';

dotenv.config();

type PlaceOfferParams = {
  loanTerms: LoanTermsPayload;
  isVault: boolean;
  kind: 'loan' | 'asset' | 'vault';
};

async function placeOffer({ loanTerms, isVault, kind }: PlaceOfferParams) {
  try {
    const accountId = process.env.ACCOUNT_ID;
    const privateKey = process.env.PRIVATE_KEY;

    if (!accountId || !privateKey) {
      throw new Error("Missing environment variables");
    }

    const provider = new ethers.providers.JsonRpcProvider();
    const signer = new ethers.Wallet(privateKey, provider);

    const currentNonce = ethers.BigNumber.from(Date.now());

    const adjustedLoanTerms = {
      ...loanTerms,
      nonce: currentNonce,
      collateralAddress: isVault ? CONFIG_ETH_MAINNET_V3.vaultFactory : loanTerms.collateralAddress
    };

    const signature = await createLoanTermsSignature(adjustedLoanTerms, signer);

    if (!signature) {
      throw new Error("Failed to create and sign loan terms");
    }

    const apiPayload = {
      loanTerms: {
        durationSecs: ethers.BigNumber.from(adjustedLoanTerms.durationSecs).toNumber(),
        principal: adjustedLoanTerms.principal,
        proratedInterestRate: adjustedLoanTerms.interestRate,
        collateralAddress: adjustedLoanTerms.collateralAddress,
        collateralId: adjustedLoanTerms.collateralId,
        payableCurrency: adjustedLoanTerms.payableCurrency,
        deadline: ethers.BigNumber.from(adjustedLoanTerms.deadline).toString(),
        affiliateCode: "0x0000000000000000000000000000000000000000000000000000000000000000"
      },
      collectionId: isVault ? CONFIG_ETH_MAINNET_V3.vaultFactory : adjustedLoanTerms.collateralAddress,
      signature: signature,
      extraData: "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: currentNonce.toString(),
      kind: kind === 'loan' ? 'loan' : (isVault ? 'vault' : 'asset'),
      role: "lender"
    };

    const response = await axios.post(
      `https://api.arcade.xyz/api/v2/accounts/${accountId}/loanterms/`,
      apiPayload,
    );

    console.log("Offer placed successfully!");
    console.log('Payload:', JSON.stringify(apiPayload, null, 2));
    return response.data;
  } catch (error) {
    console.error("Error placing offer:", error);
    throw error;
  }
}

export { placeOffer };