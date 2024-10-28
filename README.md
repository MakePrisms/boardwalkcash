# Boardwalk Cash

A Cashu wallet designed for fast, easy onboarding and use

## Table of Contents

-  [Features](#features)
-  [Getting Started](#getting-started)
-  [Prerequisites](#prerequisites)
-  [Installation](#installation)
-  [Contributing](#contributing)
-  [License](#license)
-  [Contact](#contact)
-  [Acknowledgements](#acknowledgements)

## Features

-  **Lightning Integration**: Send and receive Lightning payments
-  **Cashu Ecash Wallet**: Store balance locally as eCash
-  **Contacts**: Add other users as contacts to send and receive eCash without copy/pasting tokens
-  **Profile Pages**: Set a custom username and get eTips at boardwalkcash.com/username
-  **Conditional payments**: Send locked eCash only unlockable by the contact you are sending to
-  **Notifications**: Get notified when someone sends you eCash or adds you as a contact
-  **Transaction History**: Keep track of your payment activities
-  **Cash Taps**: One-tap shareable ecash for easy payments
-  **USD Tokens**: eCash is denominated in USD
-  **Multiple Mints**: Hold eCash in multiple mints at the same time

## Getting Started

These instructions will help you set up a copy of the project on your local machine for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following tools installed:

-  [Docker](https://www.docker.com/)
-  [Docker Compose](https://docs.docker.com/compose/)
-  [Node.js](https://nodejs.org/en/) (if running the Next.js app locally)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/MakePrisms/boardwalkcash.git
   ```

2. Navigate to the project directory:

   ```bash
   cd boardwalkcash
   ```

3. Use Docker Compose to build and run the containers:

   ```bash
   docker-compose up --build
   ```

   Alternatively, if you prefer to run only the database with Docker and use your local Node.js environment for the Next.js app:

   a. Start the database container:

   ```bash
   docker-compose up db
   ```

   b. Install dependencies:

   ```bash
   npm install
   ```

   c. Run the Next.js app:

   ```bash
   npm run dev
   ```

4. Access the application at `http://localhost:3000` in your web browser.

## Contributing

We welcome contributions to Boardwalk Cash! Here's how you can contribute:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [LICENSE](https://github.com/makeprisms/boardwalkcash/blob/main/LICENSE) for more information.

## Contact

-  [https://github.com/gudnuf](https://github.com/gudnuf)
-  [https://github.com/austinkelsay](https://github.com/austinkelsay)

Project Link: [https://github.com/makeprisms/boardwalkcash](https://github.com/makeprisms/boardwalkcash)

## Acknowledgements

-  The Cashu Ecosystem
-  Cashu-TS
-  Calle
-  Egge
