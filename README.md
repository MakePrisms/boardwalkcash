# QuickCashU

An open-source Lightning / Cashu Ecash wallet designed for fast easy onboarding and use

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

### Architecture

quickcashu is designed with a modular and scalable architecture. Below is an overview of its main components:

### Frontend
- Framework: Built with Next.js and TypeScript for robust and scalable web applications.
- Components: Reusable UI components for a consistent and intuitive user interface.
- Hooks: Custom React hooks for managing state and side effects, ensuring optimal performance and code reusability.

### Backend
- API Endpoints: RESTful API endpoints facilitating mint operations such as paying invoices, creating invoices, and checking/exchanging proofs with the mint.
- Database: PostgreSQL database, managed using Prisma ORM, ensuring efficient data handling and integrity.

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

[https://github.com/gudnuf](https://github.com/gudnuf)
[https://github.com/austinkelsay](https://github.com/austinkelsay)

Project Link: [https://github.com/makeprisms/quickcashu](https://github.com/makeprisms/quickcashu)

### Acknowledgements
- The Cashu Ecosystem
- Cashu-TS
- Calle
- Egge
