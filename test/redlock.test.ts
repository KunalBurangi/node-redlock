// redlock.test.ts
import { expect } from 'chai';
import { IoredisClientMock } from './IoredisClientMock';
import { RedisjsClientMock } from './RedisjsClientMock';
import {Redlock} from '../redlock';
import sinon from 'sinon';

describe('Redlock', () => {
  let ioredisClient1: IoredisClientMock;
  let ioredisClient2: IoredisClientMock;
  let redisjsClient1: RedisjsClientMock;
  let redisjsClient2: RedisjsClientMock;
  let redlock: Redlock;

  beforeEach(() => {
    ioredisClient1 = new IoredisClientMock();
    ioredisClient2 = new IoredisClientMock();
    redisjsClient1 = new RedisjsClientMock();
    redisjsClient2 = new RedisjsClientMock();

    const clients = [ioredisClient1, ioredisClient2, redisjsClient1, redisjsClient2];
    redlock = new Redlock(clients,'unique-owner-id');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should acquire and release a lock', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);

    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    await redlock.releaseLock(resource, lock!.value);

    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
  });

  it('should fail to acquire a lock if not enough instances succeed', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.resolves('OK');
    ioredisClient2.set.resolves(null);
    redisjsClient1.set.resolves(null);
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.be.null;
  });

  it('should retry acquiring a lock', async () => {
    const resource = 'locks:test';
    const ttl = 1000;

    ioredisClient1.set.onCall(0).resolves(null);
    ioredisClient1.set.onCall(1).resolves('OK');
    ioredisClient2.set.resolves('OK');
    redisjsClient1.set.resolves('OK');
    redisjsClient2.set.resolves('OK');

    const lock = await redlock.acquireLock(resource, ttl);
    expect(lock).to.not.be.null;
    expect(lock!.resource).to.equal(resource);

    ioredisClient1.eval.resolves(1);
    ioredisClient2.eval.resolves(1);
    redisjsClient1.eval.resolves(1);
    redisjsClient2.eval.resolves(1);

    await redlock.releaseLock(resource, lock!.value);

    sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
    sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
  });
it('should acquire a lock with custom retry strategy', async () => {
  const resource = 'locks:test';
  const ttl = 1000;
  const retryStrategy = (attempt: number) => attempt * 100;

  ioredisClient1.set.resolves('OK');
  ioredisClient2.set.resolves('OK');
  redisjsClient1.set.resolves('OK');
  redisjsClient2.set.resolves('OK');

  const lock = await redlock.acquireLockWithCustomRetry(resource, ttl, retryStrategy);
  expect(lock).to.not.be.null;
  expect(lock!.resource).to.equal(resource);

  ioredisClient1.eval.resolves(1);
  ioredisClient2.eval.resolves(1);
  redisjsClient1.eval.resolves(1);
  redisjsClient2.eval.resolves(1);

  await redlock.releaseLock(resource, lock!.value);

  sinon.assert.calledWith(ioredisClient1.eval, sinon.match.string, [resource], [lock!.value]);
  sinon.assert.calledWith(ioredisClient2.eval, sinon.match.string, [resource], [lock!.value]);
  sinon.assert.calledWith(redisjsClient1.eval, sinon.match.string, [resource], [lock!.value]);
  sinon.assert.calledWith(redisjsClient2.eval, sinon.match.string, [resource], [lock!.value]);
});

it('should fail to acquire a lock with custom retry strategy if not enough instances succeed', async () => {
  const resource = 'locks:test';
  const ttl = 1000;
  const retryStrategy = (attempt: number) => attempt * 100;

  ioredisClient1.set.resolves('OK');
  ioredisClient2.set.resolves(null);
  redisjsClient1.set.resolves(null);
  redisjsClient2.set.resolves('OK');

  const lock = await redlock.acquireLockWithCustomRetry(resource, ttl, retryStrategy);
  expect(lock).to.be.null;
});

it('should renew a lock', async () => {
  const resource = 'locks:test';
  const ttl = 1000;
  const value = 'unique-lock-value';

  ioredisClient1.set.resolves('OK');
  ioredisClient2.set.resolves('OK');
  redisjsClient1.set.resolves('OK');
  redisjsClient2.set.resolves('OK');

  const lock = await redlock.acquireLock(resource, ttl);
  expect(lock).to.not.be.null;
  expect(lock!.resource).to.equal(resource);
  // Mock the eval method to simulate successful renewal
  ioredisClient1.eval.resolves(1);
  ioredisClient2.eval.resolves(1);
  redisjsClient1.eval.resolves(1);
  redisjsClient2.eval.resolves(1);

  const success = await redlock.renewLock(resource, value, ttl);
  expect(success).to.be.true;

  // Verify that eval was called with the correct arguments
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  sinon.assert.calledWith(ioredisClient1.eval, script, [resource], [value, ttl.toString()]);
  sinon.assert.calledWith(ioredisClient2.eval, script, [resource], [value, ttl.toString()]);
  sinon.assert.calledWith(redisjsClient1.eval, script, [resource], [value, ttl.toString()]);
  sinon.assert.calledWith(redisjsClient2.eval, script, [resource], [value, ttl.toString()]);
});


it('should fail to renew a lock if not all instances succeed', async () => {
  const resource = 'locks:test';
  const ttl = 1000;
  const value = 'unique-lock-value';

  ioredisClient1.set.resolves('OK');
  ioredisClient2.set.resolves(null);
  redisjsClient1.set.resolves('OK');
  redisjsClient2.set.resolves(null);

  const success = await redlock.renewLock(resource, value, ttl);
  expect(success).to.be.false;
})
});
