import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.resolve(__dirname, '../modules/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, '../database/migrations/*{.ts,.js}')],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
