# Agile Tracker with Nostr

A command-line agile project tracker inspired by Pivotal Tracker, built with TypeScript, SQLite for local storage, and Nostr for decentralized status sharing.

## Features

- Create, update, delete, and list tickets
- Real-time status updates via Nostr protocol
- Authorization using Nostr cryptographic signatures
- Local SQLite database for persistence
- Terminal-based interface (CLI)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agile-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Running Tests

To run the test suite:
```bash
npm test
```

For watch mode:
```bash
npm run test:watch
```

For test coverage:
```bash
npm run test:coverage
```

## Usage

The CLI provides several commands to manage your agile project.


### CLI Usage

Run the CLI (TypeScript, using tsx):
```bash
npm run cli -- <command>
```

#### User Commands

- `user add --name <name>`: Add a new user/identity
- `user list`: List all users
- `user set-active --name <name>`: Set a user as active
- `user remove --name <name>`: Remove a user by name

#### Ticket Commands

- `ticket list [--status <status>]`: List all tickets or filter by status
- `ticket add`: Add a new ticket (prompts for title/description)
- `ticket update`: Update a ticket's status (prompts for ticket and status)
- `ticket delete`: Delete a ticket (prompts for ticket)

Example:
```bash
npm run cli -- user add --name Alice
npm run cli -- ticket list --status started
```

## Architecture

- **TypeScript**: The entire project is written in TypeScript for type safety and modern JavaScript features.
- **SQLite**: Tickets are stored locally in a SQLite database (`tracker.db`).
- **Nostr**: Status updates are shared via the Nostr protocol. Each update is signed with the user's private key to ensure authorization.

### Database Schema

The `tickets` table has the following columns:

- `id`: Primary key (auto-increment)
- `uuid`: Unique identifier for the ticket (UUID)
- `title`: Ticket title
- `description`: Ticket description (optional)
- `status`: Current status (backlog, started, finished, delivered, accepted, rejected)
- `assignee`: Assigned user (optional)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `owner_pubkey`: Nostr public key of the ticket owner

### Nostr Integration

- **Event Kind**: Custom event kind `30402` is used for ticket updates.
- **Tags**: Each event includes:
  - `d`: The ticket UUID
  - `status`: The new status
- **Authorization**: Only the ticket owner (identified by their public key) can publish updates for a ticket. Updates are verified using the signature.

## Development

To run the project in development mode (using `ts-node`):

```bash
npm run dev
```

## Project Structure

```
agile-tracker/
├── src/
│   ├── __tests__/            # Test files
│   ├── cli/
│   │   ├── index.ts          # CLI entry point
│   │   ├── userCommands.ts   # User/identity CLI commands
│   │   └── ticketCommands.ts # Ticket CLI commands
│   ├── identity.ts           # Identity/user logic
│   ├── ticket.ts             # Ticket model and operations
│   ├── nostr.ts              # Nostr protocol integration
│   └── index.ts              # (optional) App entry point
├── prisma/
│   ├── schema.prisma         # Prisma schema
│   └── dev.db                # SQLite database
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies and scripts
├── README.md                 # This file
└── tsconfig.json             # TypeScript configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT
