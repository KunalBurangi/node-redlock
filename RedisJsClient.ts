// RedisjsClient.ts
import {  RedisClientType } from 'redis';
import { RedisClient } from './interfaces/RedisClient';

export class RedisjsClient implements RedisClient {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, { NX: options.NX, PX: options.PX }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async eval(script: string, keys: string[], args: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.eval(script, { keys, arguments: args }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result as number);
        }
      });
    });
  }
}
