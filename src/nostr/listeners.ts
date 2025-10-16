/* import chalk from 'chalk';
import { getTickets } from './ticket.js';
import { subscribeToTicketUpdates, verifyEventAuth } from './nostr.js' */;
import { PrismaClient } from '@prisma/client';

export function startNostrListener(prisma: PrismaClient) {
/*   console.log(chalk.blue('Listening for Nostr updates...'));
  getTickets(prisma).then(tickets => {
    if (tickets.length > 0) {
      const ticket = tickets[0]!;
      const unsub = subscribeToTicketUpdates(ticket.uuid, (event) => {
        if (verifyEventAuth(event, ticket.owner_pubkey)) {
          console.log(
            chalk.magenta(`Update received for ${ticket.uuid}: ${event.content}`)
          );
        }
      });
      process.on('SIGINT', () => {
        unsub();
        process.exit();
      });
    }
  }) */;
}