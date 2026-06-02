import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const dbUrl = process.env.DATABASE_URL ?? '';
    // Railway's public Postgres URL contains sslmode=require; the internal
    // *.railway.internal URL does not. Only disable cert verification when
    // the URL explicitly demands SSL — forcing SSL on internal connections
    // causes an immediate TLS negotiation failure and kills the connection.
    const sslRequired = /[?&]sslmode=(require|verify-ca|verify-full)/.test(dbUrl);
    const adapter = new PrismaPg({
      connectionString: dbUrl,
      ...(sslRequired && { ssl: { rejectUnauthorized: false } }),
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 5,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
