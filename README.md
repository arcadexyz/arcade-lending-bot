# Arcade.xyz Lending Bot

The Arcade.xyz Lending Bot is a command-line tool that empowers lenders to automate and optimize their lending strategies on Arcade.xyz by programmatically placing and managing loan offers, enabling efficient participation in the lending market.

Arcade.xyz docs: https://docs.arcade.xyz/docs/arcade-faq

For support: discord.gg/arcadexyz (Open ticket or use dev/support channel)

<p align="center">
  <img src="https://github.com/arcadexyz/arcade-lending-bot/blob/main/public/console_screenshot.png?raw=true" alt="Arcade.xyz Lending Bot">
</p>

# Prerequisites

- You have installed the latest version of Node.js and npm

- You have an Arcade.xyz API key (request one in the Arcade's Discord if needed)

- You have set protocol spending allowance on wallet that you'll be using in this bot. You can do it here: https://app.arcade.xyz/account/settings

# Run the Lending Bot

1. Clone this repository: `git clone https://github.com/arcadexyz/arcade-lending-bot`

2. Navigate to the project directory: `cd arcade-lending-bot`

3. Install dependancies: `npm install`

4. Copy the environment template and add your keys: `cp example.env .env`

5. Edit .env file and add all necessary keys/parameters.

6. Run with `npm run`


# Dependencies

Key dependencies include:

- @types/node@20.14.10
- axios@1.7.2
- dotenv@16.4.5
- ethers@5.7.2
- typescript@5.5.3
- node-fetch@2.7.0
- for the full list please check package.json

# Author

Twitter: imgh05t
Discord: imgh05t