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

## Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/dakota-xyz/mellon
   cd mellon
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**

   Create a `.env` file in the root directory with the following parameters:

   ```dotenv
   BUNDLER_RPC=""
   PAYMASTER_RPC=""
   PRIVATE_KEY=""
   ```

   Replace the empty strings with your actual RPC endpoints and your private key.

## Usage

The CLI is executed using `ts-node`. Below are a few examples of how to run the application:

### Get Onchain Address

Determine the onchain address from your private key:

```bash
mellon address
```

**Example Output:**

```plaintext
0x87008541cE1029156ADA8356976DC4e8E39C895F
```

### Check Token Balance

Retrieve the balance of tokens (e.g., DKUSD) for the onchain address:

```bash
mellon balance
```

**Example Output:**

```plaintext
┌─────────┬────────┬─────────┬──────────────────────────────────────────────┐
│ (index) │ amount │ token   │ address                                      │
├─────────┼────────┼─────────┼──────────────────────────────────────────────┤
│ 0       │ '4329' │ 'DKUSD' │ '0xD3f3a31a5AcCEE9eC2032B3E4312C17Ee7f900EC' │
└─────────┴────────┴─────────┴──────────────────────────────────────────────┘
```

### Send Tokens

Send tokens by providing the amount, recipient address, and sender's address:

```bash
mellon send 1.23 0xD3f3a31a5AcCEE9eC2032B3E4312C17Ee7f900EC 0xcDE358a204726d9F20F5C8DfC4aB7343ff470357
```

**Example Output:**

```plaintext
Preparing...
Amount: 1.23 DKUSD
From:   0x87008541cE1029156ADA8356976DC4e8E39C895F
To:     0xcDE358a204726d9F20F5C8DfC4aB7343ff470357

Sending...
UserOp: 0x0564a625a24e5b754ede19d7402a6c423192fac98e1e4f06a51ba4c59b2e305f

Waiting for receipt...
TxHash: 0x8cd8a22bf24a49a5dfab45695bbd5b3ef1d68a5653c683f9d0ea33740c8f5667
Status: success
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request or open an issue if you have any suggestions or improvements.
