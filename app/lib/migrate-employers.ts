import { getAllEmployers, addEmployer } from '../lib/db';

export async function migrateEmployers() {
  try {
    const existingEmployers = getAllEmployers();
    if (existingEmployers.length > 0) {
      console.log('Employers already migrated');
      return;
    }

    // Get employers from env
    const employersEnv = process.env.EMPLOYERS;
    if (!employersEnv) {
      console.log('No EMPLOYERS env variable found');
      return;
    }

    const employers = JSON.parse(employersEnv);
    console.log(`Migrating ${employers.length} employers to database...`);

    for (const employer of employers) {
      addEmployer(employer);
    }

    console.log('Employer migration completed');
  } catch (error) {
    console.error('Error migrating employers:', error);
  }
}