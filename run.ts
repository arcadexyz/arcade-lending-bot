import inquirer from 'inquirer';
import { spawn } from 'child_process';
import path from 'path';

function displayBanner() {
  console.log(`
    \x1b[36m
     ██████╗ ███╗   ███╗     █████╗ ███╗   ██╗ ██████╗ ███╗   ██╗
    ██╔════╝ ████╗ ████║    ██╔══██╗████╗  ██║██╔═══██╗████╗  ██║
    ██║  ███╗██╔████╔██║    ███████║██╔██╗ ██║██║   ██║██╔██╗ ██║
    ██║   ██║██║╚██╔╝██║    ██╔══██║██║╚██╗██║██║   ██║██║╚██╗██║
    ╚██████╔╝██║ ╚═╝ ██║    ██║  ██║██║ ╚████║╚██████╔╝██║ ╚████║
     ╚═════╝ ╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═══╝
                                                               
     █████╗ ██████╗  ██████╗ █████╗ ██████╗ ███████╗   ██╗  ██╗██╗   ██╗███████╗
    ██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝   ╚██╗██╔╝╚██╗ ██╔╝╚══███╔╝
    ███████║██████╔╝██║     ███████║██║  ██║█████╗      ╚███╔╝  ╚████╔╝   ███╔╝ 
    ██╔══██║██╔══██╗██║     ██╔══██║██║  ██║██╔══╝      ██╔██╗   ╚██╔╝   ███╔╝  
    ██║  ██║██║  ██║╚██████╗██║  ██║██████╔╝███████╗   ██╔╝ ██╗   ██║   ███████╗
    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═════╝ ╚══════╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝
    \x1b[0m
  `);
  console.log();
}

async function runScript(scriptName: string): Promise<void> {
  const scriptPath = path.join(__dirname, 'src', `${scriptName}.ts`);
  
  console.log(`\x1b[32mRunning ${scriptName}...\x1b[0m`);

  const childProcess = spawn('npx', ['ts-node', scriptPath], {
    stdio: 'inherit',
    shell: true
  });

  return new Promise((resolve, reject) => {
    childProcess.on('error', (error) => {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      reject(error);
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

async function main() {
  while (true) {
    displayBanner();

    const { script } = await inquirer.prompt([
      {
        type: 'list',
        name: 'script',
        message: 'What would you like to do?',
        choices: [
          { name: 'Place Single Offer', value: 'singleOffers' },
          { name: 'Automated Collection Offers', value: 'automatedCollectionOffers' },
          { name: '', value: '' },
          { name: 'Get DUE SOON Loans', value: 'getLoans' },
          { name: 'Get Listings', value: 'getListings' },
          new inquirer.Separator(),
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (script === 'exit') {
      console.log('\x1b[33mExiting Arcade Lending Bot. Bye!\x1b[0m');
      break;
    }

    try {
      await runScript(script);
    } catch (error) {
      console.error('\x1b[31mAn error occurred while running the script:\x1b[0m', error);
    }
    
    console.log('\n\x1b[33mReturning to main menu...\x1b[0m\n');
  }
}

main().catch(console.error);