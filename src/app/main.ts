import inquirer from 'inquirer';
import { clearScreen, showHeader, pauseBeforeContinue } from './ui-utils.js';
import { PrismaClient } from '@prisma/client';
import { getActiveUserKeys } from '../identity.js';
import { createUserFlow, importUserFlow, listUsersFlow, switchUserFlow, deleteUserFlow } from './user-flows.js';
import { createProjectFlow, listProjectsFlow } from './project-flows.js';
import { getProjects, updateProject } from '../project.js';
import { updateTicket } from '../services/ticket.js';
import dotenv from 'dotenv';
import { subscribeToProjectUpdates } from '../nostr/sync.js';
import type { UserKeys } from '../identity.js';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';

const subscriptions: SubCloser[] = [];

// Main application loop
async function main() {
  const prisma = new PrismaClient();
  let running = true;
  let currentProject: string = "";

  // Initialize your application (DB, keys, etc.)
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
      showHeader(userKeys.pubKey, currentProject);

      // Show main menu
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          // User actions
          'Create User',
          'Import User',
          'List Users',
          'Switch User',
          'Delete User',
          // Project actions
          'Create Project',
          'Import Project',
          'List Projects',
          'Switch Project',
          'View Project Hierarchy',
          // Ticket actions
          'Create Epic',
          'Create Ticket',
          // Other actions
          'Sync with Relays',
          'Exit'
        ],
        pageSize: 10
      }]);

      // Handle user action
      switch (action) {
        case 'Create User':
          userKeys = await createUserFlow(prisma);
          break;
        case 'Import User':
          userKeys = await importUserFlow(prisma);
          break;
        case 'List Users':
          await listUsersFlow(prisma);
          break;
        case 'Switch User':
          userKeys = await switchUserFlow(prisma);
          break;
        case 'Delete User':
          userKeys = await deleteUserFlow(prisma);
          break;
        case 'Create Project':
          const current = await createProjectFlow(prisma, userKeys);
          currentProject = current ?? "";
          break;
        case 'List Projects':
          await listProjectsFlow(prisma, userKeys.pubKey);
          break;
        case 'Create Epic':
          //await createEpicFlow();
          break;
        case 'Create Ticket':
          //await createTicketFlow();
          break;
        case 'View Project Hierarchy':
          //await viewProjectHierarchyFlow();
          break;
        case 'Sync with Relays':
          //await syncWithRelays();
          break;
        case 'Exit':
          running = false;
          break;
      }

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

async function initializeApp(prisma: PrismaClient): Promise<UserKeys | null> {
  console.log('Initializing application...');

  // load config
  dotenv.config();
  const relays = process.env['RELAYS']?.split(',') || [];

  // Load user keys
  let userKeys = await getActiveUserKeys(prisma);
  if (!userKeys) {
    console.log('No active user found. Please create or import a user.');
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Create User',
        'Import User',
        'Exit'
      ],
    }]);

    switch (action) {
      case 'Create User':
        userKeys = await createUserFlow(prisma);
        if (!userKeys) return null;
        break;
      case 'Import User':
        userKeys = await importUserFlow(prisma);
        if (!userKeys) return null;
        break;
      case 'Exit':
        return null;
    }
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
        const partial = {
          name: projectEvent.id,
        }
        updateProject(prisma, projectEvent.id, partial);
      },
      (ticketEvent) => {
        // TODO all of these need to be converted from nostr events....
        const partial = {
          title: ticketEvent.id,
        }
        updateTicket(prisma, ticketEvent.id, partial);
      },
      (membershipEvent) => {
        // TODO all of these need to be converted from nostr events....
        const partial = {
          name: membershipEvent.id,
        }
        updateProject(prisma, membershipEvent.id, partial);
      }
    );
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
