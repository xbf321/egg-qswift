'use strict';
const QSWIFT = Symbol('Context#qswift');
const Upload = require('../../lib/upload.js');
module.exports = {
    get qswift() {
        if (!this[QSWIFT]) {
            this[QSWIFT] = new Upload(this.app.config.qswift, this.app);
        }
        return this[QSWIFT];
    }
};
