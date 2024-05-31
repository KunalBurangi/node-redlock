// Redlock.ts
import { RedisClient } from './interfaces/RedisClient';

interface Lock {
  resource: string;
  value: string;
  ttl: number;
}

export class Redlock {
  private clients: RedisClient[];
  private retryCount: number;
  private retryDelay: number;
  private driftFactor: number;

  constructor(clients: RedisClient[], retryCount = 3, retryDelay = 200, driftFactor = 0.01) {
    this.clients = clients;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.driftFactor = driftFactor;
  }

  private async acquireLockInstance(client: RedisClient, resource: string, value: string, ttl: number): Promise<boolean> {
    const result = await client.set(resource, value, { NX: true, PX: ttl });
    return result === 'OK';
  }

  private releaseLockInstance(client: RedisClient, lock: Lock): Promise<number> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    return client.eval(script, [lock.resource], [lock.value]);
  }

  public async acquireLock(resource: string, ttl: number): Promise<Lock | null> {
    const value = Math.random().toString(36).substring(2, 15); // Unique lock value
    const end = Date.now() + ttl;

    for (let i = 0; i < this.retryCount; i++) {
      const startTime = Date.now();
      const successCount = await this.tryAcquire(resource, value, ttl);

      const elapsedTime = Date.now() - startTime;
      const valid = elapsedTime < ttl * (1 - this.driftFactor);

      if (successCount >= Math.floor(this.clients.length / 2) + 1 && valid) {
        return { resource, value, ttl: end };
      }

      await this.releaseLock(resource, value);
      await this.sleep(this.retryDelay);
    }

    return null;
  }

  private async tryAcquire(resource: string, value: string, ttl: number): Promise<number> {
    const promises = this.clients.map(client => this.acquireLockInstance(client, resource, value, ttl));
    const results = await Promise.all(promises);
    return results.filter(result => result).length;
  }

  public async releaseLock(resource: string, value: string): Promise<void> {
    const lock: Lock = { resource, value, ttl: 0 };
    const promises = this.clients.map(client => this.releaseLockInstance(client, lock));
    await Promise.all(promises);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

