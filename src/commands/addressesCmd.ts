import { setupWallet } from "../wallet/setupWallet";
import { loadConfig } from "../config";
import * as commander from "commander";

export function addressesCommand() {
  const addressesCmd = new commander.Command("addresses")
    .description("show addresses")
    .action(async () => {
      const config = loadConfig();

      // Addresses are the same for a private key regardless of the network
      const network = config.networks.find(
        (network) => network.id === "ethereum-mainnet"
      );
      if (!network) {
        throw new Error("Chain not found");
      }
      const addresses = await Promise.all(
        config.keys.map(async (key) => {
          const { kernelClient } = await setupWallet(key.privateKey, network); // updated to use the found network object
          if (!kernelClient.account) {
            throw new Error("Account not found");
          }
          return { name: key.name, address: kernelClient.account.address };
        })
      );
      console.table(addresses.flat(), ["name", "address"]);
    });
  return addressesCmd;
}
