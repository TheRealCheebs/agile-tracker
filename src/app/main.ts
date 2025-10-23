import inquirer from 'inquirer';
import { PrismaClient } from '@prisma/client';
import { getActiveUserKeys } from '@services/prisma/identity.js';

import { mainUsersFlow, noUserFlow } from '@tui/user-flows.js';
import { mainProjectsFlow } from '@tui/project-flows.js';
import { mainTicketsFlow } from '@tui/ticket-flows.js';
import { mainSettingsFlow } from '@tui/settings-flows.js';
import { clearScreen, showHeader, pauseBeforeContinue } from '@tui/ui-utils.js';

import { getProjects, updateProject } from '@services/prisma/project.js';
import { updateTicket } from '@services/prisma/ticket.js';
import { subscribeToProjectUpdates } from '../nostr/sync.js';
import { listRelays } from '../settings.js';
import { initNostr } from '../nostr/utils.js';

import type { UserKeys } from '@interfaces/identity.js';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';

const subscriptions: SubCloser[] = [];

// Main application loop
async function main() {
  const prisma = new PrismaClient();
  let running = true;
  let currentProject: string = "";

  let userKeys = await initializeApp(prisma);

  while (running) {
    try {
      // at this point there should always be userkeys loaded
      if (!userKeys) {
        console.log('Error loading user keys, exiting application.');
        return;
      }
      // Clear screen and show header
      clearScreen();
      // TODO: list the users name
      showHeader(userKeys.pubKey, currentProject);
      [userKeys, currentProject, running] = await mainMenu(prisma, userKeys, currentProject);

      // Pause before returning to menu (except for exit)
      if (running) {
        await pauseBeforeContinue();
      }

    } catch (error) {
      console.error('An error occurred:', error);
      await pauseBeforeContinue();
    }
  }

  // Cleanup before exit
  await cleanup();
  console.log('\n👋 Goodbye!');
}

async function mainMenu(prisma: PrismaClient, userKeys: UserKeys, currentProjectUuid: string): Promise<[UserKeys, string, boolean]> {
  let keepRunning = true;

  const { category } = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select a category:',
      choices: [
        'Users',
        'Projects',
        'Tickets',
        'Settings',
        'Exit',
      ],
    },
  ]);

  switch (category) {
    case 'Users':
      userKeys = await mainUsersFlow(prisma);
      break;
    case 'Projects':
      currentProjectUuid = await mainProjectsFlow(prisma, userKeys);
      break;
    case 'Tickets':
      await mainTicketsFlow(prisma, userKeys, currentProjectUuid);
      break;
    case 'Settings':
      await mainSettingsFlow();
      break;
    case 'Exit':
      keepRunning = false;
  }
  return [userKeys, currentProjectUuid, keepRunning];
}


async function initializeApp(prisma: PrismaClient): Promise<UserKeys | null> {
  console.log('Initializing application...');

  // load config
  const relays = await listRelays();
  initNostr(relays).catch((error) => {
    // we need to set offline mode or something here.
    console.error('Error initializing Nostr:', error);
  });

  // Load user keys
  let userKeys = await getActiveUserKeys(prisma);
  if (!userKeys) {
    userKeys = await noUserFlow(prisma);
  }

  // use the list projects to iterate through and subscribe to all current projects
  const projects = await getProjects(prisma, userKeys!.pubKey);
  projects.forEach(project => {
    const sub: SubCloser = subscribeToProjectUpdates(
      relays,
      project.uuid,
      Date.now(),
      (projectEvent) => {
        // TODO all of these need to be converted from nostr events....
        updateProject(prisma, projectEvent);
      },
      (ticketEvent) => {
        // TODO all of these need to be converted from nostr events....
        const partial = {
          title: ticketEvent.id,
        }
        updateTicket(prisma, ticketEvent.id, partial);
      },
    );
    // TODO: save these subscriptions to the database? so they can be loaded on startup.
    subscriptions.push(sub);
  })

  // Any other initialization tasks
  console.log('✅ Application initialized');
  return userKeys;
}

async function cleanup() {
  console.log('Cleaning up...');

  subscriptions.forEach(sub => {
    sub.close();
  });

  // Optionally clear the subscriptions array
  subscriptions.length = 0;
  // Any other cleanup tasks
  console.log('✅ Cleanup complete');
}


// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
