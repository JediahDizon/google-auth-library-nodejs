"use strict";
// Copyright 2019 Google LLC
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
const base64js = require("base64-js");
const chai_1 = require("chai");
const sinon = require("sinon");
const keys_1 = require("./fixtures/keys");
const mocha_1 = require("mocha");
// Not all browsers support `TextEncoder`. The following `require` will
// provide a fast UTF8-only replacement for those browsers that don't support
// text encoding natively.
require('fast-text-encoding');
const src_1 = require("../src");
const oauth2client_1 = require("../src/auth/oauth2client");
const CLIENT_ID = 'CLIENT_ID';
const CLIENT_SECRET = 'CLIENT_SECRET';
const REDIRECT_URI = 'REDIRECT';
const ACCESS_TYPE = 'offline';
const SCOPE = 'scopex';
const FEDERATED_SIGNON_JWK_CERTS = [
    {
        kid: '4665c2781899014617337df9cbf220686505a06c',
        e: 'AQAB',
        kty: 'RSA',
        alg: 'RS256',
        n: 'o27xh_y7EEIoBXJuXzgfvFY80Cbk8Efn2b5ZFEwPIwFFBoNxvfbRt3wsZoMulMcZbU5uQ8q82FZBUmpwAlybQ0pBm79XDnL0kEDl1pJjyuaNE4JGOdBosvG5_SBaa7CCq9ukTeTLZgDR_YfcmP4-XQfhWuS-vx7hTz13GzmVgO8FyMH4EYm2ZyOY-otx35sM6toF__W1MiGcwty4Dp0qPHeZ3a34saNc_miQS5lzMcUgMYBKCQZ-P7pSeQhgVmwGYWr_93fqZEPQdOFC-Qwgrww1dZ7cv9INkjFkBKiWQLEiXJKoUSp2BwL2CqENYhuS04g5ZkDV7lVpOxOuHucEzQ',
        use: 'sig',
    },
    {
        use: 'sig',
        kid: '7978a91347261a291bd71dcab4a464be7d279666',
        e: 'AQAB',
        kty: 'RSA',
        alg: 'RS256',
        n: 'sFlU5LpHUtYIm7B27iiu7c4ZPZk7ULUNmFdMVsTmYJxJqQBKUIKU9ozwF6TlUsECmYUMLpQhX_iHuaZRcpG2YiG7jbmi9HMlonIXX7uUe7PIf8rNHhveX_VI7ZpwPTnab3_7ciy_o8ZFde6KNltkx_DLRO6hXf6z6ow1APFIIriaNlF8niz5cy0fPIv0e_Z2p13Sz3mnAACjBKZGPw2X9GWh5XpRoDEQBcibXpeLuA7ti8zLZuH-9ybXOoou699fr4QHFxUkcd_8fFqmzO5PKnlOnJZ0gtuXCCYYc9XPX-WSqlqbGNMZy0Giu2wHbNbeWdepkgVlGuJonTnMx4gLuQ',
    },
];
const FEDERATED_SIGNON_JWK_CERTS_AXIOS_RESPONSE = {
    headers: {
        'cache-control': 'cache-control: public, max-age=24000, must-revalidate, no-transform',
    },
    data: { keys: FEDERATED_SIGNON_JWK_CERTS },
};
mocha_1.describe('Browser OAuth2 tests', () => {
    let client;
    mocha_1.beforeEach(() => {
        client = new src_1.OAuth2Client({
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            redirectUri: REDIRECT_URI,
        });
    });
    mocha_1.it('should generate a valid consent page url', () => {
        const opts = {
            access_type: ACCESS_TYPE,
            scope: SCOPE,
            response_type: 'code token',
        };
        const generated = client.generateAuthUrl(opts);
        const url = new URL(generated);
        const params = url.searchParams;
        chai_1.assert.strictEqual(params.get('response_type'), 'code token');
        chai_1.assert.strictEqual(params.get('access_type'), ACCESS_TYPE);
        chai_1.assert.strictEqual(params.get('scope'), SCOPE);
        chai_1.assert.strictEqual(params.get('client_id'), CLIENT_ID);
        chai_1.assert.strictEqual(params.get('redirect_uri'), REDIRECT_URI);
    });
    mocha_1.it('getToken should work', async () => {
        const now = Date.now();
        const stub = sinon.stub().resolves({
            data: { access_token: 'abc', refresh_token: '123', expires_in: 10 },
        });
        client.transporter.request = stub;
        const response = await client.getToken('code here');
        const tokens = response.tokens;
        chai_1.assert.isAbove(tokens.expiry_date, now + 10 * 1000);
        chai_1.assert.isBelow(tokens.expiry_date, now + 15 * 1000);
    });
    mocha_1.it('getFederatedSignonCerts talks to correct endpoint', async () => {
        const stub = sinon
            .stub()
            .resolves(FEDERATED_SIGNON_JWK_CERTS_AXIOS_RESPONSE);
        client.transporter.request = stub;
        const result = await client.getFederatedSignonCertsAsync();
        const expectedCerts = {};
        for (const cert of FEDERATED_SIGNON_JWK_CERTS) {
            expectedCerts[cert.kid] = cert;
        }
        chai_1.assert.strictEqual(result.format, oauth2client_1.CertificateFormat.JWK);
        chai_1.assert.deepStrictEqual(result.certs, expectedCerts);
    });
    mocha_1.it('getFederatedSignonCerts caches certificates', async () => {
        const stub = sinon
            .stub()
            .resolves(FEDERATED_SIGNON_JWK_CERTS_AXIOS_RESPONSE);
        client.transporter.request = stub;
        const result1 = await client.getFederatedSignonCertsAsync();
        const result2 = await client.getFederatedSignonCertsAsync();
        chai_1.assert(stub.calledOnce);
        chai_1.assert.deepStrictEqual(result1.certs, result2.certs);
        chai_1.assert.deepStrictEqual(result1.format, result2.format);
    });
    mocha_1.it('should generate a valid code verifier and resulting challenge', async () => {
        const codes = await client.generateCodeVerifierAsync();
        chai_1.assert.match(codes.codeVerifier, /^[a-zA-Z0-9-.~_]{128}$/);
    });
    mocha_1.it('should include code challenge and method in the url', async () => {
        const codes = await client.generateCodeVerifierAsync();
        const authUrl = client.generateAuthUrl({
            code_challenge: codes.codeChallenge,
            code_challenge_method: src_1.CodeChallengeMethod.S256,
        });
        const url = new URL(authUrl);
        const params = url.searchParams;
        chai_1.assert.strictEqual(params.get('code_challenge'), codes.codeChallenge);
        chai_1.assert.strictEqual(params.get('code_challenge_method'), src_1.CodeChallengeMethod.S256);
    });
    mocha_1.it('should verify a valid certificate against a jwt', async () => {
        const maxLifetimeSecs = 86400;
        const now = Date.now() / 1000;
        const expiry = now + maxLifetimeSecs / 2;
        const idToken = '{' +
            '"iss":"testissuer",' +
            '"aud":"testaudience",' +
            '"azp":"testauthorisedparty",' +
            '"email_verified":"true",' +
            '"id":"123456789",' +
            '"sub":"123456789",' +
            '"email":"test@test.com",' +
            '"iat":' +
            now +
            ',' +
            '"exp":' +
            expiry +
            '}';
        const envelope = JSON.stringify({ kid: 'keyid', alg: 'RS256' });
        let data = 
        // eslint-disable-next-line node/no-unsupported-features/node-builtins
        base64js.fromByteArray(new TextEncoder().encode(envelope)) +
            '.' +
            // eslint-disable-next-line node/no-unsupported-features/node-builtins
            base64js.fromByteArray(new TextEncoder().encode(idToken));
        const algo = {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
        };
        // eslint-disable-next-line no-undef
        const cryptoKey = await window.crypto.subtle.importKey('jwk', keys_1.privateKey, algo, true, ['sign']);
        // eslint-disable-next-line no-undef
        const signature = await window.crypto.subtle.sign(algo, cryptoKey, 
        // eslint-disable-next-line node/no-unsupported-features/node-builtins
        new TextEncoder().encode(data));
        data += '.' + base64js.fromByteArray(new Uint8Array(signature));
        const login = await client.verifySignedJwtWithCertsAsync(data, { keyid: keys_1.publicKey }, 'testaudience');
        chai_1.assert.strictEqual(login.getUserId(), '123456789');
    });
});
//# sourceMappingURL=test.oauth2.js.map