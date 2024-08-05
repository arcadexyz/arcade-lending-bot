import inquirer from 'inquirer';
import { ethers } from 'ethers';
import moment from 'moment';
import fs from 'fs';
import path from 'path';
import { arcadeApiRequest } from './arcadeapi';
import * as helpers from './helpers';
import { setTimeout } from 'timers/promises';
import { getHighestBid, getFloorPrice } from './reservoir';

const collectionsData = fs.readFileSync(path.join(__dirname, '..', 'collections_data.json'), 'utf8');
const collections: { id: string; name: string }[] = JSON.parse(collectionsData);
const collectionNameMap = new Map(collections.map(c => [c.id, c.name]));

interface Loan {
    state: string;
    protocolVersion: string;
    startDate: string;
    durationSecs: string;
    loanId: string;
    payableCurrency: string;
    principal: string;
    interestRate: string;
    collateralKind: string;
    collateralAddress: string;
    vaultAddress: string | null;
}

interface EnhancedLoan extends Omit<Loan, 'startDate'> {
    startDate: moment.Moment;
    dueDate: moment.Moment;
    durationDays: number;
    highestBid: number | null;
    floorPrice: number | null;
    isVault: boolean;
}

async function promptUser(): Promise<number> {
  const { dueSoonHours } = await inquirer.prompt([
    {
      type: 'number',
      name: 'dueSoonHours',
      message: 'Enter the number of hours to consider for due soon loans:',
      default: 12,
      validate: (value: number) => value > 0 || 'Please enter a positive number',
    },
  ]);

  return dueSoonHours;
}

async function getActiveLoans(dueSoonHours: number): Promise<EnhancedLoan[] | null> {
    try {
        console.log('Starting to fetch loans');
        
        const loans = await arcadeApiRequest('GET', 'loans') as Loan[];
        
        if (!loans || loans.length === 0) {
            return null;
        }

        const currentDate = moment().utc();
        const dueDateThreshold = moment().utc().add(dueSoonHours, 'hours');

        console.log('Filtering and processing loans...');
        const loansDueSoon = loans
            .filter(loan => loan.state === "Active" && loan.protocolVersion === "3")
            .map(loan => {
                const startDate = moment.unix(parseInt(loan.startDate)).utc();
                const durationSecs = parseInt(loan.durationSecs);
                const dueDate = moment(startDate).add(durationSecs, 'seconds');
                return {
                    ...loan,
                    startDate: startDate,
                    dueDate: dueDate,
                    durationDays: moment.duration(durationSecs, 'seconds').asDays(),
                    isVault: loan.vaultAddress !== null,
                    highestBid: null,
                    floorPrice: null
                } as EnhancedLoan;
            })
            .filter(loan => loan.dueDate.isBetween(currentDate, dueDateThreshold, null, '[]'))
            .sort((a, b) => a.dueDate.valueOf() - b.dueDate.valueOf());

        console.log(`Found ${loansDueSoon.length} active loans expiring within the next ${dueSoonHours} hours`);

        const DueSoon: EnhancedLoan[] = [];
        for (const loan of loansDueSoon) {
            if (!loan.isVault) {
                const [highestBid, floorPrice] = await Promise.all([
                    getHighestBid(loan.collateralAddress),
                    getFloorPrice(loan.collateralAddress)
                ]);
                DueSoon.push({ ...loan, highestBid, floorPrice });
            } else {
                DueSoon.push(loan);
            }
            await setTimeout(500); // Rate limiting
        }

        console.log('Success fetching floor prices and highest bids');

        if (DueSoon.length > 0) {
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const logFileName = `due_soon_loans_${timestamp}.log`;
            let logContent = `Due Soon Loans (next ${dueSoonHours} hours) - ${timestamp}\n\n`;

            DueSoon.forEach((loan, index) => {
                const currencyCode = helpers.getNameByAddress(loan.payableCurrency);
                const principal = helpers.convertByCurrency(currencyCode, loan.principal);
                
                const repaymentAmount = helpers.calculateRepaymentAmount(loan.principal, loan.interestRate);
                const repaymentAmountConverted = helpers.convertByCurrency(currencyCode, repaymentAmount);
                
                const durationInSeconds = loan.dueDate.diff(loan.startDate, 'seconds');
                const apr = helpers.calculateAPR(
                    ethers.BigNumber.from(loan.principal),
                    ethers.BigNumber.from(repaymentAmount),
                    durationInSeconds
                );
            
                logContent += `Count ${index + 1}:\n`;
                logContent += `  Loan ID: ${loan.loanId}\n`;
                logContent += `  Due Date (UTC): ${loan.dueDate.format('YYYY-MM-DD HH:mm:ss')}\n`;
                logContent += `  Is Vault: ${loan.isVault ? 'Yes' : 'No'}\n\n`;
            
                if (!loan.isVault) {
                    const collectionName = collectionNameMap.get(loan.collateralAddress) || 'Unknown';
                    logContent += `  Collection Name: ${collectionName}\n`;
                    logContent += `  Floor Price: ${loan.floorPrice !== null ? `${loan.floorPrice.toFixed(5)} ETH` : 'N/A'}\n`;
                    logContent += `  Highest Bid: ${loan.highestBid !== null ? `${loan.highestBid.toFixed(5)} ETH` : 'N/A'}\n\n`;
                }
            
                logContent += `  Principal: ${principal} ${currencyCode}\n`;
                logContent += `  Repayment: ${repaymentAmountConverted} ${currencyCode}\n`;
                logContent += `  Duration: ${Math.floor(loan.durationDays)} days\n`;
                logContent += `  APR: ${apr.toFixed(2)}%\n\n`;
            });
            
            fs.writeFileSync(logFileName, logContent);
        }

        return DueSoon;
    } catch (error) {
        console.error('Error in getActiveLoans:', error);
        return null;
    }
}

async function main() {
    while (true) {
        const dueSoonHours = await promptUser();
        await getActiveLoans(dueSoonHours);
        console.log('Getting DUE SOON loans completed');

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do next?',
                choices: [
                    { name: 'Get DUE SOON loans again', value: 'again' },
                    { name: 'Go back to main menu', value: 'back' }
                ]
            }
        ]);

        if (action === 'back') {
            break;
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}

export { main as getLoans };