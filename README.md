# mellon

<p align="center">
   <img src="./.github/images/doors_of_durin.webp" width="33%"/>
</p>

This repository provides a command-line interface (CLI) tool built with TypeScript that interacts with blockchain functionality. The tool allows you to:

- Determine your onchain address from a private key.
- Retrieve the balance of tokens (e.g., DKUSD).
- Send tokens between addresses.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 12+)
- npm
- [ts-node](https://www.npmjs.com/package/ts-node) (if not installed globally, you can run it via npx)

## Usage

```
Usage: mellon [options] [command]

Simple Account Abstraction CLI

Options:
  -V, --version                                       output the version number
  -h, --help                                          display help for command

Commands:
  addresses                                           show addresses
  balances <name>                                     show balances
  send [options] <from> <amount> <token> <toAddress>  send tokens
  help [command]                                      display help for command
```

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/dakota-xyz/mellon
   cd mellon
   ```

2. **Install dependencies:**

   ```bash
   npm install -g .
   ```

3. **Configure:**

   ```
   mkdir ${HOME}/.mellon/
   cp config.json.example ${HOME}/.mellon/config.json
   ```

   Set the Keys you wish to use.

   ```
   "keys": [
      {
         "name": "Checking",
         "privateKey": "0xYOUR_PRIVATE_KEY"
      },
   ]
   ```

   RPC endpoints for each network you wish to access.

   ```
   "networks": [
        {
            "id": "arbitrum-mainnet",
            "bundler_rpc": "",
            "paymaster_rpc": "",
            "public_rpc": "",
        }
        ...
   ]
   ```

   Replace the empty strings with your actual RPC endpoints and your private key.

## Usage

The CLI is executed using `ts-node`. Below are a few examples of how to run the application:

### Get Onchain Addresses

Determine the onchain addresses from your private key:

```bash
mellon addresses
```

**Example Output:**

```plaintext
┌─────────┬────────────┬──────────────────────────────────────────────┐
│ (index) │ name       │ address                                      │
├─────────┼────────────┼──────────────────────────────────────────────┤
│ 0       │ 'Checking' │ '0x87008541cE1029156ADA8356976DC4e8E39C895F' │
│ 1       │ 'Savings'  │ '0xE9B217797098808233142A253C1711e9C7ee50aD' │
│ 2       │ 'Treasury' │ '0x0BEdB3Df1A7179c1f46f92E7549cbaB057FC2c77' │
└─────────┴────────────┴──────────────────────────────────────────────┘
```

### Check Token Balance

Retrieve the balance of tokens (e.g., DKUSD) for the Checking address:

```bash
mellon balances Checking
```

**Example Output:**

```plaintext
┌─────────┬────────────────┬─────────┬─────────┬──────────────────────────────────────────────┐
│ (index) │ chain          │ amount  │ token   │ address                                      │
├─────────┼────────────────┼─────────┼─────────┼──────────────────────────────────────────────┤
│ 0       │ 'base-sepolia' │ 4319.08 │ 'DKUSD' │ '0xD3f3a31a5AcCEE9eC2032B3E4312C17Ee7f900EC' │
│ 1       │ 'base-sepolia' │ 1       │ 'USDC'  │ '0x036CbD53842c5426634e7929541eC2318f3dCF7e' │
└─────────┴────────────────┴─────────┴─────────┴──────────────────────────────────────────────┘
```

### Send Tokens

Sending 1 DKUSD to an address

```bash
mellon send Checking 1 DKUSD 0xcDE358a204726d9F20F5C8DfC4aB7343ff470357 --network base-sepolia
```

**Example Output:**

```plaintext
Preparing...
Amount:  1 DKUSD
From:    Checking(0x87008541cE1029156ADA8356976DC4e8E39C895F)
Network: base-sepolia
To:      0xcDE358a204726d9F20F5C8DfC4aB7343ff470357

Sending...
UserOp: 0x69f64bf96c000fbda6c49e0253f0a9b4bde9afbf7f405cf620b30f2b607e93f8

Waiting for receipt...
TxHash: 0x56eeb5c8010e4526c9940c67277bfa70afe7079a25e48fbf814c17382570fba4
Status: success
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request or open an issue if you have any suggestions or improvements.
