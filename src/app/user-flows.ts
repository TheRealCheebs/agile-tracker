import inquirer from 'inquirer';
import chalk from 'chalk';
import { createIdentity, importIdentity, getPrivateKey, getAllIdentities, setActiveIdentityByName, removeIdentityByKey } from '../identity.js';
import { PrismaClient } from '@prisma/client';
import type { Identity as PrismaIdentity } from '@prisma/client';
import type { UserKeys } from '../identity.js';

export async function createUserFlow(prisma: PrismaClient): Promise<UserKeys | null> {
  console.log('\n📋 Create New User\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'User name:',
      validate: input => input.trim() !== '' || 'User name is required'
    }
  ]);

  const identity = await createIdentity(prisma, answers.name);
  if (!identity) {
    console.log(chalk.red('Failed to create user'));
    return null;
  }

  console.log(chalk.green(`User created: ${identity.name} (${identity.pubkey})`));
  const userPubkey = identity.pubkey;
  const userPrivateKey = await getPrivateKey(userPubkey)
  if (!userPrivateKey) {
    return null;
  }

  return { pubKey: userPubkey, privateKey: userPrivateKey }
}

export async function importUserFlow(prisma: PrismaClient): Promise<UserKeys | null> {
  console.log('\n📋 Import User\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'User name:',
      validate: input => input.trim() !== '' || 'User name is required'
    },
    {
      type: 'input',
      name: 'privateKey',
      message: 'private key: nsec',
      validate: input => input.trim() !== '' || 'private key is required'
    }
  ]);

  const identity = await importIdentity(prisma, answers.name, answers.privateKey);
  if (!identity) {
    console.log(chalk.red('Failed to import user'));
    return null;
  }

  console.log(chalk.green(`User imported: ${identity.name} (${identity.pubkey})`));
  const userPubkey = identity.pubkey;
  const userPrivateKey = await getPrivateKey(userPubkey)
  if (!userPrivateKey) {
    return null;
  }

  return { pubKey: userPubkey, privateKey: userPrivateKey }
}

export async function listUsersFlow(prisma: PrismaClient): Promise<void> {
  console.log('\n👥 List Users\n');
  getAllIdentities(prisma).then((identities: PrismaIdentity[]) => {
    if (identities.length === 0) {
      console.log(chalk.yellow('No users found'));
      return;
    }
    console.log(chalk.bold.blue('Users:'));
    identities.forEach((identity: PrismaIdentity) => {
      const activeMarker = identity.is_active ? chalk.green(' (active)') : '';
      console.log(`${chalk.cyan(identity.name)} | ${identity.pubkey}${activeMarker}`);
    });
  });
}

export async function switchUserFlow(prisma: PrismaClient): Promise<UserKeys | null> {
  const identities = await getAllIdentities(prisma);
  if (identities.length === 0) {
    console.log(chalk.yellow('No users found'));
    return null;
  }
  const choices = identities.map(identity => ({
    name: `${identity.name} (${identity.pubkey})${identity.is_active ? ' (active)' : ''}`,
    value: identity.name
  }));

  const { name } = await inquirer.prompt([
    {
      type: 'list',
      name: 'name',
      message: 'Select a user to switch to:',
      choices
    }
  ]);

  const identity = await setActiveIdentityByName(prisma, name);
  if (identity) {
    console.log(chalk.green(`Switched to user: ${identity.name} (${identity.pubkey})`));
    const userPrivateKey = await getPrivateKey(identity.pubkey);
    if (!userPrivateKey) return null;
    return { pubKey: identity.pubkey, privateKey: userPrivateKey };
  } else {
    console.log(chalk.red('User not found'));
    return null;
  }
}

export async function deleteUserFlow(prisma: PrismaClient): Promise<UserKeys | null> {
  const identities = await getAllIdentities(prisma);
  if (identities.length === 0) {
    // this shouldn't be possible, but just in case
    console.log(chalk.yellow('No users found. You must create or import a user.'));
    return null;
  }
  const choices = identities.map(identity => ({
    name: `${identity.name} (${identity.pubkey})${identity.is_active ? ' (active)' : ''}`,
    value: identity.pubkey
  }));

  const { pubkey } = await inquirer.prompt([
    {
      type: 'list',
      name: 'pubkey',
      message: 'Select a user to delete:',
      choices
    }
  ]);

  const identity = identities.find(i => i.pubkey === pubkey);
  if (!identity) {
    console.log(chalk.red('User not found.'));
    return null;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete user ${identity.name} (${identity.pubkey})?`,
      default: false
    }
  ]);
  if (!confirm) {
    console.log(chalk.yellow('User deletion cancelled.'));
    return null;
  }

  // Delete the user (implement deleteIdentity in your identity module)
  const deleted = await removeIdentityByKey(prisma, pubkey);
  if (!deleted) {
    console.log(chalk.red('Failed to delete user.'));
    return null;
  }
  console.log(chalk.green(`User deleted: ${identity.name} (${identity.pubkey})`));

  // Get remaining users
  const remaining = await getAllIdentities(prisma);
  if (remaining.length === 0) {
    console.log(chalk.yellow('No users left. You must create or import a new user.'));
    // Optionally, call createUserFlow or importUserFlow here
    return null;
  }

  // Force user to select a new active user
  const newChoices = remaining.map(i => ({
    name: `${i.name} (${i.pubkey})${i.is_active ? ' (active)' : ''}`,
    value: i.name
  }));
  const { name: newName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'name',
      message: 'Select a user to set as active:',
      choices: newChoices
    }
  ]);
  const newIdentity = await setActiveIdentityByName(prisma, newName);
  if (newIdentity) {
    console.log(chalk.green(`Switched to user: ${newIdentity.name} (${newIdentity.pubkey})`));
    const userPrivateKey = await getPrivateKey(newIdentity.pubkey);
    if (!userPrivateKey) return null;
    return { pubKey: newIdentity.pubkey, privateKey: userPrivateKey };
  } else {
    console.log(chalk.red('Failed to set new active user.'));
    return null;
  }
}
