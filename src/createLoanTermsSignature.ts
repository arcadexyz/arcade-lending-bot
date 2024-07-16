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
};

const config = CONFIG_ETH_MAINNET_V3;

export const loanTermsTypesV3 = {
  LoanTerms: [
    { name: 'proratedInterestRate', type: 'uint256' },
    { name: 'principal', type: 'uint256' },
    { name: 'collateralAddress', type: 'address' },
    { name: 'durationSecs', type: 'uint96' },
    { name: 'collateralId', type: 'uint256' },
    { name: 'payableCurrency', type: 'address' },
    { name: 'deadline', type: 'uint96' },
    { name: 'affiliateCode', type: 'bytes32' },
    { name: 'nonce', type: 'uint160' },
    { name: 'side', type: 'uint8' },
  ],
};

export type LoanTermsPayload = {
  durationSecs: BigNumberish;
  deadline: BigNumberish;
  numInstallments: BigNumberish;
  interestRate: BigNumberish;
  principal: BigNumberish;
  /**
   * @dev This is the address of the collection used as collateral
   * For Direct ERC721 Asset loans it will be the address of the collection
   * For VAULT Loans it will be the VAULT FACTORY address. See config file
   */
  collateralAddress: string;
  /**
   * @dev This is the address of the tokenId used as collateral
   * For Direct ERC721 Asset loans it will be the tokenId of the asset
   * For VAULT Loans it will be the tokenId (decimal representation of the vault address) of the vault.
   */
  collateralId: BigNumberish;
  payableCurrency: string;
  nonce: BigNumberish;
  /* states if you are signing as the borrower or lender BORROWER: 0 LENDER: 1*/
  side: 0 | 1;
};

export const createLoanTermsPayload = ({
  durationSecs,
  deadline,
  interestRate,
  principal,
  collateralAddress,
  collateralId,
  payableCurrency,
  nonce,
  side,
}: LoanTermsPayload) => {
  return {
    durationSecs,
    deadline,
    numInstallments: 0,
    proratedInterestRate: ethers.utils.parseUnits(`${interestRate}`, 0),
    principal: ethers.utils.parseUnits(`${principal}`, 0),
    collateralAddress: collateralAddress,
    collateralId: collateralId,
    payableCurrency: payableCurrency,
    nonce: nonce,
    side: side,
    affiliateCode: ethers.constants.HashZero,
  };
};

const domain: TypedDataDomain = {
  name: 'OriginationController',
  version: config.version.toString(),
  chainId: config.id.toString(),
  verifyingContract: config.originationController,
};

const types: { types: Record<string, Array<TypedDataField>> } = {
  types: loanTermsTypesV3
};

export const createLoanTermsSignature = async (
  loanTerms: LoanTermsPayload,
  signer: ethers.Signer,
) => {
  const message = createLoanTermsPayload(loanTerms);

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