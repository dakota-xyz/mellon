"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const sdk_1 = require("@zerodev/sdk");
const constants_1 = require("@zerodev/sdk/constants");
const ecdsa_validator_1 = require("@zerodev/ecdsa-validator");
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const erc20abi_1 = require("./abi/erc20abi");
const chains_1 = require("viem/chains");
const commander = require('commander');
const program = new commander.Command();
const chain = chains_1.baseSepolia;
const entryPoint = (0, constants_1.getEntryPoint)("0.7");
const kernelVersion = constants_1.KERNEL_V3_1;
async function setupWallet() {
    const signer = (0, accounts_1.privateKeyToAccount)(process.env.PRIVATE_KEY);
    // Construct a public client
    const publicClient = (0, viem_1.createPublicClient)({
        // Use your own RPC provider in production (e.g. Infura/Alchemy).
        transport: (0, viem_1.http)(process.env.BUNDLER_RPC),
        chain
    });
    // Construct a validator
    const ecdsaValidator = await (0, ecdsa_validator_1.signerToEcdsaValidator)(publicClient, {
        signer,
        entryPoint,
        kernelVersion
    });
    // Construct a Kernel account
    const account = await (0, sdk_1.createKernelAccount)(publicClient, {
        plugins: {
            sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion
    });
    const zerodevPaymaster = (0, sdk_1.createZeroDevPaymasterClient)({
        chain,
        transport: (0, viem_1.http)(process.env.PAYMASTER_RPC),
    });
    // Construct a Kernel account client
    const kernelClient = (0, sdk_1.createKernelAccountClient)({
        account,
        chain,
        bundlerTransport: (0, viem_1.http)(process.env.BUNDLER_RPC),
        // Required - the public client
        client: publicClient,
        paymaster: {
            getPaymasterData(userOperation) {
                return zerodevPaymaster.sponsorUserOperation({ userOperation });
            }
        },
        // Required - the default gas prices might be too high
        userOperation: {
            estimateFeesPerGas: async ({ bundlerClient }) => {
                return (0, sdk_1.getUserOperationGasPrice)(bundlerClient);
            }
        }
    });
    return { publicClient, kernelClient };
}
async function getERC20Balance(tokenAddress) {
    const { publicClient, kernelClient } = await setupWallet();
    const symbol = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20abi_1.ERC20Abi,
        functionName: "symbol",
    });
    const tokenDecimals = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20abi_1.ERC20Abi,
        functionName: "decimals",
    });
    const tokenBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20abi_1.ERC20Abi,
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
        const { kernelClient } = await setupWallet();
        const accountAddress = kernelClient.account.address;
        console.log(accountAddress);
    });
    return addressCmd;
}
function balanceCommand() {
    const balanceCmd = new commander.Command('balance').
        description('show balances').
        action(async () => {
        const tokens = ['0xD3f3a31a5AcCEE9eC2032B3E4312C17Ee7f900EC'];
        const balancesPromises = tokens.map(async (tokenAddress) => {
            const { symbol, tokenDecimals, tokenBalance } = await getERC20Balance(tokenAddress);
            return { amount: (0, viem_1.formatUnits)(tokenBalance, tokenDecimals), token: symbol, address: tokenAddress };
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
        action(async (amount, tokenAddress, toAddress) => {
        const { publicClient, kernelClient } = await setupWallet();
        const symbol = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20abi_1.ERC20Abi,
            functionName: "symbol",
        });
        const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20abi_1.ERC20Abi,
            functionName: "decimals",
        });
        console.log('Preparing...');
        console.log('Amount: ' + amount + ' ' + symbol);
        console.log('From:   ' + kernelClient.account.address);
        console.log('To:     ' + toAddress);
        console.log('\nSending...');
        const fullamount = (0, viem_1.parseUnits)(amount, decimals);
        const userOpHash = await kernelClient.sendUserOperation({
            callData: await kernelClient.account.encodeCalls([
                {
                    to: tokenAddress,
                    value: BigInt(0),
                    data: (0, viem_1.encodeFunctionData)({
                        abi: erc20abi_1.ERC20Abi,
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
