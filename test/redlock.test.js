"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// redlock.test.ts
const chai_1 = require("chai");
const IoredisClientMock_1 = require("./IoredisClientMock");
const RedisjsClientMock_1 = require("./RedisjsClientMock");
const redlock_1 = require("../redlock");
const sinon_1 = __importDefault(require("sinon"));
describe('Redlock', () => {
    let ioredisClient1;
    let ioredisClient2;
    let redisjsClient1;
    let redisjsClient2;
    let redlock;
    beforeEach(() => {
        ioredisClient1 = new IoredisClientMock_1.IoredisClientMock();
        ioredisClient2 = new IoredisClientMock_1.IoredisClientMock();
        redisjsClient1 = new RedisjsClientMock_1.RedisjsClientMock();
        redisjsClient2 = new RedisjsClientMock_1.RedisjsClientMock();
        const clients = [ioredisClient1, ioredisClient2, redisjsClient1, redisjsClient2];
        redlock = new redlock_1.Redlock(clients);
    });
    afterEach(() => {
        sinon_1.default.restore();
    });
    it('should acquire and release a lock', async () => {
        const resource = 'locks:test';
        const ttl = 1000;
        const lockValue = 'unique_value';
        ioredisClient1.set.resolves('OK');
        ioredisClient2.set.resolves('OK');
        redisjsClient1.set.resolves('OK');
        redisjsClient2.set.resolves('OK');
        const lock = await redlock.acquireLock(resource, ttl);
        (0, chai_1.expect)(lock).to.not.be.null;
        (0, chai_1.expect)(lock.resource).to.equal(resource);
        ioredisClient1.eval.resolves(1);
        ioredisClient2.eval.resolves(1);
        redisjsClient1.eval.resolves(1);
        redisjsClient2.eval.resolves(1);
        await redlock.releaseLock(resource, lock.value);
        sinon_1.default.assert.calledWith(ioredisClient1.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(ioredisClient2.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(redisjsClient1.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(redisjsClient2.eval, sinon_1.default.match.string, [resource], [lock.value]);
    });
    it('should fail to acquire a lock if not enough instances succeed', async () => {
        const resource = 'locks:test';
        const ttl = 1000;
        ioredisClient1.set.resolves('OK');
        ioredisClient2.set.resolves(null);
        redisjsClient1.set.resolves(null);
        redisjsClient2.set.resolves('OK');
        const lock = await redlock.acquireLock(resource, ttl);
        (0, chai_1.expect)(lock).to.be.null;
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
        (0, chai_1.expect)(lock).to.not.be.null;
        (0, chai_1.expect)(lock.resource).to.equal(resource);
        ioredisClient1.eval.resolves(1);
        ioredisClient2.eval.resolves(1);
        redisjsClient1.eval.resolves(1);
        redisjsClient2.eval.resolves(1);
        await redlock.releaseLock(resource, lock.value);
        sinon_1.default.assert.calledWith(ioredisClient1.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(ioredisClient2.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(redisjsClient1.eval, sinon_1.default.match.string, [resource], [lock.value]);
        sinon_1.default.assert.calledWith(redisjsClient2.eval, sinon_1.default.match.string, [resource], [lock.value]);
    });
});
