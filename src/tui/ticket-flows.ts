import inquirer from 'inquirer';
import { createTicket } from '@services/ticket.js';
import { saveNewTicket, updateTicket } from '@services/prisma/ticket';
import { createAndPublishPrivateTicket, createAndPublishTicket } from '@services/nostr/ticket';
import { updateAndPublishPrivateProject, updateAndPublishProject } from '@services/nostr/projects';
import { getProjectById, prismaToProject, updateProject } from '@services/prisma/project';
import { PrismaClient } from '@prisma/client';
import type { UserKeys } from '@interfaces/identity';

export async function mainTicketsFlow(prisma: PrismaClient, userKeys: UserKeys, projectUuid: string) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Ticket Actions:',
      choices: [
        'Create Ticket',
        'Edit Ticket',
        'Delete Ticket',
        'Move Ticket',
        'List Tickets',
        'Back to Main Menu',
      ],
    },
  ]);

  switch (action) {
    case 'Create Ticket':
      // in public project start state is unverified, or member in private
      await createTicketFlow(prisma, userKeys, projectUuid);
      console.log('Creating ticket...');
      break;
    case 'Edit Ticket':
      // must be admin in public project, or member in private
      console.log('Edit ticket...');
      break;
    case 'Delete Ticket':
      // must be admin in public project, or member in private
      console.log('Delete ticket...');
      break;
    case 'Move Ticket':
      // must be admin in public project, or member in private
      console.log('Move ticket...');
      break;
    case 'List Tickets':
      console.log('List ticket...');
      break;
    case 'Back to Main Menu':
      break;
  }
}

async function createTicketFlow(prisma: PrismaClient, userKeys: UserKeys, projectUuid: string): Promise<string | null> {
  console.log('\n📋 Create New Ticket\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Ticket title:',
      validate: input => input.trim() !== '' || 'Title is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):'
    },
    {
      type: 'input',
      name: 'type',
      message: 'Type (Feature | Bug | Epic | Chore):'
    },
    {
      type: 'input',
      name: 'parent',
      message: 'Parent Ticket UUID (optional):'
    },
    {
      type: 'input',
      name: 'children',
      message: 'Children Ticket UUID (optional):'
    },
  ]);

  const pproject = await getProjectById(prisma, projectUuid);
  // project should exist but check.
  if (!pproject) {
    console.error('\n❌ Failed to find the project');
    return null
  }
  const project = prismaToProject(pproject);
  try {
    const ticket = createTicket(
      project.uuid,
      answers.type,
      answers.title,
      answers.description,
      userKeys.pubKey,
      answers.parent
    );

    saveNewTicket(prisma, ticket);
    try {
      if (project.isPrivate) {
        const privateEvent = await createAndPublishPrivateTicket(ticket, userKeys, project.members);
        ticket.lastEventId = privateEvent.id;
        ticket.lastEventCreatedAt = privateEvent.created_at;
        ticket.updatedAt = privateEvent.created_at;
        // update the project to include the new ticket.
        project.tickets.push(ticket.uuid);
        const privateProject = await updateAndPublishPrivateProject(project, userKeys, project.members, ticket.uuid, 'ticket');
        project.lastEventId = privateProject.id;
        project.lastEventCreatedAt = privateProject.created_at;
      } else {
        const event = await createAndPublishTicket(ticket, userKeys);
        ticket.lastEventId = event.id;
        ticket.lastEventCreatedAt = event.created_at;
        ticket.updatedAt = event.created_at;
        // update the project to include the new ticket.
        project.tickets.push(ticket.uuid);
        const updatedProject = await updateAndPublishProject(project, userKeys, ticket.uuid, 'ticket');
        project.lastEventId = updatedProject.id;
        project.lastEventCreatedAt = updatedProject.created_at;
      }
      updateTicket(prisma, ticket);
      updateProject(prisma, project);
    } catch (relayError) {
      console.warn(" Failed to send ticket to relay:", relayError)
    }
    console.log(`\n✅ Ticket created successfully!`);
    console.log(`   UUID: ${ticket.uuid}`);
    return project.uuid;
  } catch (error) {
    console.error('\n❌ Failed to create ticket:', error);
  }
  return null

}
