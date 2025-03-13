import { formatUnits } from "viem";
import { setupWallet } from "../wallet/setupWallet";
import { loadConfig } from "../config";
import { getERC20Balance } from "../wallet/getERC20Balance";
import * as commander from "commander";

export function balancesCommand() {
  const balanceCmd = new commander.Command("balances")
    .description("show balances")
    .argument("<name>", "name of address to show balances")
    .action(async (name: string) => {
      const config = loadConfig();
      const fromAddress = config.keys.find((key) => key.name === name);
      if (!fromAddress) {
        throw new Error("Address not found: " + name);
      }
      const balances = await Promise.all(
        config.networks.map(async (network) => {
          // Skip networks without public RPC
          if (network.public_rpc === "") {
            return [];
          }
          const client = await setupWallet(fromAddress.privateKey, network);
          if (!client.kernelClient.account) {
            throw new Error("Account not found");
          }
          const networkBalances = await Promise.all(
            network.currencies.map(async (currency) => {
              const { symbol, tokenDecimals, tokenBalance } =
                await getERC20Balance(client, currency.address);
              return {
                chain: network.id,
                amount: Number(formatUnits(tokenBalance, tokenDecimals)),
                token: symbol,
                address: currency.address,
              };
            })
          );
          const nativeBalance = await client.publicClient.getBalance({
            address: client.kernelClient.account.address,
            blockTag: "latest",
          });
          networkBalances.push({
            chain: network.id,
            amount: Number(formatUnits(nativeBalance, 18)),
            token: "ETH",
            address: client.kernelClient.account.address,
          });
          return networkBalances;
        })
      );
      console.table(
        balances.flat().filter((balance) => balance.amount > 0),
        ["chain", "amount", "token", "address"]
      );
    });
  return balanceCmd;
}
