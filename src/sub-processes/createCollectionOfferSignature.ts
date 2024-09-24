import { ethers, BigNumberish } from 'ethers';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import { CONFIG_ETH_MAINNET_V3 } from '../utils/constants';

const config = CONFIG_ETH_MAINNET_V3;

export interface Predicate {
  data: string;
  verifier: string;
}

export type CollectionWideOfferPayload = {
  proratedInterestRate: BigNumberish;
  principal: BigNumberish;
  collateralAddress: string;
  durationSecs: BigNumberish;
  items: Predicate[];
  payableCurrency: string;
  deadline: BigNumberish;
  affiliateCode: string;
  nonce: BigNumberish;
  side: 0 | 1;
};

export const createPredicate = (collection: string): Predicate => {
  return {
    verifier: config.collectionOfferVerifier,
    data: ethers.utils.defaultAbiCoder.encode(['address'], [collection]),
  };
};

export const createCollectionWideOfferPayload = ({
  proratedInterestRate,
  principal,
  collateralAddress,
  durationSecs,
  items,
  payableCurrency,
  deadline,
  affiliateCode,
  nonce,
  side,
}: CollectionWideOfferPayload) => {
  return {
    proratedInterestRate: ethers.utils.parseUnits(`${proratedInterestRate}`, 0),
    principal: ethers.utils.parseUnits(`${principal}`, 0),
    collateralAddress,
    durationSecs,
    items,
    payableCurrency,
    deadline,
    affiliateCode,
    nonce,
    side,
  };
};

const domain: TypedDataDomain = {
  name: 'OriginationController',
  version: config.version.toString(),
  chainId: config.id.toString(),
  verifyingContract: config.originationController,
};

const types: { types: Record<string, Array<TypedDataField>> } = {
  types: {
    LoanTermsWithItems: [
      { name: "proratedInterestRate", type: "uint256" },
      { name: "principal", type: "uint256" },
      { name: "collateralAddress", type: "address" },
      { name: "durationSecs", type: "uint96" },
      { name: "items", type: "Predicate[]" },
      { name: "payableCurrency", type: "address" },
      { name: "deadline", type: "uint96" },
      { name: "affiliateCode", type: "bytes32" },
      { name: "nonce", type: "uint160" },
      { name: "side", type: "uint8" },
    ],
    Predicate: [
      { name: "data", type: "bytes" },
      { name: "verifier", type: "address" },
    ],
  }
};

export const createCollectionWideOfferSignature = async (
  offerTerms: CollectionWideOfferPayload,
  signer: ethers.Signer,
  collectionAddress: string
) => {
  const predicate = createPredicate(collectionAddress);
  
  const message = createCollectionWideOfferPayload({
    ...offerTerms,
    items: [predicate],
    collateralAddress: collectionAddress,
  });

  if ('_signTypedData' in signer) {
    return await (signer as ethers.Wallet)._signTypedData(
      domain,
      types.types,
      message
    );
  } else {
    throw new Error("Signer does not support _signTypedData");
  }
};