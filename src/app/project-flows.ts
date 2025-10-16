// flows.ts
import inquirer from 'inquirer';
import { createProject, getProjects } from '../project.js';
import { PrismaClient } from '@prisma/client';
import type { Project as PrismaProject } from '@prisma/client';
import type { UserKeys } from '../identity';

export async function createProjectFlow(prisma: PrismaClient, userKeys: UserKeys): Promise<string | null> {
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
    const projectUuid = await createProject(
      prisma,
      answers.name,
      userKeys.pubKey,
      answers.description,
      answers.isPrivate,
      members
    );

    console.log(`\n✅ Project created successfully!`);
    console.log(`   UUID: ${projectUuid}`);
    return projectUuid.uuid;
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
