import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

const isProduction = process.env.NODE_ENV === 'production';
const shouldSynchronize = parseBoolean(
  process.env.DATABASE_SYNCHRONIZE,
  !isProduction,
);
const shouldLogQueries = parseBoolean(
  process.env.DATABASE_LOGGING ?? process.env.DB_LOGGING,
  false,
);

/**
 * TypeORM Database Configuration
 * Configured for SQLite with connection pooling
 */
const dataSourceOptions: DataSourceOptions = {
  type: 'sqlite',
  database: path.join(process.cwd(), 'data', 'time-off.db'),
  entities: [path.join(__dirname, '../entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: shouldSynchronize,
  logging: shouldLogQueries ? ['query', 'error', 'warn'] : ['error'],
  logger: 'simple-console',
  extra: {
    busyTimeout: 5000, // 5s timeout for SQLite locks
  },
};

const sqlitePath = dataSourceOptions.database;
if (typeof sqlitePath === 'string') {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
}

export const AppDataSource = new DataSource(dataSourceOptions);

export default dataSourceOptions;
