
import originationControllerAbi from "../../abis/originationController.json";

const ethereum: any = {
  tokenByAddress: {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
      name: "usdc",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      logo: "usdc",
      decimals: 6,
      isEnabled: true,
    },
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
      name: "weth",
      address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      logo: "weth",
      decimals: 18,
      isEnabled: true,
    },
  },
  token: {
    usdc: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      name: "usdc",
      logo: "usdc",
      decimals: 6,
      isEnabled: true,
    },
    weth: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "weth",
      logo: "weth",
      decimals: 18,
      isEnabled: true,
    },
  },
  contract: {
    originationController: {
      v3: {
        address: "0xB7BFcca7D7ff0f371867B770856FAc184B185878",
        abi: originationControllerAbi,
      },
    },
  },
  domainData: {
    name: "OriginationController",
    version: "3",
    chainId: 1,
  },
};

const services = {
  images: {
    url: `https://images.arcade.xyz`,
  },
};

export const CONFIG = {
  ...ethereum,
  ...services,
};