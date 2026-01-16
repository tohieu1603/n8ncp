import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User, UsageLog, ApiKey, Payment, EmailVerification } from './entities'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'imagegen',
  password: process.env.DB_PASSWORD || 'imagegen123',
  database: process.env.DB_DATABASE || 'imagegen',
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  entities: [User, UsageLog, ApiKey, Payment, EmailVerification],
  migrations: [],
  subscribers: [],
})
