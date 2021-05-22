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
const fs = require("fs");
const jws = require("jws");
const sinon = require("sinon");
const src_1 = require("../src");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const keypair = require('keypair');
mocha_1.describe('jwtaccess', () => {
    // Creates a standard JSON credentials object for testing.
    const json = {
        private_key_id: 'key123',
        private_key: 'privatekey',
        client_email: 'hello@youarecool.com',
        client_id: 'client123',
        type: 'service_account',
    };
    const keys = keypair(512 /* bitsize of private key */);
    const testUri = 'http:/example.com/my_test_service';
    const email = 'foo@serviceaccount.com';
    let client;
    const sandbox = sinon.createSandbox();
    mocha_1.beforeEach(() => {
        client = new src_1.JWTAccess();
    });
    mocha_1.afterEach(() => sandbox.restore());
    mocha_1.it('getRequestHeaders should create a signed JWT token as the access token', () => {
        const client = new src_1.JWTAccess(email, keys.private);
        const headers = client.getRequestHeaders(testUri);
        assert.notStrictEqual(null, headers, 'an creds object should be present');
        const decoded = jws.decode(headers.Authorization.replace('Bearer ', ''));
        assert.deepStrictEqual({ alg: 'RS256', typ: 'JWT' }, decoded.header);
        const payload = decoded.payload;
        assert.strictEqual(email, payload.iss);
        assert.strictEqual(email, payload.sub);
        assert.strictEqual(testUri, payload.aud);
    });
    mocha_1.it('getRequestHeaders should set key id in header when available', () => {
        const client = new src_1.JWTAccess(email, keys.private, '101');
        const headers = client.getRequestHeaders(testUri);
        const decoded = jws.decode(headers.Authorization.replace('Bearer ', ''));
        assert.deepStrictEqual({ alg: 'RS256', typ: 'JWT', kid: '101' }, decoded.header);
    });
    mocha_1.it('getRequestHeaders should not allow overriding with additionalClaims', () => {
        const client = new src_1.JWTAccess(email, keys.private);
        const additionalClaims = { iss: 'not-the-email' };
        assert.throws(() => {
            client.getRequestHeaders(testUri, additionalClaims);
        }, /^Error: The 'iss' property is not allowed when passing additionalClaims. This claim is included in the JWT by default.$/);
    });
    mocha_1.it('getRequestHeaders should return a cached token on the second request', () => {
        const client = new src_1.JWTAccess(email, keys.private);
        const res = client.getRequestHeaders(testUri);
        const res2 = client.getRequestHeaders(testUri);
        assert.strictEqual(res, res2);
    });
    mocha_1.it('getRequestHeaders should not return cached tokens older than an hour', () => {
        const client = new src_1.JWTAccess(email, keys.private);
        const res = client.getRequestHeaders(testUri);
        const realDateNow = Date.now;
        try {
            // go forward in time one hour (plus a little)
            Date.now = () => realDateNow() + 1000 * 60 * 60 + 10;
            const res2 = client.getRequestHeaders(testUri);
            assert.notStrictEqual(res, res2);
        }
        finally {
            // return date.now to it's normally scheduled programming
            Date.now = realDateNow;
        }
    });
    mocha_1.it('fromJson should error on null json', () => {
        assert.throws(() => {
            // Test verifies invalid parameter tests, which requires cast to any.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.fromJSON(null);
        });
    });
    mocha_1.it('fromJson should error on empty json', () => {
        assert.throws(() => {
            client.fromJSON({});
        });
    });
    mocha_1.it('fromJson should error on missing client_email', () => {
        const j = Object.assign({}, json);
        delete j.client_email;
        assert.throws(() => {
            client.fromJSON(j);
        });
    });
    mocha_1.it('fromJson should error on missing private_key', () => {
        const j = Object.assign({}, json);
        delete j.private_key;
        assert.throws(() => {
            client.fromJSON(j);
        });
    });
    mocha_1.it('fromJson should create JWT with client_email', () => {
        client.fromJSON(json);
        assert.strictEqual(json.client_email, client.email);
    });
    mocha_1.it('fromJson should create JWT with private_key', () => {
        client.fromJSON(json);
        assert.strictEqual(json.private_key, client.key);
    });
    mocha_1.it('fromJson should create JWT with private_key_id', () => {
        client.fromJSON(json);
        assert.strictEqual(json.private_key_id, client.keyId);
    });
    mocha_1.it('fromStream should error on null stream', done => {
        // Test verifies invalid parameter tests, which requires cast to any.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.fromStream(null, (err) => {
            assert.strictEqual(true, err instanceof Error);
            done();
        });
    });
    mocha_1.it('fromStream should construct a JWT Header instance from a stream', async () => {
        // Read the contents of the file into a json object.
        const fileContents = fs.readFileSync('./test/fixtures/private.json', 'utf-8');
        const json = JSON.parse(fileContents);
        // Now open a stream on the same file.
        const stream = fs.createReadStream('./test/fixtures/private.json');
        // And pass it into the fromStream method.
        await client.fromStream(stream);
        // Ensure that the correct bits were pulled from the stream.
        assert.strictEqual(json.private_key, client.key);
        assert.strictEqual(json.client_email, client.email);
    });
});
//# sourceMappingURL=test.jwtaccess.js.map