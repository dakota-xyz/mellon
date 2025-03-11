import { Address } from "viem";
import { ERC20Abi } from "../abi/erc20abi";
import { parseUnits } from "viem";
import { encodeFunctionData } from "viem";
import { setupWallet } from "../wallet/setupWallet";
import { loadNetworkConfig } from "../networkConfig";
import * as commander from "commander";

export function sendCommand() {
  const sendCmd = new commander.Command("send")
    .description("send tokens")
    .argument("<amount>", "amount to send")
    .argument("<tokenAddress>", "address of token")
    .argument("<toAddress>", "address to send to")
    .action(
      async (amount: string, tokenAddress: Address, toAddress: Address) => {
        const config = loadNetworkConfig();
        const network = config.find((network) => network.id === "base-sepolia");
        if (!network) {
          throw new Error("Chain not found");
        }
        const { publicClient, kernelClient } = await setupWallet(network);
        if (!kernelClient.account) {
          throw new Error("Account not found");
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

        console.log("Preparing...");
        console.log("Amount: " + amount + " " + symbol);
        console.log("From:   " + kernelClient.account.address);
        console.log("To:     " + toAddress);
        console.log("\nSending...");
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
      }
    );
  return sendCmd;
}
