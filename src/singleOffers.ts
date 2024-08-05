import * as inquirer from 'inquirer';
import { ethers } from 'ethers';
import { placeOffer, VAULT_FACTORY_ADDRESS } from './placeOffer';
import { LoanTermsPayload } from './createLoanTermsSignature';
import { placeCollectionOffer } from './placeCollectionOffer';
import { CollectionWideOfferPayload } from './createCollectionOfferSignature';
import { arcadeApiRequest } from './arcadeapi';
import * as helpers from './helpers';

enum OfferType {
  LOAN_EXTENSION = 'Loan Extension',
  ASSET = 'Listed asset/Vault',
  COLLECTION = 'Collection'
}

type Currency = helpers.CurrencyCode;

interface UserAnswers {
  offerType: OfferType;
  loanId?: string;
  collateralAddress: string;
  collateralId: string;
  durationDays: string;
  principal: string;
  repayment: string;
  currency: Currency;
  bidLifetime: string;
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
    console.error(`Failed to fetch loan details for loan ID ${loanId}:`, error);
    throw error;
  }
}

async function promptUser(): Promise<UserAnswers> {
  const questions: inquirer.QuestionCollection<UserAnswers> = [
    {
      type: 'list',
      name: 'offerType',
      message: 'What type of offer do you want to place?',
      choices: Object.values(OfferType),
    },
    {
      type: 'input',
      name: 'loanId',
      message: 'Enter Loan ID:',
      when: (answers: Partial<UserAnswers>) => answers.offerType === OfferType.LOAN_EXTENSION,
    },
    {
      type: 'input',
      name: 'collateralAddress',
      message: (answers: Partial<UserAnswers>) => 
        answers.offerType === OfferType.COLLECTION
          ? 'Enter collateral address:'
          : 'Enter collateral address (or vault factory address if it\'s a vault):',
      when: (answers: Partial<UserAnswers>) => answers.offerType === OfferType.ASSET || answers.offerType === OfferType.COLLECTION,
      validate: (value: string) => ethers.utils.isAddress(value) || 'Please enter a valid Ethereum address',
    },
    {
      type: 'input',
      name: 'collateralId',
      message: 'Enter collateral ID (or vault ID if it\'s a vault):',
      when: (answers: Partial<UserAnswers>) => answers.offerType === OfferType.ASSET,
      validate: (value: string) => {
        const largeIntegerRegex = /^-?\d+$/;
        return largeIntegerRegex.test(value) || 'Please enter a valid integer number';
      },
    },
    {
      type: 'list',
      name: 'currency',
      message: 'Select the currency for the loan:',
      choices: Object.keys(helpers.CURRENCY_INFO),
    },
    {
      type: 'input',
      name: 'principal',
      message: (answers: Partial<UserAnswers>) => `Enter principal amount in ${answers.currency}:`,
      validate: (value: string) => !isNaN(parseFloat(value)) || 'Please enter a number',
    },
    {
      type: 'input',
      name: 'repayment',
      message: (answers: Partial<UserAnswers>) => `Enter repayment amount in ${answers.currency}:`,
      validate: (value: string, answers: Partial<UserAnswers>) => {
        const repayment = parseFloat(value);
        const principal = parseFloat(answers.principal || '0');
        return (!isNaN(repayment) && repayment > principal) || 'Repayment must be a number greater than the principal';
      },
    },
    {
      type: 'input',
      name: 'durationDays',
      message: 'Enter loan duration in days:',
      validate: (value: string) => !isNaN(parseInt(value)) || 'Please enter a number',
    },
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
      ],
    },
  ];

  return await inquirer.prompt<UserAnswers>(questions);
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

async function main() {
  const answers = await promptUser();

  const principal = helpers.calculateProtocolPrincipal(answers.principal, answers.currency);
  const repayment = helpers.calculateProtocolPrincipal(answers.repayment, answers.currency);
  
  const formattedInterestRate = helpers.calculateInterestRate(
    principal.toString(),
    repayment.toString()
  );
  
  const commonTerms = {
    durationSecs: helpers.daysToSeconds(parseInt(answers.durationDays)),
    deadline: helpers.makeDeadline(parseInt(answers.bidLifetime)),
    interestRate: formattedInterestRate,
    principal: principal.toString(),
    payableCurrency: helpers.makePayableCurrency(answers.currency).address,
    nonce: Date.now(),
    side: 1 as const, // lender
  };
  
  const offerDetails = displayTermsForConfirmation(
    principal.toString(),
    formattedInterestRate,
    parseInt(answers.durationDays),
    answers.currency,
    repayment.toString()
  );

  const confirmed = await confirmOffer(offerDetails);

  if (!confirmed) {
    console.log("Offer placement cancelled.");
    return;
  }

  try {
    let result;
    if (answers.offerType === OfferType.COLLECTION) {
      const collectionOfferTerms: CollectionWideOfferPayload = {
        ...commonTerms,
        proratedInterestRate: formattedInterestRate,
        collateralAddress: answers.collateralAddress,
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
          collateralAddress: answers.collateralAddress,
          collateralId: answers.collateralId,
          isVault: answers.collateralAddress.toLowerCase() === VAULT_FACTORY_ADDRESS.toLowerCase()
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
  } catch (error) {
    console.error("Failed to place offer:", error);
  }
}

main().catch(error => console.error('An error occurred:', error));
