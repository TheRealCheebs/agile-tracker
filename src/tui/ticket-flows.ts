import inquirer from 'inquirer';

export async function mainTicketsFlow(prisma: PrismaClient, userKeys: UserKeys, projectUuid: string) {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Ticket Actions:',
      choices: [
        'Create Ticket',
        'Back to Main Menu',
      ],
    },
  ]);

  switch (action) {
    case 'Create Ticket':
      console.log('Creating ticket...');
      break;
    case 'Back to Main Menu':
      break;
  }
}

