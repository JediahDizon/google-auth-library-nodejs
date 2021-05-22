"use strict";
// Copyright 2021 Google LLC
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
const qs = require("querystring");
const nock = require("nock");
const crypto_1 = require("../src/crypto/crypto");
const stscredentials_1 = require("../src/auth/stscredentials");
const oauth2common_1 = require("../src/auth/oauth2common");
nock.disableNetConnect();
mocha_1.describe('StsCredentials', () => {
    const crypto = crypto_1.createCrypto();
    const baseUrl = 'https://example.com';
    const path = '/token.oauth2';
    const tokenExchangeEndpoint = `${baseUrl}${path}`;
    const basicAuth = {
        confidentialClientType: 'basic',
        clientId: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
    };
    const requestBodyAuth = {
        confidentialClientType: 'request-body',
        clientId: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
    };
    // Full STS credentials options, useful to test that all supported
    // parameters are handled correctly.
    const stsCredentialsOptions = {
        grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
        resource: 'https://api.example.com/',
        audience: 'urn:example:cooperation-context',
        scope: ['scope1', 'scope2'],
        requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
        subjectToken: 'HEADER.SUBJECT_TOKEN_PAYLOAD.SIGNATURE',
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        actingParty: {
            actorToken: 'HEADER.ACTOR_TOKEN_PAYLOAD.SIGNATURE',
            actorTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        },
    };
    // Partial STS credentials options, useful to test that optional unspecified
    // parameters are handled correctly.
    const partialStsCredentialsOptions = {
        grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
        audience: 'urn:example:cooperation-context',
        requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
        subjectToken: 'HEADER.SUBJECT_TOKEN_PAYLOAD.SIGNATURE',
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    };
    const stsSuccessfulResponse = {
        access_token: 'ACCESS_TOKEN',
        issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'scope1 scope2',
    };
    const errorResponse = {
        error: 'invalid_request',
        error_description: 'Invalid subject token',
        error_uri: 'https://tools.ietf.org/html/rfc6749#section-5.2',
    };
    function assertGaxiosResponsePresent(resp) {
        const gaxiosResponse = resp.res || {};
        assert('data' in gaxiosResponse && 'status' in gaxiosResponse);
    }
    function mockStsTokenExchange(statusCode = 200, response, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request, additionalHeaders) {
        const headers = Object.assign({
            'content-type': 'application/x-www-form-urlencoded',
        }, additionalHeaders || {});
        return nock(baseUrl)
            .post(path, qs.stringify(request), {
            reqheaders: headers,
        })
            .reply(statusCode, response);
    }
    mocha_1.afterEach(() => {
        nock.cleanAll();
    });
    mocha_1.describe('exchangeToken()', () => {
        var _a, _b, _c;
        const additionalHeaders = {
            'x-client-version': '0.1.2',
        };
        const options = {
            additional: {
                'non-standard': ['options'],
                other: 'some-value',
            },
        };
        const expectedRequest = {
            grant_type: stsCredentialsOptions.grantType,
            resource: stsCredentialsOptions.resource,
            audience: stsCredentialsOptions.audience,
            scope: (_a = stsCredentialsOptions.scope) === null || _a === void 0 ? void 0 : _a.join(' '),
            requested_token_type: stsCredentialsOptions.requestedTokenType,
            subject_token: stsCredentialsOptions.subjectToken,
            subject_token_type: stsCredentialsOptions.subjectTokenType,
            actor_token: (_b = stsCredentialsOptions.actingParty) === null || _b === void 0 ? void 0 : _b.actorToken,
            actor_token_type: (_c = stsCredentialsOptions.actingParty) === null || _c === void 0 ? void 0 : _c.actorTokenType,
            options: JSON.stringify(options),
        };
        const expectedPartialRequest = {
            grant_type: stsCredentialsOptions.grantType,
            audience: stsCredentialsOptions.audience,
            requested_token_type: stsCredentialsOptions.requestedTokenType,
            subject_token: stsCredentialsOptions.subjectToken,
            subject_token_type: stsCredentialsOptions.subjectTokenType,
        };
        const expectedRequestWithCreds = Object.assign({}, expectedRequest, {
            client_id: requestBodyAuth.clientId,
            client_secret: requestBodyAuth.clientSecret,
        });
        const expectedPartialRequestWithCreds = Object.assign({}, expectedPartialRequest, {
            client_id: requestBodyAuth.clientId,
            client_secret: requestBodyAuth.clientSecret,
        });
        mocha_1.describe('without client authentication', () => {
            mocha_1.it('should handle successful full request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedRequest, additionalHeaders);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint);
                const resp = await stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle successful partial request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedPartialRequest);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint);
                const resp = await stsCredentials.exchangeToken(partialStsCredentialsOptions);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle non-200 response', async () => {
                const scope = mockStsTokenExchange(400, errorResponse, expectedRequest, additionalHeaders);
                const expectedError = oauth2common_1.getErrorFromOAuthErrorResponse(errorResponse);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint);
                await assert.rejects(stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options), expectedError);
                scope.done();
            });
            mocha_1.it('should handle request timeout', async () => {
                const scope = nock(baseUrl)
                    .post(path, qs.stringify(expectedRequest), {
                    reqheaders: {
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                })
                    .replyWithError({ code: 'ETIMEDOUT' });
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint);
                await assert.rejects(stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options), {
                    code: 'ETIMEDOUT',
                });
                scope.done();
            });
        });
        mocha_1.describe('with basic client authentication', () => {
            const creds = `${basicAuth.clientId}:${basicAuth.clientSecret}`;
            mocha_1.it('should handle successful full request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedRequest, Object.assign({
                    Authorization: `Basic ${crypto.encodeBase64StringUtf8(creds)}`,
                }, additionalHeaders));
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, basicAuth);
                const resp = await stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle successful partial request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedPartialRequest, {
                    Authorization: `Basic ${crypto.encodeBase64StringUtf8(creds)}`,
                });
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, basicAuth);
                const resp = await stsCredentials.exchangeToken(partialStsCredentialsOptions);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle non-200 response', async () => {
                const expectedError = oauth2common_1.getErrorFromOAuthErrorResponse(errorResponse);
                const scope = mockStsTokenExchange(400, errorResponse, expectedRequest, Object.assign({
                    Authorization: `Basic ${crypto.encodeBase64StringUtf8(creds)}`,
                }, additionalHeaders));
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, basicAuth);
                await assert.rejects(stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options), expectedError);
                scope.done();
            });
        });
        mocha_1.describe('with request-body client authentication', () => {
            mocha_1.it('should handle successful full request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedRequestWithCreds, additionalHeaders);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, requestBodyAuth);
                const resp = await stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle successful partial request', async () => {
                const scope = mockStsTokenExchange(200, stsSuccessfulResponse, expectedPartialRequestWithCreds);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, requestBodyAuth);
                const resp = await stsCredentials.exchangeToken(partialStsCredentialsOptions);
                // Confirm raw GaxiosResponse appended to response.
                assertGaxiosResponsePresent(resp);
                delete resp.res;
                assert.deepStrictEqual(resp, stsSuccessfulResponse);
                scope.done();
            });
            mocha_1.it('should handle non-200 response', async () => {
                const expectedError = oauth2common_1.getErrorFromOAuthErrorResponse(errorResponse);
                const scope = mockStsTokenExchange(400, errorResponse, expectedRequestWithCreds, additionalHeaders);
                const stsCredentials = new stscredentials_1.StsCredentials(tokenExchangeEndpoint, requestBodyAuth);
                await assert.rejects(stsCredentials.exchangeToken(stsCredentialsOptions, additionalHeaders, options), expectedError);
                scope.done();
            });
        });
    });
});
//# sourceMappingURL=test.stscredentials.js.map