"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisjsClientMock = void 0;
const sinon_1 = require("sinon");
class RedisjsClientMock {
    set;
    eval;
    constructor() {
        this.set = (0, sinon_1.stub)();
        this.eval = (0, sinon_1.stub)();
    }
}
exports.RedisjsClientMock = RedisjsClientMock;
