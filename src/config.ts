import { Address, Hex } from "viem";
import * as fs from "fs";
import * as path from "path";

export type CurrencyConfig = {
  symbol: string;
  address: Address;
};

export type NetworkConfig = {
  id: string;
  bundler_rpc: string;
  paymaster_rpc: string;
  public_rpc: string;
  currencies: CurrencyConfig[];
};

export type KeyConfig = {
  name: string;
  privateKey: Hex;
};

export type MellonConfig = {
  keys: KeyConfig[];
  networks: NetworkConfig[];
};

export const loadConfig = (): MellonConfig => {
  const homeDir = require("os").homedir();
  const configDir = path.resolve(homeDir, ".mellon");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }
  const configPath = path.resolve(configDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Config file does not exist at " + configPath);
  }
  const configData = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configData);
};
