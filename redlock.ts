// Redlock.ts
import { RedisClusterType } from 'redis';
import { RedisClient } from './interfaces/RedisClient';

interface Lock {
  resource: string;
  value: string;
  ttl: number;
  owner: string;
}

export class Redlock {
  private clients: RedisClient[] | RedisClusterType[];
  private retryCount: number;
  private retryDelay: number;
  private driftFactor: number;
  private ownerId: string;

  constructor(clients: RedisClient[], ownerId: string, retryCount = 3, retryDelay = 200, driftFactor = 0.01) {
    this.clients = clients;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.driftFactor = driftFactor;
    this.ownerId = ownerId;
  }

   /**
   * Attempts to acquire a lock on a single Redis client.
   * @param client - The Redis client.
   * @param resource - The resource to lock.
   * @param value - The unique lock value.
   * @param ttl - The time-to-live for the lock in milliseconds.
   * @returns A promise that resolves to true if the lock was acquired, false otherwise.
   */
  private async acquireLockInstance(client:   RedisClusterType, resource: string, value: string, ttl: number): Promise<boolean> {
    const result = await client[0].client.set(resource, value, { NX: true, PX: ttl });
    return result === 'OK';
  }

    /**
   * Releases a lock on a single Redis client.
   * @param client - The Redis client.
   * @param lock - The lock to release.
   * @returns A promise that resolves to the number of keys that were removed.
   */
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

    /**
   * Attempts to acquire a lock on the specified resource.
   * @param resource - The resource to lock.
   * @param ttl - The time-to-live for the lock in milliseconds.
   * @returns A promise that resolves to the acquired lock or null if the lock could not be acquired.
   */
  public async acquireLock(resource: string, ttl: number): Promise<Lock | null> {
    const value = Math.random().toString(36).substring(2, 15); // Unique lock value
    const end = Date.now() + ttl;

    for (let i = 0; i < this.retryCount; i++) {
      const startTime = Date.now();
      const successCount = await this.tryAcquire(resource, value, ttl);

      const elapsedTime = Date.now() - startTime;
      const valid = elapsedTime < ttl * (1 - this.driftFactor);

      if (successCount >= Math.floor(this.clients.length / 2) + 1 && valid) {
        return { resource, value, ttl: end, owner: this.ownerId };
      }

      await this.releaseLock(resource, value);
      await this.sleep(this.retryDelay);
    }

    return null;
  }

    /**
   * Attempts to acquire a lock on the specified resource using a custom retry strategy.
   * @param resource - The resource to lock.
   * @param ttl - The time-to-live for the lock in milliseconds.
   * @param retryStrategy - A function that determines the delay before the next retry attempt.
   * @returns A promise that resolves to the acquired lock or null if the lock could not be acquired.
   */
  public async acquireLockWithCustomRetry(resource: string, ttl: number, retryStrategy: (attempt: number) => number): Promise<Lock | null> {
    const value = Math.random().toString(36).substring(2, 15);
    const end = Date.now() + ttl;

    for (let i = 0; i < this.retryCount; i++) {
      const successCount = await this.tryAcquire(resource, value, ttl);
      if (successCount >= Math.floor(this.clients.length / 2) + 1) {
        return { resource, value, ttl: end, owner: this.ownerId };
      }
      await this.releaseLock(resource, value);
      await this.sleep(retryStrategy(i));
    }

    return null;
  }

    /**
   * Attempts to acquire a lock on the specified resource across all clients.
   * @param resource - The resource to lock.
   * @param value - The unique lock value.
   * @param ttl - The time-to-live for the lock in milliseconds.
   * @returns A promise that resolves to the number of successful lock acquisitions.
   */
  private async tryAcquire(resource: string, value: string, ttl: number): Promise<number> {
    const promises = this.clients.map(client => this.acquireLockInstance(client, resource, value, ttl));
    const results = await Promise.all(promises);
    return results.filter(result => result).length;
  }

    /**
   * Releases a lock on the specified resource.
   * @param resource - The resource to unlock.
   * @param value - The unique lock value.
   * @returns A promise that resolves when the lock has been released.
   */
  public async releaseLock(resource: string, value: string): Promise<void> {
    const lock: Lock = { resource, value, ttl: 0, owner: this.ownerId };
    const promises = this.clients.map(client => this.releaseLockInstance(client, lock));
    await Promise.all(promises);
  }

   /**
   * Renews a lock on the specified resource.
   * @param resource - The resource to renew the lock on.
   * @param value - The unique lock value.
   * @param ttl - The new time-to-live for the lock in milliseconds.
   * @returns A promise that resolves to true if the lock was renewed, false otherwise.
   */
  public async renewLock(resource: string, value: string, ttl: number): Promise<boolean> {
    const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  const promises = this.clients.map(client =>
    client.eval(script, [resource], [value, ttl.toString()])
  );
  const results = await Promise.all(promises);
  return results.every(result => result === 1);
  }
    /**
   * Sleeps for the specified number of milliseconds.
   * @param ms - The number of milliseconds to sleep.
   * @returns A promise that resolves after the specified delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
}

