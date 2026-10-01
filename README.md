# Mytree Ecosystem

Grassroots climate-action site for the Mytree Ecosystem brand. It sells $MYTREE through a connected wallet, keeps INR donations on a separate Razorpay path, and runs a dual-incentive referral program (referrer and buyer both paid in $MYTREE on a confirmed purchase). Public copy, prices, tracks, and bonus percentages come from Firestore, not from hardcoded frontend values.

[![License](https://img.shields.io/github/license/Bannysukumar/mytree-website)](https://github.com/Bannysukumar/mytree-website/blob/main/LICENSE) [![Stars](https://img.shields.io/github/stars/Bannysukumar/mytree-website)](https://github.com/Bannysukumar/mytree-website/stargazers) [![Last commit](https://img.shields.io/github/last-commit/Bannysukumar/mytree-website)](https://github.com/Bannysukumar/mytree-website/commits/main)

## Overview

Grassroots climate-action site for the Mytree Ecosystem brand. It sells $MYTREE through a connected wallet, keeps INR donations on a separate Razorpay path, and runs a dual-incentive referral program (referrer and buyer both paid in $MYTREE on a confirmed purchase). Public copy, prices, tracks, and bonus percentages come from Firestore, not from hardcoded frontend values.


What is actually in the repository: `contracts/MytreePresale.sol`, `contracts/MytreeToken.sol`, `.cursor/`, `contracts/`, `design-system/`, `functions/`, `public/`, `scripts/`. GitHub reports the primary language as Python.

## Features


- MytreePresale Solidity contract
- MytreeToken Solidity contract

## Tech Stack

| Technology | Where it shows up |
|---|---|
| React | User interface |
| Vite | Frontend build tool |
| Firebase | Backend services used by this repository |
| Solidity | Smart contracts |
| Hardhat | Solidity compile and deploy scripts |
| ethers.js or web3.js | Wallet and contract calls from the browser or app |
| OpenZeppelin | Smart-contract base contracts |
| Python | Application or script code |
| Tailwind CSS | Styling |

## Project Architecture

Browser page → Solidity contract. The frontend loads ethers or web3.

## Project Structure

```text
mytree-website/
├── .cursor/
├── contracts/
├── design-system/
├── functions/
├── public/
├── scripts/
├── src/
├── test/
├── .env.example
├── .firebaserc
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── hardhat.config.js
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── storage.rules
├── tailwind.config.js
```

## Getting Started

```bash
git clone https://github.com/Bannysukumar/mytree-website.git
cd mytree-website
npm install
npm run dev
# Copy .env.example to .env and fill in the values that file lists.
```

Scripts defined in package.json:

- `npm run dev` — `vite`
- `npm run build` — `vite build`
- `npm run seed` — `node scripts/seed.mjs`

## Deployment

- firebase.json is in the repository root.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

[Banny Sukumar](https://github.com/Bannysukumar)

- GitHub: [@Bannysukumar](https://github.com/Bannysukumar)
- Portfolio: [adepu-sukumar.vercel.app](https://adepu-sukumar.vercel.app/)
- LinkedIn: [Adepu Sukumar](https://www.linkedin.com/in/adepu-sukumar-59b423351)
