import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const ALCHEMY_API_KEY_MAINNET = process.env.ALCHEMY_API_KEY_MAINNET;
const ALCHEMY_API_KEY_TESTNET = process.env.ALCHEMY_API_KEY_TESTNET;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY_MAINNET}`,
      },
    },
    testnet: {
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY_TESTNET}`,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  solidity: '0.8.17',
};

export default config;
