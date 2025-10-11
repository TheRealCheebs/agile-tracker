import inquirer from 'inquirer';
import { clearScreen, showHeader, pauseBeforeContinue } from './ui-utils.js';
import { PrismaClient } from '@prisma/client';
import { getActiveUserKeys } from '../identity.js';
import { createUserFlow, importUserFlow, listUsersFlow, switchUserFlow, deleteUserFlow } from './user-flows.js';
import { createProjectFlow } from './project-flows.js';
import type { UserKeys } from '../identity.js';

// Main application loop
async function main() {
  const prisma = new PrismaClient();
  let running = true;
  let currentProject: string | null = null;
  
  showHeader();
  // Initialize your application (DB, keys, etc.)
  let userKeys = await initializeApp(prisma);
  if (!userKeys) {
    console.log('Error loading user keys, exiting application.');
    return;
  }
  
  while (running) {
    try {
      // Clear screen and show header
      clearScreen();
      showHeader();
      
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
          currentProject = await createProjectFlow(prisma, userKeys);
          break;
        case 'List Projects':
          //await listProjectsFlow();
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

async function initializeApp(prisma: PrismaClient): Promise< UserKeys | null> {
  console.log('Initializing application...');
  
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
        break;
      case 'Import User':
        userKeys = await importUserFlow(prisma);
        break;
      case 'Exit':
        return null;
    }
  }
  
  
  // Any other initialization tasks
  console.log('✅ Application initialized');
  return userKeys;
}

async function cleanup() {
  console.log('Cleaning up...');
  
  // Any other cleanup tasks
  console.log('✅ Cleanup complete');
}

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});