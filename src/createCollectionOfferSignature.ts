import { ethers, BigNumberish } from 'ethers';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

export const CONFIG_ETH_MAINNET_V3 = {
    chain: 'ethereum',
    network: 'mainnet',
    id: 1,
    version: 3,
    originationController: '0xb7bfcca7d7ff0f371867b770856fac184b185878',
    loanCore: '0x89bc08ba00f135d608bc335f6b33d7a9abcc98af',
    vaultFactory: '0x269363665dbb1582b143099a3cb467e98a476d55',
    borrowerNote: '0xe5b12befaf3a91065da7fdd461ded2d8f8ecb7be',
    lenderNote: '0x92ed78b41537c902ad287608d8535bb6780a7618',
    collectionOfferVerifier: '0x1B6e58AaE43bFd2a435AA348F3328f3137DDA544',
};

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