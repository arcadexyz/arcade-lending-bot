import { ethers, BigNumberish } from 'ethers';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import { CONFIG_ETH_MAINNET_V3 } from '../utils/constants';

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
  collateralAddress: string;
  collateralId: string;
  payableCurrency: string;
  nonce: BigNumberish;
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
    proratedInterestRate: ethers.BigNumber.from(interestRate),
    principal: ethers.BigNumber.from(principal),
    collateralAddress,
    collateralId: ethers.BigNumber.from(collateralId),
    payableCurrency,
    nonce,
    side,
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