import { ChainClients } from "./chains";
import { Address } from "viem";
import { ERC20Abi } from "../abi/erc20abi";

export async function getERC20Balance(
  chainClients: ChainClients,
  tokenAddress: Address
): Promise<{ symbol: string; tokenDecimals: number; tokenBalance: bigint }> {
  const { publicClient, kernelClient } = chainClients;
  if (!kernelClient.account) {
    throw new Error("Account not found");
  }
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
