import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const client = new PrismaClient({ adapter });
console.log('aiModel type:', typeof client.aiModel);
console.log('chatSession type:', typeof client.chatSession);
await client.$disconnect();
