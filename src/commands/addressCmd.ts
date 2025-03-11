import { setupWallet } from "../wallet/setupWallet";
import { loadNetworkConfig } from "../networkConfig";
import * as commander from "commander";

export function addressCommand() {
  const addressCmd = new commander.Command("address")
    .description("show address")
    .action(async () => {
      const config = loadNetworkConfig();
      const network = config.find(
        (network) => network.id === "ethereum-mainnet"
      );
      if (!network) {
        throw new Error("Chain not found");
      }
      const { kernelClient } = await setupWallet(network); // updated to use the found network object
      if (!kernelClient.account) {
        throw new Error("Account not found");
      }
      const accountAddress = kernelClient.account.address;
      console.log(accountAddress);
    });
  return addressCmd;
}
