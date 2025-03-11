import {
    Address,
} from "viem";
import * as fs from "fs";
import * as path from "path";

export type CurrencyConfig = {
    symbol: string;
    address: Address;
}

export type NetworkConfig = {
    id: string;
    bundler_rpc: string;
    paymaster_rpc: string;
    public_rpc: string;
    currencies: CurrencyConfig[];
}

export const loadNetworkConfig = (): NetworkConfig[] => {
    const configPath = path.resolve(__dirname, "config.json");
    const configData = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(configData).networks;
};
