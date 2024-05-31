// interfaces/RedisClient.ts
export interface RedisClient {
    set(key: string, value: string, options: { NX: boolean, PX: number }): Promise<string | null>;
    eval(script: string, keys: string[], args: string[]): Promise<number>;
  }
  