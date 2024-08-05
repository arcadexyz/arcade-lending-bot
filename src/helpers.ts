  import { ethers, BigNumber } from "ethers";
  import moment from 'moment';

  export type CurrencyCode = keyof typeof CURRENCY_INFO;

  export const CURRENCY_INFO: { [key: string]: { address: string; decimals: number } } = {
    "ETH":  { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", decimals: 18 },
    "USDC": { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    "DAI":  { address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18 },
  };

  export const getNameByAddress = (address: string): string => {
    const entry = Object.entries(CURRENCY_INFO).find(([_, info]) => 
      info.address.toLowerCase() === address.toLowerCase()
    );
    return entry ? entry[0] : "N/A";
  };

  export const getCurrencyDecimals = (currencyCode: string | number): number => {
    const code = typeof currencyCode === 'string' ? currencyCode.toUpperCase() : String(currencyCode).toUpperCase();
    return CURRENCY_INFO[code]?.decimals || 18; // Default to 18 if not found
  };

  export const convertByCurrency = (currencyCode: string | CurrencyCode, amount: string): string => {
    const code = typeof currencyCode === 'string' ? currencyCode.toUpperCase() : currencyCode;
    const decimals = getCurrencyDecimals(code);
    return ethers.utils.formatUnits(amount, decimals);
  };

  export const calculateProtocolPrincipal = (
    principal: string,
    payableCurrency: string | number
  ): BigNumber => {
    const decimals = getCurrencyDecimals(payableCurrency);
    return ethers.utils.parseUnits(principal, decimals);
  };

  export const makePayableCurrency = (name: string | number): { decimals: number; address: string } => {
    const upperCaseName = typeof name === 'string' ? name.toUpperCase() : String(name).toUpperCase();
    const currencyInfo = CURRENCY_INFO[upperCaseName];
    return currencyInfo 
      ? { decimals: currencyInfo.decimals, address: currencyInfo.address }
      : { decimals: 18, address: '' };
  };

  export const calculateAPR = (
    principal: BigNumber,
    repayment: BigNumber,
    durationSecs: number
  ): number => {
    const durationInDays = durationSecs / 86400;
    const interestAmount = repayment.sub(principal);
    
    const initialRatio = interestAmount.mul(BigNumber.from(10).pow(8)).div(principal);
    const dailyRate = initialRatio.div(BigNumber.from(durationInDays));
    
    const apr = dailyRate.mul(36500).div(BigNumber.from(10).pow(6));
    
    return Math.round(parseFloat(ethers.utils.formatUnits(apr, 2)) * 100) / 100;
  };

  export const calculateProtocolInterestRate = (principal: string, repayment: string): string => {
    const principalBN = BigNumber.from(principal);
    const repaymentBN = BigNumber.from(repayment);
    const interestAmount = repaymentBN.sub(principalBN);
    
    return interestAmount.mul(BigNumber.from(10).pow(21)).div(principalBN).toString();
  };

  export const convertAPRtoProratedInterestRate = (apr: number, durationInDays: number): string => {
    const dailyRate = apr / 365 / 100;
    const proratedRate = dailyRate * durationInDays;
    
    return ethers.utils.parseUnits(proratedRate.toFixed(21), 21).toString();
  };

  export const calculateInterestRate = (
    principal: string,
    repayment: string
  ): string => {
    const principalBN = ethers.BigNumber.from(principal);
    const repaymentBN = ethers.BigNumber.from(repayment);
    const interestAmount = repaymentBN.sub(principalBN);
    
    return interestAmount.mul(ethers.BigNumber.from(10).pow(22)).div(principalBN).toString();
  };

  export const calculateRepaymentAmount = (
    principal: string,
    interestRate: string
  ): string => {
    const principalBN = ethers.BigNumber.from(principal);
    const interestRateBN = ethers.BigNumber.from(interestRate);
    
    const interest = principalBN.mul(interestRateBN).div(ethers.BigNumber.from(10).pow(22));
    const repayment = principalBN.add(interest);
    
    return repayment.toString();
  };

  export const formatInterestRateForArcade = (apr: number): string => {
    return ethers.utils.parseUnits(apr.toString(), 16).toString();
  };

  export const makeDeadline = (minutes: number): number => {
    return moment().add(minutes, 'minutes').unix();
  };

  export const daysToSeconds = (days: number): number => days * 24 * 60 * 60;