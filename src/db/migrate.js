#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Umzug, SequelizeStorage } = require('umzug');

dotenv.config();

const { sequelize } = require('./sequelize');

const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
fs.mkdirSync(migrationsDir, { recursive: true });

const umzug = new Umzug({
  migrations: {
    glob: path.join(migrationsDir, '*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'analytics_migrations' }),
  logger: console,
});

async function main() {
  const undo = process.argv.includes('--undo');
  const reset = process.argv.includes('--reset');

  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error('DB connection failed:', error.message);
    process.exitCode = 2;
    return;
  }

  if (reset) {
    console.warn('RESET requested: dropping all tables in analytics database...');
    const qi = sequelize.getQueryInterface();
    await qi.dropAllTables();
    console.warn('All tables dropped.');
  }

  if (undo) {
    await umzug.down({ to: 0 });
    console.log('Migrations reverted.');
    return;
  }

  await umzug.up();
  console.log('Migrations applied.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
