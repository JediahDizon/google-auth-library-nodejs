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
exports.mockCloudResourceManager = exports.assertGaxiosResponsePresent = exports.getServiceAccountImpersonationUrl = exports.getTokenUrl = exports.getAudience = exports.mockGenerateAccessToken = exports.mockStsTokenExchange = void 0;
const assert = require("assert");
const nock = require("nock");
const qs = require("querystring");
const defaultProjectNumber = '123456';
const poolId = 'POOL_ID';
const providerId = 'PROVIDER_ID';
const baseUrl = 'https://sts.googleapis.com';
const path = '/v1/token';
const saEmail = 'service-1234@service-name.iam.gserviceaccount.com';
const saBaseUrl = 'https://iamcredentials.googleapis.com';
const saPath = `/v1/projects/-/serviceAccounts/${saEmail}:generateAccessToken`;
function mockStsTokenExchange(nockParams) {
    const scope = nock(baseUrl);
    nockParams.forEach(nockMockStsToken => {
        const headers = Object.assign({
            'content-type': 'application/x-www-form-urlencoded',
        }, nockMockStsToken.additionalHeaders || {});
        scope
            .post(path, qs.stringify(nockMockStsToken.request), {
            reqheaders: headers,
        })
            .reply(nockMockStsToken.statusCode, nockMockStsToken.response);
    });
    return scope;
}
exports.mockStsTokenExchange = mockStsTokenExchange;
function mockGenerateAccessToken(nockParams) {
    const scope = nock(saBaseUrl);
    nockParams.forEach(nockMockGenerateAccessToken => {
        const token = nockMockGenerateAccessToken.token;
        scope
            .post(saPath, {
            scope: nockMockGenerateAccessToken.scopes,
        }, {
            reqheaders: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
            .reply(nockMockGenerateAccessToken.statusCode, nockMockGenerateAccessToken.response);
    });
    return scope;
}
exports.mockGenerateAccessToken = mockGenerateAccessToken;
function getAudience(projectNumber = defaultProjectNumber) {
    return (`//iam.googleapis.com/projects/${projectNumber}` +
        `/locations/global/workloadIdentityPools/${poolId}/` +
        `providers/${providerId}`);
}
exports.getAudience = getAudience;
function getTokenUrl() {
    return `${baseUrl}${path}`;
}
exports.getTokenUrl = getTokenUrl;
function getServiceAccountImpersonationUrl() {
    return `${saBaseUrl}${saPath}`;
}
exports.getServiceAccountImpersonationUrl = getServiceAccountImpersonationUrl;
function assertGaxiosResponsePresent(resp) {
    const gaxiosResponse = resp.res || {};
    assert('data' in gaxiosResponse && 'status' in gaxiosResponse);
}
exports.assertGaxiosResponsePresent = assertGaxiosResponsePresent;
function mockCloudResourceManager(projectNumber, accessToken, statusCode, response) {
    return nock('https://cloudresourcemanager.googleapis.com')
        .get(`/v1/projects/${projectNumber}`, undefined, {
        reqheaders: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .reply(statusCode, response);
}
exports.mockCloudResourceManager = mockCloudResourceManager;
//# sourceMappingURL=externalclienthelper.js.map