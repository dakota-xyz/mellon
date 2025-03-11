import "dotenv/config";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, getUserOperationGasPrice } from "@zerodev/sdk"
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { http, Hex, createPublicClient, Address, encodeFunctionData, formatUnits, parseUnits } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { ERC20Abi } from "./lib/abi/erc20abi";

import { baseSepolia } from "viem/chains"
import { getBalance } from "viem/_types/actions/public/getBalance";
import { format } from "path";
const commander = require('commander');
const program = new commander.Command();

const chain = baseSepolia
const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_1

async function setupWallet(): Promise<{ publicClient: typeof publicClient, kernelClient: typeof kernelClient }> {
    const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

    // Construct a public client
    const publicClient = createPublicClient({
        // Use your own RPC provider in production (e.g. Infura/Alchemy).
        transport: http(process.env.BUNDLER_RPC),
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
        transport: http(process.env.PAYMASTER_RPC),
    })

    // Construct a Kernel account client
    const kernelClient = createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(process.env.BUNDLER_RPC),
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

async function getERC20Balance(tokenAddress: Address): Promise<{ symbol: string, tokenDecimals: number, tokenBalance: bigint }> {
    const { publicClient, kernelClient } = await setupWallet();
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

const options = program.opts();

function addressCommand() {
    const addressCmd = new commander.Command('address').
        description('show address').
        action(async () => {
            const { kernelClient } = await setupWallet();
            const accountAddress = kernelClient.account.address
            console.log(accountAddress)
        });
    return addressCmd;
}

function balanceCommand() {
    const balanceCmd = new commander.Command('balance').
        description('show balances').
        action(async () => {
            const tokens: Address[] = ['0xD3f3a31a5AcCEE9eC2032B3E4312C17Ee7f900EC']
            const balancesPromises = tokens.map(async (tokenAddress: Address) => {
                const { symbol, tokenDecimals, tokenBalance } = await getERC20Balance(tokenAddress);
                return { amount: formatUnits(tokenBalance, tokenDecimals), token: symbol, address: tokenAddress };
            });
            const balances = await Promise.all(balancesPromises);
            console.table(balances);
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
            const { publicClient, kernelClient } = await setupWallet();
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