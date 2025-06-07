// IoredisClient.ts
import {Redis,Cluster} from 'ioredis';
import { RedisClient } from './interfaces/RedisClient';

export class IoredisClient implements RedisClient {
  private client: Redis | Cluster;

  constructor(client: Redis | Cluster) {
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
  public async getTTL(resource: string): Promise<number> {
    return this.client.pttl(resource); // Or any method you use
  }
    // Expose Redis get method
  public async get(resource: string): Promise<string | null> {
      return this.client.get(resource); // Calls the ioredis 'get' method
  }
  
}
