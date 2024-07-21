# Boardwalk Cash

A Lightning / Cashu Ecash wallet designed for fast easy onboarding and use

## Table of Contents

-  [Features](#features)
-  [Getting Started](#getting-started)
-  [Prerequisites](#prerequisites)
-  [Installation](#installation)
-  [Architecture](#architecture)
-  [Contributing](#contributing)
-  [License](#license)
-  [Contact](#contact)
-  [Acknowledgements](#acknowledgements)

## Features

-  **Lightning Integration**: Send and Receive Lightning payments.
-  **Cashu Ecash Wallet**: Store balance locally as e-cash while at rest.
-  **Lightning Address**: Receive payments using an auto-generated Lightning Address.
-  **Nostr Wallet Connect**: Initiate payments from apps using NWC ([NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md))
-  **Nostr Wallet Authentication**: Seamlessly create app connections with NWA ([NIP-67](https://github.com/benthecarman/nips/blob/nostr-wallet-connect-connect/67.md))
-  **Prism Payments**: Use NWC to pay multiple invoices at once

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following tools installed and running:

-  [Docker](https://www.docker.com/)
-  [Docker Compose](https://docs.docker.com/compose/)
-  [Node.js](https://nodejs.org/en/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/boardwalkcash.git

   ```

2. Navigate to the project directory:

   ```bash
   cd boardwalkcash

   ```

3. Update .env.example -> .env

   ```bash
   cp .env.example -> .env
   ```

4. Use Docker Compose to build and run the containers:

   ```bash
   docker-compose up --build
   ```

## Architecture

### Frontend

-  **Framework: Built with Next.js and TypeScript**.
-  **Pages**:
   -  index.tsx: The main page for the app. Starts up top level hooks and reads in proofs from localstorage
   -  connect.tsx: Reads in query params to connect with the apps using NWA
-  **Components**:
   -  Balance: Displays sat/usd balance
   -  ActivityIndicator: Controls the user messaging which appears between balance and buttons
   -  buttons/lightning: Contains send and receive buttons for making Lightning payments
   -  SendModal: UI / state for Lightning send flow
   -  ClipboardButton: for copying to clipboard
   -  EcashButtons: Currently in development
-  **Hooks**: Custom React hooks for managing state and side effects.
   -  useCashu: Handles all of the calls to cashu mint and cashu-ts library. Reads/Writes to localstorage for handling proofs
   -  useNwc: Subscribes to and handles NWC requests and prism payments.
-  **State Management**: Global state management using Redux Toolkit.
   -  store.ts: Redux Toolkit store for global state management
   -  slices/ActivitySlice.ts: managing activity state
   -  slices/CashuSlice.ts: managing cashu state
   -  slices/UserSlice.ts: managing user state
-  **LocalStorage**: for persisting user data and allowing user to self custody ecash proofs.
   -  localStorage is being called for reads/writes across the app. This is used to store the user's proofs.
   -  We are currently working on a more consistent and centralized way to handle this.

### Backend

-  **API Endpoints**: RESTful API endpoints facilitating lud16, crud operations on the db, and mint operations such as paying invoices, creating invoices, and checking/exchanging proofs with the mint.
   -  /api/callback: lud16 callback
   -  /api/invoice/polling: Polls mint for invoices waiting to be paid.
   -  /api/cron/invoice: Once above polling times out, this cron job check every minute for not-expired invoices
   -  /api/lnurlp: lud16 lnurlp flow for paying invoices
   -  /api/proofs: CRUD operations for the user's proofs
   -  /api/users: CRUD operations for the user's data
   -  /api/quotes: CRUD operations for managing quotes we need to keep track of
-  **Database**: PostgreSQL database, managed using Prisma ORM.

### Docker Integration

-  Docker Containers: Next.js app and database are containerized.
-  Docker Compose: orchestrates the deployment.

**NOTE**: You may run only the database with docker and use your local Node.js environment for running the Next.js app, if you so choose.

### Contributing

Any contributions you make are greatly appreciated.

-  Fork the Project
-  Create your Feature Branch (git checkout -b feature/AmazingFeature)
-  Commit your Changes (git commit -m 'Add some AmazingFeature')
-  Push to the Branch (git push origin feature/AmazingFeature)
-  Open a Pull Request

### License

Distributed under the MIT License. See [LICENSE](https://github.com/makeprisms/boardwalkcash/blob/main/LICENSE) for more information.

### Contact

-  [https://github.com/gudnuf](https://github.com/gudnuf)
-  [https://github.com/austinkelsay](https://github.com/austinkelsay)

Project Link: [https://github.com/makeprisms/boardwalkcash](https://github.com/makeprisms/boardwalkcash)

### Acknowledgements

-  The Cashu Ecosystem
-  Cashu-TS
-  Calle
-  Egge
