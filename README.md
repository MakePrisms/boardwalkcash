# QuickCashU

Welcome to QuickCashU, an open-source Lightning / Cashu Ecash wallet designed for fast, secure, and user-friendly digital transactions. This wallet utilizes the power of the Lightning Network and the flexibility of Cashu to offer an enhanced digital currency experience. Built with Next.js and TypeScript, QuickCashU aims to deliver a robust and scalable solution for cryptocurrency enthusiasts.

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
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
- [PostgreSQL](https://www.postgresql.org/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/quickcashu.git
```
2. Navigate to the project directory:

    ```bash
    cd quickcashu
    ```

3. Use Docker Compose to build and run the containers:

    ```bash
    docker-compose up --build
    ```

### Usage

After installation, you can start using QuickCashU for sending and receiving digital currency securely and efficiently. Refer to the documentation for more detailed usage instructions.

### Architecture

QuickCashU is designed with a modular and scalable architecture. Below is an overview of its main components:

### Frontend
- Framework: Built with Next.js and TypeScript for robust and scalable web applications.
- Components: Reusable UI components for a consistent and intuitive user interface.
- Hooks: Custom React hooks for managing state and side effects, ensuring optimal performance and code reusability.

### Backend
- API Endpoints: RESTful API endpoints facilitating wallet operations such as balance inquiries, transaction history, and fund transfers.
- Database: PostgreSQL database, managed using Prisma ORM, ensuring efficient data handling and integrity.
- Authentication: Secure user authentication mechanisms for protecting user data and transactions.

### Docker Integration
- Docker Containers: Containerization of the frontend and database for consistent development and deployment environments.
- Docker Compose: Simplifies the configuration and management of multi-container Docker applications.

### Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.
- Fork the Project
- Create your Feature Branch (git checkout -b feature/AmazingFeature)
- Commit your Changes (git commit -m 'Add some AmazingFeature')
- Push to the Branch (git push origin feature/AmazingFeature)
- Open a Pull Request

### License

Distributed under the MIT License. See LICENSE for more information.

### Contact

Your Name - email@example.com

Project Link: [https://github.com/makeprisms/quickcashu](https://github.com/makeprisms/quickcashu)

### Acknowledgements
- The Cashu Ecosystem
- Cashu-TS
- Calle
- Egge
