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
const fs = require("fs");
const nock = require("nock");
const identitypoolclient_1 = require("../src/auth/identitypoolclient");
const baseexternalclient_1 = require("../src/auth/baseexternalclient");
const externalclienthelper_1 = require("./externalclienthelper");
nock.disableNetConnect();
const ONE_HOUR_IN_SECS = 3600;
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
function escapeRegExp(str) {
    // $& means the whole matched string.
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}
mocha_1.describe('IdentityPoolClient', () => {
    const fileSubjectToken = fs.readFileSync('./test/fixtures/external-subject-token.txt', 'utf-8');
    const audience = externalclienthelper_1.getAudience();
    const fileSourcedOptions = {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: externalclienthelper_1.getTokenUrl(),
        credential_source: {
            file: './test/fixtures/external-subject-token.txt',
        },
    };
    const fileSourcedOptionsWithSA = Object.assign({
        service_account_impersonation_url: externalclienthelper_1.getServiceAccountImpersonationUrl(),
    }, fileSourcedOptions);
    const jsonFileSourcedOptions = {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: externalclienthelper_1.getTokenUrl(),
        credential_source: {
            file: './test/fixtures/external-subject-token.json',
            format: {
                type: 'json',
                subject_token_field_name: 'access_token',
            },
        },
    };
    const jsonFileSourcedOptionsWithSA = Object.assign({
        service_account_impersonation_url: externalclienthelper_1.getServiceAccountImpersonationUrl(),
    }, jsonFileSourcedOptions);
    const fileSourcedOptionsNotFound = {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: externalclienthelper_1.getTokenUrl(),
        credential_source: {
            file: './test/fixtures/not-found',
        },
    };
    const metadataBaseUrl = 'http://169.254.169.254';
    const metadataPath = '/metadata/identity/oauth2/token?' + 'api-version=2018-02-01&resource=abc';
    const metadataHeaders = {
        Metadata: 'True',
        other: 'some-value',
    };
    const urlSourcedOptions = {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: externalclienthelper_1.getTokenUrl(),
        credential_source: {
            url: `${metadataBaseUrl}${metadataPath}`,
            headers: metadataHeaders,
        },
    };
    const urlSourcedOptionsWithSA = Object.assign({
        service_account_impersonation_url: externalclienthelper_1.getServiceAccountImpersonationUrl(),
    }, urlSourcedOptions);
    const jsonRespUrlSourcedOptions = {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: externalclienthelper_1.getTokenUrl(),
        credential_source: {
            url: `${metadataBaseUrl}${metadataPath}`,
            headers: metadataHeaders,
            format: {
                type: 'json',
                subject_token_field_name: 'access_token',
            },
        },
    };
    const jsonRespUrlSourcedOptionsWithSA = Object.assign({
        service_account_impersonation_url: externalclienthelper_1.getServiceAccountImpersonationUrl(),
    }, jsonRespUrlSourcedOptions);
    const stsSuccessfulResponse = {
        access_token: 'ACCESS_TOKEN',
        issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        token_type: 'Bearer',
        expires_in: ONE_HOUR_IN_SECS,
        scope: 'scope1 scope2',
    };
    mocha_1.it('should be a subclass of BaseExternalAccountClient', () => {
        assert(identitypoolclient_1.IdentityPoolClient.prototype instanceof baseexternalclient_1.BaseExternalAccountClient);
    });
    mocha_1.describe('Constructor', () => {
        mocha_1.it('should throw when invalid options are provided', () => {
            const expectedError = new Error('No valid Identity Pool "credential_source" provided');
            const invalidOptions = {
                type: 'external_account',
                audience,
                subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                token_url: externalclienthelper_1.getTokenUrl(),
                credential_source: {
                    other: 'invalid',
                },
            };
            assert.throws(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return new identitypoolclient_1.IdentityPoolClient(invalidOptions);
            }, expectedError);
        });
        mocha_1.it('should throw on invalid credential_source.format.type', () => {
            const expectedError = new Error('Invalid credential_source format "xml"');
            const invalidOptions = {
                type: 'external_account',
                audience,
                subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                token_url: externalclienthelper_1.getTokenUrl(),
                credential_source: {
                    file: './test/fixtures/external-subject-token.txt',
                    format: {
                        type: 'xml',
                    },
                },
            };
            assert.throws(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return new identitypoolclient_1.IdentityPoolClient(invalidOptions);
            }, expectedError);
        });
        mocha_1.it('should throw on required credential_source.format.subject_token_field_name', () => {
            const expectedError = new Error('Missing subject_token_field_name for JSON credential_source format');
            const invalidOptions = {
                type: 'external_account',
                audience,
                subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                token_url: externalclienthelper_1.getTokenUrl(),
                credential_source: {
                    file: './test/fixtures/external-subject-token.txt',
                    format: {
                        // json formats require the key where the subject_token is located.
                        type: 'json',
                    },
                },
            };
            assert.throws(() => {
                return new identitypoolclient_1.IdentityPoolClient(invalidOptions);
            }, expectedError);
        });
        mocha_1.it('should not throw when valid file-sourced options are provided', () => {
            assert.doesNotThrow(() => {
                return new identitypoolclient_1.IdentityPoolClient(fileSourcedOptions);
            });
        });
        mocha_1.it('should not throw when valid url-sourced options are provided', () => {
            assert.doesNotThrow(() => {
                return new identitypoolclient_1.IdentityPoolClient(urlSourcedOptions);
            });
        });
        mocha_1.it('should not throw on headerless url-sourced options', () => {
            const urlSourcedOptionsNoHeaders = Object.assign({}, urlSourcedOptions);
            urlSourcedOptionsNoHeaders.credential_source = {
                url: urlSourcedOptions.credential_source.url,
            };
            assert.doesNotThrow(() => {
                return new identitypoolclient_1.IdentityPoolClient(urlSourcedOptionsNoHeaders);
            });
        });
    });
    mocha_1.describe('for file-sourced subject tokens', () => {
        mocha_1.describe('retrieveSubjectToken()', () => {
            mocha_1.it('should resolve when the text file is found', async () => {
                const client = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptions);
                const subjectToken = await client.retrieveSubjectToken();
                assert.deepEqual(subjectToken, fileSubjectToken);
            });
            mocha_1.it('should resolve when the json file is found', async () => {
                const client = new identitypoolclient_1.IdentityPoolClient(jsonFileSourcedOptions);
                const subjectToken = await client.retrieveSubjectToken();
                assert.deepEqual(subjectToken, fileSubjectToken);
            });
            mocha_1.it('should reject when the json subject_token_field_name is not found', async () => {
                const expectedError = new Error('Unable to parse the subject_token from the credential_source file');
                const invalidOptions = {
                    type: 'external_account',
                    audience,
                    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                    token_url: externalclienthelper_1.getTokenUrl(),
                    credential_source: {
                        file: './test/fixtures/external-subject-token.json',
                        format: {
                            type: 'json',
                            subject_token_field_name: 'non-existent',
                        },
                    },
                };
                const client = new identitypoolclient_1.IdentityPoolClient(invalidOptions);
                await assert.rejects(client.retrieveSubjectToken(), expectedError);
            });
            mocha_1.it('should fail when the file is not found', async () => {
                const invalidFile = fileSourcedOptionsNotFound.credential_source.file;
                const client = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptionsNotFound);
                await assert.rejects(client.retrieveSubjectToken(), new RegExp(`The file at ${escapeRegExp(invalidFile)} does not exist, ` +
                    'or it is not a file'));
            });
            mocha_1.it('should fail when a folder is specified', async () => {
                const invalidOptions = Object.assign({}, fileSourcedOptions);
                invalidOptions.credential_source = {
                    // Specify a folder.
                    file: './test/fixtures',
                };
                const invalidFile = fs.realpathSync(invalidOptions.credential_source.file);
                const client = new identitypoolclient_1.IdentityPoolClient(invalidOptions);
                await assert.rejects(client.retrieveSubjectToken(), new RegExp(`The file at ${escapeRegExp(invalidFile)} does not exist, ` +
                    'or it is not a file'));
            });
        });
        mocha_1.describe('getAccessToken()', () => {
            mocha_1.it('should resolve on retrieveSubjectToken success for text format', async () => {
                const scope = externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token loaded from file should be used.
                            subject_token: fileSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]);
                const client = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptions);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: stsSuccessfulResponse.access_token,
                });
                scope.done();
            });
            mocha_1.it('should handle service account access token for text format', async () => {
                const now = new Date().getTime();
                const saSuccessResponse = {
                    accessToken: 'SA_ACCESS_TOKEN',
                    expireTime: new Date(now + ONE_HOUR_IN_SECS * 1000).toISOString(),
                };
                const scopes = [];
                scopes.push(externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token loaded from file should be used.
                            subject_token: fileSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]), externalclienthelper_1.mockGenerateAccessToken([
                    {
                        statusCode: 200,
                        response: saSuccessResponse,
                        token: stsSuccessfulResponse.access_token,
                        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                    },
                ]));
                const client = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptionsWithSA);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: saSuccessResponse.accessToken,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should resolve on retrieveSubjectToken success for json format', async () => {
                const scope = externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token loaded from file should be used.
                            subject_token: fileSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]);
                const client = new identitypoolclient_1.IdentityPoolClient(jsonFileSourcedOptions);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: stsSuccessfulResponse.access_token,
                });
                scope.done();
            });
            mocha_1.it('should handle service account access token for json format', async () => {
                const now = new Date().getTime();
                const saSuccessResponse = {
                    accessToken: 'SA_ACCESS_TOKEN',
                    expireTime: new Date(now + ONE_HOUR_IN_SECS * 1000).toISOString(),
                };
                const scopes = [];
                scopes.push(externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token loaded from file should be used.
                            subject_token: fileSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]), externalclienthelper_1.mockGenerateAccessToken([
                    {
                        statusCode: 200,
                        response: saSuccessResponse,
                        token: stsSuccessfulResponse.access_token,
                        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                    },
                ]));
                const client = new identitypoolclient_1.IdentityPoolClient(jsonFileSourcedOptionsWithSA);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: saSuccessResponse.accessToken,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should reject with retrieveSubjectToken error', async () => {
                const invalidFile = fileSourcedOptionsNotFound.credential_source.file;
                const client = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptionsNotFound);
                await assert.rejects(client.getAccessToken(), new RegExp(`The file at ${invalidFile} does not exist, or it is not a file`));
            });
        });
    });
    mocha_1.describe('for url-sourced subject tokens', () => {
        mocha_1.describe('retrieveSubjectToken()', () => {
            mocha_1.it('should resolve on text response success', async () => {
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, externalSubjectToken);
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptions);
                const subjectToken = await client.retrieveSubjectToken();
                assert.deepEqual(subjectToken, externalSubjectToken);
                scope.done();
            });
            mocha_1.it('should resolve on json response success', async () => {
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const jsonResponse = {
                    access_token: externalSubjectToken,
                };
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, jsonResponse);
                const client = new identitypoolclient_1.IdentityPoolClient(jsonRespUrlSourcedOptions);
                const subjectToken = await client.retrieveSubjectToken();
                assert.deepEqual(subjectToken, externalSubjectToken);
                scope.done();
            });
            mocha_1.it('should reject when the json subject_token_field_name is not found', async () => {
                const expectedError = new Error('Unable to parse the subject_token from the credential_source URL');
                const invalidOptions = {
                    type: 'external_account',
                    audience,
                    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                    token_url: externalclienthelper_1.getTokenUrl(),
                    credential_source: {
                        url: `${metadataBaseUrl}${metadataPath}`,
                        headers: metadataHeaders,
                        format: {
                            type: 'json',
                            subject_token_field_name: 'non-existent',
                        },
                    },
                };
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const jsonResponse = {
                    access_token: externalSubjectToken,
                };
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, jsonResponse);
                const client = new identitypoolclient_1.IdentityPoolClient(invalidOptions);
                await assert.rejects(client.retrieveSubjectToken(), expectedError);
                scope.done();
            });
            mocha_1.it('should ignore headers when not provided', async () => {
                // Create options without headers.
                const urlSourcedOptionsNoHeaders = Object.assign({}, urlSourcedOptions);
                urlSourcedOptionsNoHeaders.credential_source = {
                    url: urlSourcedOptions.credential_source.url,
                };
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath)
                    .reply(200, externalSubjectToken);
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptionsNoHeaders);
                const subjectToken = await client.retrieveSubjectToken();
                assert.deepEqual(subjectToken, externalSubjectToken);
                scope.done();
            });
            mocha_1.it('should reject with underlying on non-200 response', async () => {
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(404);
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptions);
                await assert.rejects(client.retrieveSubjectToken(), {
                    code: '404',
                });
                scope.done();
            });
        });
        mocha_1.describe('getAccessToken()', () => {
            mocha_1.it('should resolve on retrieveSubjectToken success for text format', async () => {
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const scopes = [];
                scopes.push(externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token retrieved from url should be used.
                            subject_token: externalSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]));
                scopes.push(nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, externalSubjectToken));
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptions);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: stsSuccessfulResponse.access_token,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should handle service account access token for text format', async () => {
                const now = new Date().getTime();
                const saSuccessResponse = {
                    accessToken: 'SA_ACCESS_TOKEN',
                    expireTime: new Date(now + ONE_HOUR_IN_SECS * 1000).toISOString(),
                };
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const scopes = [];
                scopes.push(nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, externalSubjectToken), externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token retrieved from url should be used.
                            subject_token: externalSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]), externalclienthelper_1.mockGenerateAccessToken([
                    {
                        statusCode: 200,
                        response: saSuccessResponse,
                        token: stsSuccessfulResponse.access_token,
                        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                    },
                ]));
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptionsWithSA);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: saSuccessResponse.accessToken,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should resolve on retrieveSubjectToken success for json format', async () => {
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const jsonResponse = {
                    access_token: externalSubjectToken,
                };
                const scopes = [];
                scopes.push(externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token retrieved from url should be used.
                            subject_token: externalSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]));
                scopes.push(nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, jsonResponse));
                const client = new identitypoolclient_1.IdentityPoolClient(jsonRespUrlSourcedOptions);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: stsSuccessfulResponse.access_token,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should handle service account access token for json format', async () => {
                const now = new Date().getTime();
                const saSuccessResponse = {
                    accessToken: 'SA_ACCESS_TOKEN',
                    expireTime: new Date(now + ONE_HOUR_IN_SECS * 1000).toISOString(),
                };
                const externalSubjectToken = 'SUBJECT_TOKEN_1';
                const jsonResponse = {
                    access_token: externalSubjectToken,
                };
                const scopes = [];
                scopes.push(nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(200, jsonResponse), externalclienthelper_1.mockStsTokenExchange([
                    {
                        statusCode: 200,
                        response: stsSuccessfulResponse,
                        request: {
                            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                            audience,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                            requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                            // Subject token retrieved from url should be used.
                            subject_token: externalSubjectToken,
                            subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
                        },
                    },
                ]), externalclienthelper_1.mockGenerateAccessToken([
                    {
                        statusCode: 200,
                        response: saSuccessResponse,
                        token: stsSuccessfulResponse.access_token,
                        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
                    },
                ]));
                const client = new identitypoolclient_1.IdentityPoolClient(jsonRespUrlSourcedOptionsWithSA);
                const actualResponse = await client.getAccessToken();
                // Confirm raw GaxiosResponse appended to response.
                externalclienthelper_1.assertGaxiosResponsePresent(actualResponse);
                delete actualResponse.res;
                assert.deepStrictEqual(actualResponse, {
                    token: saSuccessResponse.accessToken,
                });
                scopes.forEach(scope => scope.done());
            });
            mocha_1.it('should reject with retrieveSubjectToken error', async () => {
                const scope = nock(metadataBaseUrl)
                    .get(metadataPath, undefined, {
                    reqheaders: metadataHeaders,
                })
                    .reply(404);
                const client = new identitypoolclient_1.IdentityPoolClient(urlSourcedOptions);
                await assert.rejects(client.getAccessToken(), {
                    code: '404',
                });
                scope.done();
            });
        });
    });
});
//# sourceMappingURL=test.identitypoolclient.js.map