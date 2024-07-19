
import dotenv from 'dotenv';
import moment from 'moment';
import fs from 'fs';
import { arcadeApiRequest, log } from './arcadeapi';
import * as helpers from './helpers';
import { ethers, BigNumberish } from 'ethers';

dotenv.config();

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
  }
  
  interface EnhancedLoan extends Omit<Loan, 'startDate'> {
    startDate: moment.Moment;
    dueDate: moment.Moment;
    durationDays: number;
  }

  async function getActiveLoans(): Promise<EnhancedLoan[] | null> {
    try {
        log('Starting to fetch loans');
        
        log('Making API request...');
        const loans = await arcadeApiRequest('GET', 'loans') as Loan[];
        log('API request completed');
        
        if (!loans || loans.length === 0) {
            log('No loans fetched');
            return null;
        }

        log(`Total loans fetched: ${loans.length}`);
        
        const currentDate = moment().utc();
        const dueSoonHours = parseInt(process.env.DUE_SOON || '48', 10);
        const dueDateThreshold = moment().utc().add(dueSoonHours, 'hours');

        log(`Current date (UTC): ${currentDate.format('YYYY-MM-DD HH:mm:ss')} (${currentDate.unix()})`);
        log(`Due date threshold (UTC): ${dueDateThreshold.format('YYYY-MM-DD HH:mm:ss')} (${dueDateThreshold.unix()})`);

        log('Filtering and processing loans...');
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
                    durationDays: moment.duration(durationSecs, 'seconds').asDays()
                } as EnhancedLoan;
            })
            .filter(loan => loan.dueDate.isBetween(currentDate, dueDateThreshold, null, '[]'))
            .sort((a, b) => a.dueDate.valueOf() - b.dueDate.valueOf());

        log(`Found ${loansDueSoon.length} active loans with protocol version 3 expiring within the next ${dueSoonHours} hours`);

        if (loansDueSoon.length > 0) {
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const logFileName = `due_soon_loans_${timestamp}.log`;
            const logHeader = `Due Soon Loans (next ${dueSoonHours} hours) - ${timestamp}\n\n`;

            let logContent = logHeader;

            loansDueSoon.forEach((loan, index) => {
                const currencyCode = helpers.getNameByAddress(loan.payableCurrency);
                const currencyDecimals = helpers.getCurrencyDecimals(currencyCode);
                const principal = helpers.convertToDecimal(loan.principal, currencyDecimals);
                
                const repaymentAmount = helpers.calculateRepaymentAmount(loan.principal, loan.interestRate, currencyDecimals);
                const repaymentAmountConverted = helpers.convertToDecimal(repaymentAmount, currencyDecimals);
                
                logContent += `Count ${index + 1}:\n`;
                logContent += `  Loan ID: ${loan.loanId}\n`;
                logContent += `  Due Date (UTC): ${loan.dueDate.format('YYYY-MM-DD HH:mm:ss')}\n`;
                logContent += `  Duration: ${Math.floor(loan.durationDays)} days\n`;
                logContent += `  Principal: ${principal.toFixed(3)} ${currencyCode}\n`;
                logContent += `  Repayment Amount: ${repaymentAmountConverted.toFixed(3)} ${currencyCode}\n`;
                logContent += `  Kind: ${loan.collateralKind}\n\n`;
            });
            
            fs.writeFileSync(logFileName, logContent);
            log(`Loans expiring within the next ${dueSoonHours} hours logged to file: ${logFileName}`);
        } else {
            log('No loans due soon');
        }

        return loansDueSoon;
    } catch (error) {
        if (error instanceof Error) {
            log(`Error in getActiveLoans: ${error.message}`);
            console.error('Full error:', error);
        } else {
            log(`Unknown error in getActiveLoans`);
            console.error('Full unknown error:', error);
        }
        return null;
    }
}

// At the end of your file, add:
getActiveLoans().then(() => {
    log('getActiveLoans completed');
}).catch(error => {
    log('Unhandled error in getActiveLoans');
    console.error(error);
});