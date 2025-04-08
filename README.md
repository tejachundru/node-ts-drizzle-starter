# Starter Node TS Drizzle

A modern, scalable Backend system built with TypeScript, Express, and Drizzle ORM.

## Features

- 🔐 **Authentication & Authorization**: Secure role-based access control system
- 📊 **Database Management**: PostgreSQL with Drizzle ORM for type-safe database operations
- 🌐 **RESTful API**: Well-structured API endpoints with comprehensive documentation
- 📁 **File Storage**: S3 integration for secure file management
- 📧 **Email Notifications**: Built-in email service with Nodemailer
- 🛡️ **Security**: CORS, rate limiting, and other security best practices
- 📝 **Documentation**: API documentation with Redoc
- 🔄 **Database Migrations**: Automated migrations with Drizzle Kit

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **API Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Authentication**: JWT, Argon2/Bcrypt
- **Documentation**: OpenAPI / Redoc
- **Logging**: Pino
- **File Storage**: AWS S3
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js (v16+) or Bun runtime
- PostgreSQL database
- Environment variables (see below)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd starter
```

2. Install dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using bun
bun install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations

```bash
npm run db:migrate
# or
bun run db:migrate
```

5. Start the development server

```bash
# Using npm
npm run dev:watch

# Using bun
bun run dev:watch
```

### Docker Setup

Run the application using Docker:

```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.prod.yml up -d
```

## Database Management

```bash
# Generate migrations based on schema changes
npm run db:generate

# Apply migrations to the database
npm run db:migrate

# Run the Drizzle Studio UI to view/edit data
npm run run-studio
```

## Available Scripts

- `npm run build`: Build the project
- `npm run dev`: Build and start the server
- `npm run dev:watch`: Start the server with hot-reloading
- `npm run typecheck`: Run TypeScript type checking
- `npm run lint`: Run ESLint
- `npm run db:generate`: Generate database migrations
- `npm run db:migrate`: Apply database migrations
- `npm run run-studio`: Run Drizzle Studio UI
- `npm run deploy:pm2`: Deploy with PM2
- `npm run serve:production`: Run in production mode

## Project Structure

```
src/
├── app/               # Application logic
│   ├── controller/    # Route controllers
│   ├── routes/        # API route definitions
│   ├── schema/        # Data validation schemas
│   ├── service/       # Business logic services
│   └── types/         # TypeScript type definitions
├── config/            # Configuration files
├── core/              # Core functionality
│   ├── constants/     # Application constants
│   └── modules/       # Reusable modules
├── db/                # Database related code
│   └── schema/        # Database schema definitions
├── docs/              # API documentation
├── hooks/             # Custom hooks
├── middleware/        # Express middleware
└── utils/             # Utility functions
```

## API Documentation

After starting the server, visit `/api-docs` to view the interactive API documentation.

## License

This project is licensed under the MIT License.
