// flows.ts
import inquirer from 'inquirer';
import { PrismaClient } from '@prisma/client';

import { createProject } from '../services/project.ts';
import { saveNewProject, getProjects } from '../services/prisma/project.js';
import { createAndPublishPrivateProject, createAndPublishProject } from '../services/nostr/projects.js';

import type { Project as PrismaProject } from '@prisma/client';
import type { UserKeys } from '../interfaces/identity';

export async function mainProjectsFlow(prisma: PrismaClient, userKeys: UserKeys): Promise<string> {
  let projectUuid: string = "";

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Project Actions:',
      choices: [
        'Create Project',
        'Import Project',
        'List Projects',
        'Switch Project',
        'View Project Hierarchy',
        'Back to Main Menu',
      ],
    },
  ]);

  switch (action) {
    case 'Create Project':
      const created = await createProjectFlow(prisma, userKeys);
      projectUuid = created ?? "";
      break;
    case 'Import Project':
      console.log('Importing project...');
      break;
    case 'List Projects':
      await listProjectsFlow(prisma, userKeys.pubKey);
      break;
    case 'Switch Project':
      const switched = await switchProjectsFlow(prisma, userKeys.pubKey);
      if (switched !== "") {
        projectUuid = switched;
      }
      break;
    case 'View Project Hierarchy':
      console.log('Viewing project hierarchy...');
      break;
    case 'Back to Main Menu':
      break;
  }
  return projectUuid;
}

async function createProjectFlow(prisma: PrismaClient, userKeys: UserKeys): Promise<string | null> {
  console.log('\n📋 Create New Project\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: input => input.trim() !== '' || 'Project name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description (optional):'
    },
    {
      type: 'confirm',
      name: 'isPrivate',
      message: 'Make this project private?',
      default: false
    },
    // TODO: do this better
    {
      type: 'input',
      name: 'adminUsers',
      message: 'Add users with admin roles (comma-separated public keys, optional):'
    },
    {
      type: 'input',
      name: 'memberUsers',
      message: 'Add users with read only roles, if project is private. (comma-separated public keys, optional):'
    }
  ]);

  let members: { pubkey: string, role?: string }[] = [];
  if (answers.adminUsers) {
    const admin = answers.adminUsers.split(',').map((pubkey: string) => ({ pubkey: pubkey.trim(), role: 'admin' }));
    members = members.concat(admin)
  }
  if (answers.memberUsers) {
    const users = answers.memberUsers.split(',').map((pubkey: string) => ({ pubkey: pubkey.trim(), role: 'member' }));
    members = members.concat(users)
  }

  try {
    const project = createProject(
      answers.name,
      userKeys.pubKey,
      answers.description,
      answers.isPrivate,
      members
    );

    saveNewProject(prisma, project);
    if (project.isPrivate) {
      createAndPublishPrivateProject(project, userKeys, project.members);
    } else {
      createAndPublishProject(project, userKeys);
    }
    console.log(`\n✅ Project created successfully!`);
    console.log(`   UUID: ${project.uuid}`);
    return project.uuid;
  } catch (error) {
    console.error('\n❌ Failed to create project:', error);
  }
  return null
}

export async function listProjectsFlow(prisma: PrismaClient, pubkey: string) {
  console.log('\n📂 Projects\n');

  const projects = await getProjects(prisma, pubkey);

  if (projects.length === 0) {
    console.log('No projects found.');
    return;
  }

  console.table(projects.map(p => ({
    ID: p.uuid.slice(0, 8),
    Name: p.name,
    Private: p.is_private ? 'Yes' : 'No'
  })));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select an action:',
    choices: [
      'View Details',
      'Back to Main Menu'
    ]
  }]);

  if (action === 'View Details') {
    const { project_uuid } = await inquirer.prompt([{
      type: 'list',
      name: 'project_uuid',
      message: 'Select a project:',
      choices: projects.map((project) => ({
        name: project.name,
        value: project.uuid,
      })),
    },
    ]);

    const project = projects.find((p) => p.uuid === project_uuid);
    if (project) {
      await showProjectDetails(project);
    }
  }
}

export async function switchProjectsFlow(prisma: PrismaClient, pubkey: string): Promise<string> {
  console.log('\n📂 Projects\n');

  const projects = await getProjects(prisma, pubkey);

  if (projects.length === 0) {
    console.log('No projects found.');
    return "";
  }

  console.table(projects.map(p => ({
    ID: p.uuid.slice(0, 8),
    Name: p.name,
    Private: p.is_private ? 'Yes' : 'No'
  })));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Select an action:',
    choices: [
      'Select Project',
      'Back to Main Menu'
    ]
  }]);

  if (action === 'Back to Main Menu') {
    console.log('Action Canceled, not switching.');
    return "";
  }

  const { project_uuid } = await inquirer.prompt([{
    type: 'list',
    name: 'project_uuid',
    message: 'Select a project:',
    choices: projects.map((project) => ({
      name: project.name,
      value: project.uuid,
    })),
  },
  ]);
  return project_uuid;
}

// TODO, fix all of the prisma stuff in here, just have it be the project.
async function showProjectDetails(project: PrismaProject) {
  console.log('\n📋 Project Details\n');
  console.log(`Name: ${project.name}`);
  console.log(`UUID: ${project.uuid}`);
  console.log(`Private: ${project.is_private ? 'Yes' : 'No'}`);

  if (project.description) {
    console.log(`\nDescription:\n${project.description}`);
  }

  // Show project members, epics, tickets, etc.
  // ...
}
