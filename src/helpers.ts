import { ethers } from "ethers";
import { CONFIG } from "./config/config";

export const getNameByAddress = (address: string): string => {
  const prodAddresses: { [key: string]: string } = {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "ETH",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0x4d224452801aced8b2f0aebe155379bb5d594381": "APE",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "wBTC"
  };

  return address ? (prodAddresses[address.toLowerCase()] || "N/A") : "";
};

export const convertByCurrency = (currencyCode: string, amount: string): number => {
  const decimals: { [key: string]: number } = {
    "ETH": 18,
    "USDC": 6,
    "USDT": 6,
    "DAI": 18,
    "APE": 18,
    "wBTC": 8
  };

  const decimal = decimals[currencyCode] || 0;
  return Number(amount) / Math.pow(10, decimal);
};

export function calculateRepaymentAmount(principal: string, interestRate: string, currencyDecimals: number): string {
  const principalBN = ethers.BigNumber.from(principal);
  const interestRateBN = ethers.BigNumber.from(interestRate);
  
  // Calculate interest: principal * interestRate / 10^22
  const interest = principalBN.mul(interestRateBN).div(ethers.BigNumber.from(10).pow(22));
  
  // Repayment = principal + interest
  return principalBN.add(interest).toString();
}

export function convertToDecimal(amount: string, decimals: number): number {
  return parseFloat(ethers.utils.formatUnits(amount, decimals));
}

export const getCurrencyDecimals = (currencyCode: string): number => {
  const decimals: { [key: string]: number } = {
    "ETH": 18,
    "USDC": 6,
    "USDT": 6,
    "DAI": 18,
    "APE": 18,
    "wBTC": 8
  };

  return decimals[currencyCode] || 18; // Default to 18 if not found
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