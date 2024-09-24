import * as inquirer from 'inquirer';
import { ethers } from 'ethers';
import { placeOffer } from '../sub-processes/placeOffer';
import { CONFIG_ETH_MAINNET_V3 } from '../utils/constants';
import { LoanTermsPayload } from '../sub-processes/createLoanTermsSignature';
import { placeCollectionOffer } from '../sub-processes/placeCollectionOffer';
import { CollectionWideOfferPayload } from '../sub-processes/createCollectionOfferSignature';
import { arcadeApiRequest } from '../sub-processes/arcadeapi';
import * as helpers from '../utils/helpers';

enum OfferType {
  LOAN_EXTENSION = 'Loan Extension',
  ASSET = 'Listed asset/Vault',
  COLLECTION = 'Collection'
}

type Currency = helpers.CurrencyCode;

interface UserAnswers {
  offerType?: OfferType;
  loanId?: string;
  collateralAddress?: string;
  collateralId?: string;
  currency?: Currency;
  principal?: string;
  repayment?: string;
  durationDays?: string;
  bidLifetime?: string;
}

interface LoanDetails {
  collateralAddress: string;
  collateralId: string;
  isVault: boolean;
}

async function getLoanDetails(loanId: string): Promise<LoanDetails> {
  try {
    const loans = await arcadeApiRequest('GET', 'loans') as any[];
    const loan = loans.find(l => l.loanId === loanId);
    
    if (!loan) {
      throw new Error(`Loan with ID ${loanId} not found`);
    }

    return {
      collateralAddress: loan.collateralAddress,
      collateralId: loan.collateralId,
      isVault: loan.vaultAddress !== null
    };
  } catch (error) {
    console.error(`Failed to fetch loan details for loan ID ${loanId}: `, error);
    throw error;
  }
}

async function promptOfferType(): Promise<OfferType | 'back'> {
  const { offerType } = await inquirer.prompt<{ offerType: OfferType | 'back' }>([
    {
      type: 'list',
      name: 'offerType',
      message: 'What type of offer do you want to place?',
      choices: [...Object.values(OfferType), 'Go Back'],
    },
  ]);

  return offerType === 'back' ? 'back' : offerType;
}

async function promptLoanExtension(): Promise<string | 'back'> {
  let loanId: string | 'back';
  while (true) {
    ({ loanId } = await inquirer.prompt<{ loanId: string | 'back' }>([
      {
        type: 'input',
        name: 'loanId',
        message: 'Enter Loan ID (or "back" to return):',
        validate: (input) => {
          if (input === 'back') return true;
          if (!input) return 'Loan ID is required.';
          return true;
        },
      },
    ]));

    if (loanId === 'back') return 'back';

    try {
      await getLoanDetails(loanId);
      return loanId;
    } catch (error) {
      console.error(`Error fetching loan details for ID ${loanId}: `, error);
      console.log('Please enter a valid loan ID or select "back".');
    }
  }
}

async function promptCollateralAddress(isCollection: boolean): Promise<string | 'back'> {
  const { collateralAddress } = await inquirer.prompt<{ collateralAddress: string | 'back' }>([
    {
      type: 'input',
      name: 'collateralAddress',
      message: isCollection
        ? 'Enter collateral address (or "back" to return):'
        : 'Enter collateral address (or vault factory address if it\'s a vault) (or "back" to return):',
      validate: (value: string) => 
        value === 'back' || ethers.utils.isAddress(value) || 'Please enter a valid Ethereum address',
    },
  ]);

  return collateralAddress === 'back' ? 'back' : collateralAddress;
}

async function promptCollateralId(): Promise<string | 'back'> {
  const { collateralId } = await inquirer.prompt<{ collateralId: string | 'back' }>([
    {
      type: 'input',
      name: 'collateralId',
      message: 'Enter collateral ID (or vault ID if it\'s a vault) (or "back" to return):',
      validate: (value: string) => {
        if (value === 'back') return true;
        const largeIntegerRegex = /^-?\d+$/;
        return largeIntegerRegex.test(value) || 'Please enter a valid integer number';
      },
    },
  ]);

  return collateralId === 'back' ? 'back' : collateralId;
}

async function promptCurrency(): Promise<Currency | 'back'> {
  const { currency } = await inquirer.prompt<{ currency: Currency | 'back' }>([
    {
      type: 'list',
      name: 'currency',
      message: 'Select the currency for the loan:',
      choices: [...Object.keys(helpers.CURRENCY_INFO), 'back'],
    },
  ]);

  return currency === 'back' ? 'back' : currency;
}

async function promptPrincipal(currency: Currency): Promise<string | 'back'> {
  const { principal } = await inquirer.prompt<{ principal: string | 'back' }>([
    {
      type: 'input',
      name: 'principal',
      message: `Enter principal amount in ${currency} (or "back" to return):`,
      validate: (value: string) => 
        value === 'back' || (!isNaN(parseFloat(value)) || 'Please enter a number'),
    },
  ]);

  return principal === 'back' ? 'back' : principal;
}

async function promptRepayment(currency: Currency, principal: string): Promise<string | 'back'> {
  const { repayment } = await inquirer.prompt<{ repayment: string | 'back' }>([
    {
      type: 'input',
      name: 'repayment',
      message: `Enter repayment amount in ${currency} (or "back" to return):`,
      validate: (value: string) => {
        if (value === 'back') return true;
        const repayment = parseFloat(value);
        const principalValue = parseFloat(principal);
        return (!isNaN(repayment) && repayment > principalValue) || 'Repayment must be a number greater than the principal';
      },
    },
  ]);

  return repayment === 'back' ? 'back' : repayment;
}

async function promptDuration(): Promise<string | 'back'> {
  const { duration } = await inquirer.prompt<{ duration: string | 'back' }>([
    {
      type: 'input',
      name: 'duration',
      message: 'Enter loan duration in days (or "back" to return):',
      validate: (value: string) => 
        value === 'back' || (!isNaN(parseInt(value)) || 'Please enter a number'),
    },
  ]);

  return duration === 'back' ? 'back' : duration;
}

async function promptBidLifetime(): Promise<string | 'back'> {
  const { bidLifetime } = await inquirer.prompt<{ bidLifetime: string | 'back' }>([
    {
      type: 'list',
      name: 'bidLifetime',
      message: 'How long do you want to keep your bid alive?',
      choices: [
        { name: '15 minutes', value: '15' },
        { name: '30 minutes', value: '30' },
        { name: '1 hour', value: '60' },
        { name: '2 hours', value: '120' },
        { name: '6 hours', value: '360' },
        { name: '12 hours', value: '720' },
        { name: '24 hours', value: '1440' },
        'back',
      ],
    },
  ]);

  return bidLifetime === 'back' ? 'back' : bidLifetime;
}

async function promptUser(): Promise<UserAnswers | 'back'> {
  const answers: UserAnswers = {};

  const offerType = await promptOfferType();
  if (offerType === 'back') return 'back';
  answers.offerType = offerType;

  if (answers.offerType === OfferType.LOAN_EXTENSION) {
    const loanId = await promptLoanExtension();
    if (loanId === 'back') return 'back';
    answers.loanId = loanId;
  }

  if (answers.offerType === OfferType.ASSET || answers.offerType === OfferType.COLLECTION) {
    const collateralAddress = await promptCollateralAddress(answers.offerType === OfferType.COLLECTION);
    if (collateralAddress === 'back') return 'back';
    answers.collateralAddress = collateralAddress;
  }

  if (answers.offerType === OfferType.ASSET) {
    const collateralId = await promptCollateralId();
    if (collateralId === 'back') return 'back';
    answers.collateralId = collateralId;
  }

  const currency = await promptCurrency();
  if (currency === 'back') return 'back';
  answers.currency = currency;

  const principal = await promptPrincipal(currency);
  if (principal === 'back') return 'back';
  answers.principal = principal;

  const repayment = await promptRepayment(currency, principal);
  if (repayment === 'back') return 'back';
  answers.repayment = repayment;

  const durationDays = await promptDuration();
  if (durationDays === 'back') return 'back';
  answers.durationDays = durationDays;

  const bidLifetime = await promptBidLifetime();
  if (bidLifetime === 'back') return 'back';
  answers.bidLifetime = bidLifetime;

  return answers;
}

function displayTermsForConfirmation(
  principal: string,
  interestRate: string,
  durationInDays: number,
  payableCurrency: helpers.CurrencyCode,
  repayment: string
): string {
  const principalFormatted = helpers.convertByCurrency(payableCurrency.toString(), principal);
  const repaymentFormatted = helpers.convertByCurrency(payableCurrency.toString(), repayment);
  
  const interestRateFormatted = (parseFloat(ethers.utils.formatUnits(interestRate, 20))).toFixed(2);
  
  const apr = helpers.calculateAPR(
    ethers.BigNumber.from(principal),
    ethers.BigNumber.from(repayment),
    helpers.daysToSeconds(durationInDays)
  );

  return `
    Principal: ${principalFormatted} ${payableCurrency}
    Repayment: ${repaymentFormatted} ${payableCurrency}
    Interest Rate: ${interestRateFormatted}%
    Duration: ${durationInDays} days
    Estimated APR: ${apr.toFixed(2)}%
    `;
}

async function confirmOffer(offerDetails: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: `Please review the offer details:\n\n${offerDetails}\n\nDo you want to place this offer?`,
      default: false,
    },
  ]);
  return confirmed;
}

export async function main(): Promise<UserAnswers | 'back'> {
  const answers = await promptUser();

  if (answers === 'back') {
    return 'back';
  }

  const principal = helpers.calculateProtocolPrincipal(answers.principal!, answers.currency!);
  const repayment = helpers.calculateProtocolPrincipal(answers.repayment!, answers.currency!);
  
  const formattedInterestRate = helpers.calculateInterestRate(
    principal.toString(),
    repayment.toString()
  );
  
  const commonTerms = {
    durationSecs: helpers.daysToSeconds(parseInt(answers.durationDays!)),
    deadline: helpers.makeDeadline(parseInt(answers.bidLifetime!)),
    interestRate: formattedInterestRate,
    principal: principal.toString(),
    payableCurrency: helpers.makePayableCurrency(answers.currency!).address,
    nonce: Date.now(),
    side: 1 as const, // lender
  };
  
  const offerDetails = displayTermsForConfirmation(
    principal.toString(),
    formattedInterestRate,
    parseInt(answers.durationDays!),
    answers.currency!,
    repayment.toString()
  );

  const confirmed = await confirmOffer(offerDetails);

  if (!confirmed) {
    console.log("Offer placement cancelled.");
    return 'back';
  }

  try {
    let result;
    if (answers.offerType === OfferType.COLLECTION) {
      const collectionOfferTerms: CollectionWideOfferPayload = {
        ...commonTerms,
        proratedInterestRate: formattedInterestRate,
        collateralAddress: answers.collateralAddress!,
        items: [],
        affiliateCode: ethers.constants.HashZero,
      };
      result = await placeCollectionOffer({ offerTerms: collectionOfferTerms });
    } else {
      let loanDetails: LoanDetails;
      if (answers.offerType === OfferType.LOAN_EXTENSION) {
        loanDetails = await getLoanDetails(answers.loanId!);
      } else {
        loanDetails = {
          collateralAddress: answers.collateralAddress!,
          collateralId: answers.collateralId!,
          isVault: answers.collateralAddress!.toLowerCase() === CONFIG_ETH_MAINNET_V3.vaultFactory.toLowerCase()
        };
      }
      const loanTerms: LoanTermsPayload = {
        ...commonTerms,
        numInstallments: 0,
        collateralAddress: loanDetails.collateralAddress,
        collateralId: loanDetails.collateralId,
      };
      result = await placeOffer({ 
        loanTerms, 
        isVault: loanDetails.isVault, 
        kind: answers.offerType === OfferType.LOAN_EXTENSION ? 'loan' : 
              (loanDetails.isVault ? 'vault' : 'asset')
      });
    }
    console.log("Offer placed successfully");
    return answers;
  } catch (error) {
    console.error("Failed to place offer:", error);
    return 'back';
  }
}

main().catch(error => console.error('An error occurred:', error));