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

// // Usage example
// import Redis from 'ioredis';
// import { createClient } from 'redis';
// import { IoredisClient } from './IoredisClient';
// import { RedisjsClient } from './RedisjsClient';

// (async () => {
//   const ioredisClients = [
//     new Redis({ host: 'localhost', port: 6379 }),
//     new Redis({ host: 'localhost', port: 6380 }),
//     new Redis({ host: 'localhost', port: 6381 }),
//   ].map(client => new IoredisClient(client));

//   const redisjsClients = [
//     createClient({ url: 'redis://localhost:6379' }),
//     createClient({ url: 'redis://localhost:6380' }),
//     createClient({ url: 'redis://localhost:6381' }),
//   ];

//   await Promise.all(redisjsClients.map(client => client.connect()));
//   const redisjsClientInstances = redisjsClients.map(client => new RedisjsClient(client));

//   // Choose the set of clients you want to use
//   const clients = [...ioredisClients, ...redisjsClientInstances];

//   const redlock = new Redlock(clients);

//   const resource = 'locks:example';
//   const ttl = 10000; // 10 seconds

//   const lock = await redlock.acquireLock(resource, ttl);

//   if (lock) {
//     console.log(`Acquired lock on ${resource}`);
    
//     // Do your critical section work here
    
//     await redlock.releaseLock(resource, lock.value);
//     console.log(`Released lock on ${resource}`);
//   } else {
//     console.log(`Failed to acquire lock on ${resource}`);
//   }

//   ioredisClients.forEach(client => (client as IoredisClient).client.quit());
//   await Promise.all(redisjsClients.map(client => client.quit()));
// })();
