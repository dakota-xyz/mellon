import {
  createKernelAccountClient,
  createKernelAccount,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
} from "@zerodev/sdk";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { http, createPublicClient, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { NetworkConfig } from "../networkConfig";
import { chains, ChainClients } from "./chains";

const entryPoint = getEntryPoint("0.7");
const kernelVersion = KERNEL_V3_1;

export async function setupWallet(
  network: NetworkConfig
): Promise<ChainClients> {
  const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const chain = chains.find((chain) => chain.id === network.id)?.chain;
  if (!chain) {
    throw new Error("Chain not found");
  }
  // Construct a public client
  const publicClient = createPublicClient({
    // Use your own RPC provider in production (e.g. Infura/Alchemy).
    transport: http(network.public_rpc),
    chain,
  });

  // Construct a validator
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion,
  });

  // Construct a Kernel account
  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion,
  });

  const zerodevPaymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(network.paymaster_rpc),
  });

  // Construct a Kernel account client
  const kernelClient = createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(network.bundler_rpc),
    // Required - the public client
    client: publicClient,
    paymaster: {
      getPaymasterData(userOperation) {
        return zerodevPaymaster.sponsorUserOperation({ userOperation });
      },
    },

    // Required - the default gas prices might be too high
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => {
        return getUserOperationGasPrice(bundlerClient);
      },
    },
  });

  return { publicClient, kernelClient };
}
