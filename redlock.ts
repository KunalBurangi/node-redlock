// Redlock.ts
import { RedisClient } from './interfaces/RedisClient';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export interface Lock {
  resource: string;
  value: string;
  ttl: number;
}

export class Redlock extends EventEmitter {
  private clients: RedisClient[];
  private retryCount: number;
  private retryDelay: number;
  private driftFactor: number;

  constructor(clients: RedisClient[], retryCount = 3, retryDelay = 200, driftFactor = 0.01) {
    super();
    this.clients = clients;
    this.retryCount = retryCount;
    this.retryDelay = retryDelay;
    this.driftFactor = driftFactor;
  }

  /**
  * Attempts to acquire a lock on a single Redis client.
  * @param client - The Redis client.
  * @param resource - The resource to lock.
  * @param value - The unique lock value.
  * @param ttl - The time-to-live for the lock in milliseconds.
  * @returns A promise that resolves to true if the lock was acquired, false otherwise.
  */
  private async acquireLockInstance(client: RedisClient, resource: string, value: string, ttl: number): Promise<boolean> {
    try {
      const result = await client.set(resource, value, { NX: true, PX: ttl });
      return result === 'OK';
    } catch (error) {
      this.emit('clientError', error);
      return false;
    }
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
    return client.eval(script, [lock.resource], [lock.value])
      .catch(error => {
        this.emit('clientError', error);
        return 0;
      });
  }

  /**
 * Attempts to acquire a lock on the specified resource.
 * @param resource - The resource to lock.
 * @param ttl - The time-to-live for the lock in milliseconds.
 * @returns A promise that resolves to the acquired lock or null if the lock could not be acquired.
 */
  public async acquireLock(resource: string, ttl: number): Promise<Lock | null> {
    const value = randomUUID(); // Unique lock value
    const end = Date.now() + ttl;

    for (let i = 0; i < this.retryCount; i++) {
      const startTime = Date.now();
      const successCount = await this.tryAcquire(resource, value, ttl);

      const elapsedTime = Date.now() - startTime;
      const valid = elapsedTime < ttl * (1 - this.driftFactor);

      if (successCount >= Math.floor(this.clients.length / 2) + 1 && valid) {
        const lock = { resource, value, ttl: end };
        this.emit('acquired', lock);
        return lock;
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
    const value = randomUUID();
    const end = Date.now() + ttl;

    for (let i = 0; i < this.retryCount; i++) {
      const successCount = await this.tryAcquire(resource, value, ttl);
      if (successCount >= Math.floor(this.clients.length / 2) + 1) {
        const lock = { resource, value, ttl: end };
        this.emit('acquired', lock);
        return lock;
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
    const lock: Lock = { resource, value, ttl: 0 };
    const promises = this.clients.map(client => this.releaseLockInstance(client, lock));
    await Promise.all(promises);
    this.emit('released', lock);
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
        .catch(error => {
          this.emit('clientError', error);
          return 0;
        })
    );
    const results = await Promise.all(promises);
    const success = results.every(result => result === 1);
    if (success) {
      this.emit('renewed', { resource, value, ttl });
    }
    return success;
  }

  /**
   * Acquires a lock, executes a routine, and automatically releases the lock.
   * Optionally extends the lock automatically while the routine is running.
   * @param resource - The resource to lock.
   * @param ttl - The time-to-live for the lock in milliseconds.
   * @param routine - The async function to execute while holding the lock.
   * @param options - Optional configuration (e.g., autoExtend).
   * @returns The result of the routine.
   */
  public async using<T>(
    resource: string,
    ttl: number,
    routine: (lock: Lock) => Promise<T>,
    options?: { autoExtend?: boolean }
  ): Promise<T> {
    const lock = await this.acquireLock(resource, ttl);
    if (!lock) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    let extensionTimer: NodeJS.Timeout | null = null;

    if (options?.autoExtend) {
      const extendInterval = Math.floor(ttl * 0.8); // Extend at 80% of TTL
      extensionTimer = setInterval(async () => {
        try {
          const renewed = await this.renewLock(lock.resource, lock.value, ttl);
          if (!renewed) {
            this.emit('error', new Error(`Failed to auto-extend lock for resource: ${resource}`));
            if (extensionTimer) clearInterval(extensionTimer);
          }
        } catch (error) {
          this.emit('error', error);
        }
      }, extendInterval);
    }

    try {
      return await routine(lock);
    } finally {
      if (extensionTimer) {
        clearInterval(extensionTimer);
      }
      await this.releaseLock(lock.resource, lock.value);
    }
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

