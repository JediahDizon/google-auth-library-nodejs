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
const awsclient_1 = require("../src/auth/awsclient");
const identitypoolclient_1 = require("../src/auth/identitypoolclient");
const externalclient_1 = require("../src/auth/externalclient");
const externalclienthelper_1 = require("./externalclienthelper");
const serviceAccountKeys = {
    type: 'service_account',
    project_id: 'PROJECT_ID',
    private_key_id: 'PRIVATE_KEY_ID',
    private_key: '-----BEGIN PRIVATE KEY-----\n' + 'REDACTED\n-----END PRIVATE KEY-----\n',
    client_email: '$PROJECT_ID@appspot.gserviceaccount.com',
    client_id: 'CLIENT_ID',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/' +
        'PROEJCT_ID%40appspot.gserviceaccount.com',
};
const fileSourcedOptions = {
    type: 'external_account',
    audience: externalclienthelper_1.getAudience(),
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: externalclienthelper_1.getTokenUrl(),
    credential_source: {
        file: './test/fixtures/external-subject-token.txt',
    },
};
const metadataBaseUrl = 'http://169.254.169.254';
const awsCredentialSource = {
    environment_id: 'aws1',
    region_url: `${metadataBaseUrl}/latest/meta-data/placement/availability-zone`,
    url: `${metadataBaseUrl}/latest/meta-data/iam/security-credentials`,
    regional_cred_verification_url: 'https://sts.{region}.amazonaws.com?' +
        'Action=GetCallerIdentity&Version=2011-06-15',
};
const awsOptions = {
    type: 'external_account',
    audience: externalclienthelper_1.getAudience(),
    subject_token_type: 'urn:ietf:params:aws:token-type:aws4_request',
    token_url: externalclienthelper_1.getTokenUrl(),
    credential_source: awsCredentialSource,
};
mocha_1.describe('ExternalAccountClient', () => {
    mocha_1.describe('Constructor', () => {
        mocha_1.it('should throw on initialization', () => {
            assert.throws(() => {
                return new externalclient_1.ExternalAccountClient();
            }, /ExternalAccountClients should be initialized via/);
        });
    });
    mocha_1.describe('fromJSON()', () => {
        const refreshOptions = {
            eagerRefreshThresholdMillis: 1000 * 10,
            forceRefreshOnFailure: true,
        };
        mocha_1.it('should return IdentityPoolClient on IdentityPoolClientOptions', () => {
            const expectedClient = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptions);
            assert.deepStrictEqual(externalclient_1.ExternalAccountClient.fromJSON(fileSourcedOptions), expectedClient);
        });
        mocha_1.it('should return IdentityPoolClient with expected RefreshOptions', () => {
            const expectedClient = new identitypoolclient_1.IdentityPoolClient(fileSourcedOptions, refreshOptions);
            assert.deepStrictEqual(externalclient_1.ExternalAccountClient.fromJSON(fileSourcedOptions, refreshOptions), expectedClient);
        });
        mocha_1.it('should return AwsClient on AwsClientOptions', () => {
            const expectedClient = new awsclient_1.AwsClient(awsOptions);
            assert.deepStrictEqual(externalclient_1.ExternalAccountClient.fromJSON(awsOptions), expectedClient);
        });
        mocha_1.it('should return AwsClient with expected RefreshOptions', () => {
            const expectedClient = new awsclient_1.AwsClient(awsOptions, refreshOptions);
            assert.deepStrictEqual(externalclient_1.ExternalAccountClient.fromJSON(awsOptions, refreshOptions), expectedClient);
        });
        mocha_1.it('should return null when given non-ExternalAccountClientOptions', () => {
            assert(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            externalclient_1.ExternalAccountClient.fromJSON(serviceAccountKeys) === null);
        });
        mocha_1.it('should throw when given invalid ExternalAccountClient', () => {
            const invalidOptions = Object.assign({}, fileSourcedOptions);
            delete invalidOptions.credential_source;
            assert.throws(() => {
                return externalclient_1.ExternalAccountClient.fromJSON(invalidOptions);
            });
        });
        mocha_1.it('should throw when given invalid IdentityPoolClient', () => {
            const invalidOptions = Object.assign({}, fileSourcedOptions);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invalidOptions.credential_source = {};
            assert.throws(() => {
                return externalclient_1.ExternalAccountClient.fromJSON(invalidOptions);
            });
        });
        mocha_1.it('should throw when given invalid AwsClientOptions', () => {
            const invalidOptions = Object.assign({}, awsOptions);
            invalidOptions.credential_source.environment_id = 'invalid';
            assert.throws(() => {
                return externalclient_1.ExternalAccountClient.fromJSON(invalidOptions);
            });
        });
    });
});
//# sourceMappingURL=test.externalclient.js.map