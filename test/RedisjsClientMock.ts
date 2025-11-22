// RedisjsClientMock.ts
import { RedisClient } from '../interfaces/RedisClient';
import { SinonStub, stub } from 'sinon';

export class RedisjsClientMock implements RedisClient {
  set: SinonStub;
  eval: SinonStub;

  constructor() {
    this.set = stub().resolves('OK');
    this.eval = stub().resolves(1);
  }
}
