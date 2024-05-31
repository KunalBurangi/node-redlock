// IoredisClient.ts
import Redis from 'ioredis';
import { RedisClient } from './interfaces/RedisClient';

export class IoredisClient implements RedisClient {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null> {
    const result = await this.client.set(key, value, 'PX', options.PX, 'NX');
    return result;
  }

  async eval(script: string, keys: string[], args: string[]): Promise<number> {
    const result = await this.client.eval(script, keys.length, ...keys, ...args);
    return result as number;
  }
}
