// flows.ts
import inquirer from 'inquirer';
import { createProject } from '../project.js';
import { PrismaClient } from '@prisma/client';
import type { Identity as PrismaIdentity } from '@prisma/client';
import type { UserKeys } from '../identity';

export async function createProjectFlow(prisma: PrismaClient, userKeys: UserKeys) {
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
    }
    {
      type: 'input',
      name: 'memberUsers',
      message: 'Add users with read only roles, if project is private. (comma-separated public keys, optional):'
    }
  ]);
  
  if (answers.adminUsers) {
    const userPubkeys = answers.adminUsers.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
    // You can add logic here to verify the public keys exist in your system
    console.log(`Adding users: ${userPubkeys.join(', ')}`);
    // Pass userPubkeys to createProject if needed
  }
  if (answers.memberUsers) {
    const userPubkeys = answers.memberUsers.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
    // You can add logic here to verify the public keys exist in your system
    console.log(`Adding users: ${userPubkeys.join(', ')}`);
    // Pass userPubkeys to createProject if needed
  }

  try {
    const projectUuid = await createProject(
      prisma,
      answers.name,
      answers.description,
      answers.isPrivate,
        userKeys.pubkey,
    );
    
    console.log(`\n✅ Project created successfully!`);
    console.log(`   UUID: ${projectUuid}`);
  } catch (error) {
    console.error('\n❌ Failed to create project:', error);
  }
}

export async function listProjectsFlow() {
  console.log('\n📂 Projects\n');
  
  const projects = await listProjects();
  
  if (projects.length === 0) {
    console.log('No projects found.');
    return;
  }
  
  console.table(projects.map(p => ({
    ID: p.uuid.slice(0, 8),
    Name: p.name,
    Private: p.is_private ? 'Yes' : 'No',
    Created: new Date(p.created_at).toLocaleDateString()
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
    const { projectId } = await inquirer.prompt([{
      type: 'input',
      name: 'projectId',
      message: 'Enter project UUID (first 8 characters):',
      validate: input => {
        const project = projects.find(p => p.uuid.startsWith(input));
        return project || 'Project not found';
      }
    }]);
    
    const project = projects.find(p => p.uuid.startsWith(projectId));
    if (project) {
      await showProjectDetails(project);
    }
  }
}

async function showProjectDetails(project: any) {
  console.log('\n📋 Project Details\n');
  console.log(`Name: ${project.name}`);
  console.log(`UUID: ${project.uuid}`);
  console.log(`Private: ${project.is_private ? 'Yes' : 'No'}`);
  console.log(`Created: ${new Date(project.created_at).toLocaleString()}`);
  
  if (project.description) {
    console.log(`\nDescription:\n${project.description}`);
  }
  
  // Show project members, epics, tickets, etc.
  // ...
}