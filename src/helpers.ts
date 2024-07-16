import { ethers } from "ethers";
import { CONFIG } from "./config/config";

export const calculateProtocolInterestRate = (
  principal: string,
  repayment: string
): { formatted: string; interestInWei: ethers.BigNumber } => {
  const principalBN = ethers.BigNumber.from(principal);
  const repaymentBN = ethers.BigNumber.from(repayment);

  const interest = repaymentBN.sub(principalBN);
  const interestRate = interest.mul(ethers.constants.WeiPerEther).div(principalBN);

  return {
    formatted: ethers.utils.formatUnits(interestRate, 16), // convert to percentage
    interestInWei: interestRate
  };
};

export const calculateProtocolPrincipal = (
  principal: string,
  payableCurrency: "usdc" | "weth"
): ethers.BigNumber => {
  const decimals = CONFIG.token[payableCurrency].decimals;
  return ethers.utils.parseUnits(principal, decimals);
};

export const makeDurationInSecs = (durationNumber: number, unit: "weeks" | "days"): number => {
  const ONE_DAY_SECONDS = 86400;
  const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;
  return unit === "weeks" 
    ? durationNumber * ONE_WEEK_SECONDS 
    : durationNumber * ONE_DAY_SECONDS;
};

export const makeDeadline = (): number => {
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds
  return Math.round((Date.now() + TWO_WEEKS) / 1000);
};

export const makePayableCurrency = (name: "weth" | "usdc"): { decimals: number; address: string } => {
  return {
    decimals: CONFIG.token[name].decimals,
    address: CONFIG.token[name].address
  };
};