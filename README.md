# quickcashu

A Lightning / Cashu Ecash wallet designed for fast easy onboarding and use

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following tools installed and running:

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/en/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/quickcashu.git
   
2. Navigate to the project directory:

    ```bash
    cd quickcashu

3. Use Docker Compose to build and run the containers:

    ```bash
    docker-compose up --build

## Architecture

quickcashu is designed with a modular and scalable architecture.

### Frontend
###### - Framework: Built with Next.js and TypeScript.
###### - Pages:
    - _app.tsx: Wraps the entire app with context providers and global styles
    - _document.tsx: Custom document for Next.js
    - index.tsx: The main page for the app. Starts up top level hooks and reads in proofs from localstorage
    - connect.tsx: The connect page for nostr wallet auth used for connecting wallet to the MakePrisms Zap Discord Bot
###### - Components:
    - Balance: Displays sat/usd balance
    - ActivityIndicator: controls the user messaging which appears between balance and buttons
    - buttons/lightning: contains the Lightning send and receive buttons with their internal logic and state
    - SendModal: Handles UI / State for sending Modal
    - CopyButton: for copying to clipboard
    - ZapBot: For connecting to the MakePrisms Discord ZapBot
    - EcashButtons: Currently in development
###### - Hooks: Custom React hooks for managing state and side effects.
    - useCashu: Handles all of the calls to cashu mint and cashu-ts library. Reads/Writes to localstorage for handling proofs
    - useNwc: Handles the nostr wallet connect and nostr wallet auth flows
    - useToast: Handles simple toast messages for user feedback. Wraps the entire app.
###### - State Management: Global state management using Redux Toolkit.
    - store.ts: Redux Toolkit store for global state management
    - slices/ActivitySlice.ts: Redux Toolkit slice for managing activity state
    - slices/CashuSlice.ts: Redux Toolkit slice for managing cashu state
    - slices/UserSlice.ts: Redux Toolkit slice for managing user state
###### - LocalStorage for persisting user data and allowing user to self custody ecash proofs.
    - localStorage is being called for reads/writes across the app. This is used to store the user's proofs.
    - We are currently working on a more consistent and centralized way to handle this.

### Backend
###### - API Endpoints: RESTful API endpoints facilitating lud16, crud operations on the db, and mint operations such as paying invoices, creating invoices, and checking/exchanging proofs with the mint.
    - /api/callback: Handles the callback for lud16
    - /api/invoice/polling: Handles the polling for any invoice waiting to be paid
    - /api/lnurlp: Handles the lud16 lnurlp flow for paying invoices
    - /api/proofs: Handles all CRUD operations for the user's proofs
    - /api/users: Handles all CRUD operations for the user's data
###### - Database: PostgreSQL database, managed using Prisma ORM, ensuring efficient data handling and integrity.

### Docker Integration
- Docker Containers: Containerization of the frontend and database for consistent development and deployment environments.
- Docker Compose: Simplifies the configuration and management of multi-container Docker applications.

### Contributing

Any contributions you make are greatly appreciated.
- Fork the Project
- Create your Feature Branch (git checkout -b feature/AmazingFeature)
- Commit your Changes (git commit -m 'Add some AmazingFeature')
- Push to the Branch (git push origin feature/AmazingFeature)
- Open a Pull Request

### License

Distributed under the MIT License. See LICENSE for more information.

### Contact

- [https://github.com/gudnuf](https://github.com/gudnuf)
- [https://github.com/austinkelsay](https://github.com/austinkelsay)

Project Link: [https://github.com/makeprisms/quick-cashu](https://github.com/makeprisms/quick-cashu)

### Acknowledgements
- The Cashu Ecosystem
- Cashu-TS
- Calle
- Egge
