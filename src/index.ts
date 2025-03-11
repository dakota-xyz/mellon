import "dotenv/config";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, getUserOperationGasPrice } from "@zerodev/sdk"
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { http, Hex, createPublicClient, Address, encodeFunctionData, formatUnits, parseUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { ERC20Abi } from "./abi/erc20abi";

import { arbitrum, avalanche, base, baseSepolia, mainnet, optimism, polygon, Chain } from "viem/chains"
import * as fs from 'fs';
import * as path from 'path';

const commander = require('commander');
const program = new commander.Command();

interface ChainConfig {
    id: string,
    chain: Chain,
}

const chains: ChainConfig[] = [
    {
        id: 'avalanche-mainnet',
        chain: avalanche
    },
    {
        id: 'arbitrum-mainnet',
        chain: arbitrum
    },
    {
        id: 'base-sepolia',
        chain: baseSepolia,
    },
    {
        id: 'base-mainnet',
        chain: base,
    },
    {
        id: 'ethereum-mainnet',
        chain: mainnet
    },
    {
        id: 'optimism-mainnet',
        chain: optimism
    },
    {
        id: 'polygon-mainnet',
        chain: polygon
    },
]
const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_1

interface CurrencyConfig {
    symbol: string,
    address: Address
}

interface NetworkConfig {
    id: string,
    bundler_rpc: string,
    paymaster_rpc: string,
    public_rpc: string,
    currencies: CurrencyConfig[]
}

interface MellonConfig {
    networks: NetworkConfig[]
}

function loadConfig(): MellonConfig {
    const configPath = path.resolve(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
}

interface ChainClients {
    publicClient: ReturnType<typeof createPublicClient>,
    kernelClient: ReturnType<typeof createKernelAccountClient>
}

async function setupWallet(network: NetworkConfig): Promise<ChainClients> {
    const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
    const chain = chains.find((chain) => chain.id === network.id)?.chain;
    if (!chain) {
        throw new Error('Chain not found');
    }
    // Construct a public client
    const publicClient = createPublicClient({
        // Use your own RPC provider in production (e.g. Infura/Alchemy).
        transport: http(network.public_rpc),
        chain
    })

    // Construct a validator
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        entryPoint,
        kernelVersion
    });

    // Construct a Kernel account
    const account = await createKernelAccount(publicClient, {
        plugins: {
            sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion
    })

    const zerodevPaymaster = createZeroDevPaymasterClient({
        chain,
        transport: http(network.paymaster_rpc),
    })

    // Construct a Kernel account client
    const kernelClient = createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(network.bundler_rpc),
        // Required - the public client
        client: publicClient,
        paymaster: {
            getPaymasterData(userOperation) {
                return zerodevPaymaster.sponsorUserOperation({ userOperation })
            }
        },

        // Required - the default gas prices might be too high
        userOperation: {
            estimateFeesPerGas: async ({ bundlerClient }) => {
                return getUserOperationGasPrice(bundlerClient)
            }
        }
    })

    return { publicClient, kernelClient };
}

async function getERC20Balance(chainClients: ChainClients, tokenAddress: Address): Promise<{ symbol: string, tokenDecimals: number, tokenBalance: bigint }> {
    const { publicClient, kernelClient } = chainClients;
    if (!kernelClient.account) {
        throw new Error('Account not found');
    }
    console.log('Getting balance for ' + tokenAddress + ' on ' + publicClient.chain?.rpcUrls.default.http[0]);
    const symbol = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "symbol",
    });
    const tokenDecimals = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "decimals",
    });
    const tokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: [kernelClient.account.address],
    });
    return { symbol, tokenDecimals, tokenBalance };
}

program.addCommand(addressCommand());
program.addCommand(balanceCommand());
program.addCommand(sendCommand());

program
    .version("1.0.0")
    .description("Simple Account Abstraction CLI")
    .parse(process.argv);

function addressCommand() {
    const addressCmd = new commander.Command('address').
        description('show address').
        action(async () => {
            const config = loadConfig();
            const network = config.networks.find((network) => network.id === "ethereum-mainnet");
            if (!network) {
                throw new Error('Chain not found');
            }
            const { kernelClient } = await setupWallet(network); // updated to use the found network object
            if (!kernelClient.account) {
                throw new Error('Account not found');
            }
            const accountAddress = kernelClient.account.address
            console.log(accountAddress)
        });
    return addressCmd;
}

function balanceCommand() {
    const balanceCmd = new commander.Command('balance').
        description('show balances').
        action(async () => {
            const config = loadConfig();

            const balances = await Promise.all(config.networks.map(async (network) => {
                const client = await setupWallet(network);
                if (!client.kernelClient.account) {
                    throw new Error('Account not found');
                }
                const networkBalances = await Promise.all(network.currencies.map(async (currency) => {
                    const { symbol, tokenDecimals, tokenBalance } = await getERC20Balance(client, currency.address);
                    return {
                        chain: network.id,
                        amount: Number(formatUnits(tokenBalance, tokenDecimals)),
                        token: symbol,
                        address: currency.address
                    };
                }));
                return networkBalances;
            }));
            console.table(balances.flat().filter((balance) => balance.amount > 0), ['chain', 'amount', 'token', 'address']);
            // for (const network of config.networks) {
            //     const client = await setupWallet(network);
            //     if (!client.kernelClient.account) {
            //         throw new Error('Account not found');
            //     }

            //     for (const currency of network.currencies) {
            //         const chain = chains.find((chain) => chain.id === network.id)?.chain;
            //         if (!chain) {
            //             throw new Error('Chain not found');
            //         }
            //         const { symbol, tokenDecimals, tokenBalance } = await getERC20Balance(client, currency.address);
            //         if (tokenBalance === BigInt(0)) {
            //             continue;
            //         }
            //         balances.push({
            //             chain: network.id,
            //             amount: Number(formatUnits(tokenBalance, tokenDecimals)),
            //             token: symbol,
            //             address: currency.address
            //         });
            //     }
            // }
        });
    return balanceCmd;
}

function sendCommand() {
    const sendCmd = new commander.Command('send').
        description('send tokens').
        argument('<amount>', 'amount to send').
        argument('<tokenAddress>', 'address of token').
        argument('<toAddress>', 'address to send to').
        action(async (amount: string, tokenAddress: Address, toAddress: Address) => {
            const config = loadConfig();
            const network = config.networks.find((network) => network.id === "base-sepolia");
            if (!network) {
                throw new Error('Chain not found');
            }
            const { publicClient, kernelClient } = await setupWallet(network);
            if (!kernelClient.account) {
                throw new Error('Account not found');
            }
            const symbol = await publicClient.readContract({
                address: tokenAddress,
                abi: ERC20Abi,
                functionName: "symbol",
            });
            const decimals = await publicClient.readContract({
                address: tokenAddress,
                abi: ERC20Abi,
                functionName: "decimals",
            });

            console.log('Preparing...');
            console.log('Amount: ' + amount + ' ' + symbol);
            console.log('From:   ' + kernelClient.account.address);
            console.log('To:     ' + toAddress);
            console.log('\nSending...');
            const fullamount = parseUnits(amount, decimals);
            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelClient.account.encodeCalls([
                    {
                        to: tokenAddress,
                        value: BigInt(0),
                        data: encodeFunctionData({
                            abi: ERC20Abi,
                            functionName: "transfer",
                            args: [toAddress, fullamount],
                        }),
                    },
                ]),
            });

            console.log("UserOp:", userOpHash);
            console.log("\nWaiting for receipt...");
            const receipt = await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash,
                timeout: 0,
            });
            console.log("TxHash:", receipt.receipt.transactionHash);
            console.log("Status:", receipt.receipt.status);
        });
    return sendCmd;
}