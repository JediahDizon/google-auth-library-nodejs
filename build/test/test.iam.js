"use strict";
// Copyright 2013 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const sinon = require("sinon");
const src_1 = require("../src");
mocha_1.describe('iam', () => {
    const testSelector = 'a-test-selector';
    const testToken = 'a-test-token';
    let sandbox;
    let client;
    mocha_1.beforeEach(() => {
        sandbox = sinon.createSandbox();
        client = new src_1.IAMAuth(testSelector, testToken);
    });
    mocha_1.afterEach(() => {
        sandbox.restore();
    });
    mocha_1.it('passes the token and selector to the callback ', async () => {
        const creds = client.getRequestHeaders();
        assert.notStrictEqual(creds, null, 'metadata should be present');
        assert.strictEqual(creds['x-goog-iam-authority-selector'], testSelector);
        assert.strictEqual(creds['x-goog-iam-authorization-token'], testToken);
    });
});
//# sourceMappingURL=test.iam.js.map