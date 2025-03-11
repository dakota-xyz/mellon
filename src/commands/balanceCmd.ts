import { formatUnits } from "viem";
import { setupWallet } from "../wallet/setupWallet";
import { loadNetworkConfig } from "../networkConfig";
import { getERC20Balance } from "../wallet/getERC20Balance";
import * as commander from "commander";

export function balanceCommand() {
  const balanceCmd = new commander.Command("balance")
    .description("show balances")
    .action(async () => {
      const config = loadNetworkConfig();
      const balances = await Promise.all(
        config.map(async (network) => {
          const client = await setupWallet(network);
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
