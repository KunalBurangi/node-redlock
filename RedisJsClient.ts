// RedisjsClient.ts
import {  RedisClientType, RedisClusterType } from 'redis';
import { RedisClient } from './interfaces/RedisClient';

export class RedisjsClient implements RedisClient {
  private client: RedisClientType | RedisClusterType;

  constructor(client: RedisClientType | RedisClusterType)  {
    this.client = client;
  }

  async set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null> {

    return new Promise((resolve, reject) => {
      try {
        this.client.set(key, value, { NX: true, PX: options.PX });
        resolve('OK');            
      } catch (error) {
        reject(error);
      }
    });
  }

  async eval(script: string, keys: string[], args: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.client.eval(script, { keys, arguments: args });
        resolve(1);
            
      } catch (error) {
        reject(error);
      }
    });
  }
}
