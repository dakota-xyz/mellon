import { Address } from "viem";
import { ERC20Abi } from "../abi/erc20abi";
import { parseUnits } from "viem";
import { encodeFunctionData } from "viem";
import { setupWallet } from "../wallet/setupWallet";
import { loadConfig } from "../config";
import * as commander from "commander";

export function sendCommand() {
  const sendCmd = new commander.Command("send")
    .description("send tokens")
    .argument("<from>", "name of address to send from")
    .argument("<amount>", "amount to send")
    .argument("<token>", "token to send")
    .argument("<toAddress>", "address to send to")
    .option("-n, --network <network>", "network to use")
    .action(
      async (
        from: string,
        amount: string,
        token: string,
        toAddress: Address,
        options: { network?: string }
      ) => {
        const config = loadConfig();
        const networkId = options.network || "base-sepolia";
        if (!networkId) {
          throw new Error("Must specify network");
        }
        const networkConfig = config.networks.find(
          (network) => network.id === networkId
        );
        if (!networkConfig) {
          throw new Error("Chain not found:" + networkId);
        }
        const fromAddress = config.keys.find(
          (key) => key.name === (from || "default")
        );
        if (!fromAddress) {
          throw new Error("From address not found: " + (from || "default"));
        }
        const { publicClient, kernelClient } = await setupWallet(
          fromAddress.privateKey,
          networkConfig
        );
        if (!kernelClient.account) {
          throw new Error("Account not found");
        }

        const currency =
          token === "ETH"
            ? { address: "0x00" as Address, symbol: "ETH" }
            : networkConfig.currencies.find(
                (currency) => currency.symbol === token
              );
        if (!currency) {
          throw new Error("Token symbol not found: " + token);
        }
        const symbol =
          token === "ETH"
            ? "ETH"
            : await publicClient.readContract({
                address: currency.address,
                abi: ERC20Abi,
                functionName: "symbol",
              });
        const decimals =
          token === "ETH"
            ? 18
            : await publicClient.readContract({
                address: currency.address,
                abi: ERC20Abi,
                functionName: "decimals",
              });

        console.log("Preparing...");
        console.log("Amount:  " + amount + " " + symbol);
        console.log(
          "From:    " + from + "(" + kernelClient.account.address + ")"
        );
        console.log("Network: " + networkConfig.id);
        console.log("To:      " + toAddress);
        console.log("\nSending...");
        const fullamount = parseUnits(amount, decimals);

        const userOpHash = await kernelClient.sendUserOperation({
          callData:
            token === "ETH"
              ? await kernelClient.account.encodeCalls([
                  {
                    to: toAddress,
                    value: fullamount,
                    data: "0x",
                  },
                ])
              : await kernelClient.account.encodeCalls([
                  {
                    to: currency.address,
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
