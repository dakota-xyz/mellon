import { createKernelAccountClient } from "@zerodev/sdk";
import { createPublicClient } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  Chain,
} from "viem/chains";

export interface ChainConfig {
  id: string;
  chain: Chain;
}

export const chains: ChainConfig[] = [
  {
    id: "avalanche-mainnet",
    chain: avalanche,
  },
  {
    id: "arbitrum-mainnet",
    chain: arbitrum,
  },
  {
    id: "base-sepolia",
    chain: baseSepolia,
  },
  {
    id: "base-mainnet",
    chain: base,
  },
  {
    id: "ethereum-mainnet",
    chain: mainnet,
  },
  {
    id: "optimism-mainnet",
    chain: optimism,
  },
  {
    id: "polygon-mainnet",
    chain: polygon,
  },
];

export interface ChainClients {
  publicClient: ReturnType<typeof createPublicClient>;
  kernelClient: ReturnType<typeof createKernelAccountClient>;
}
