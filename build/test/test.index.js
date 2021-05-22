"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright 2017 Google LLC
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
const assert = require("assert");
const mocha_1 = require("mocha");
const gal = require("../src");
mocha_1.describe('index', () => {
    mocha_1.it('should publicly export GoogleAuth', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cjs = require('../src/');
        assert.strictEqual(cjs.GoogleAuth, gal.GoogleAuth);
    });
    mocha_1.it('should publicly export DefaultTransporter', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cjs = require('../src');
        assert.strictEqual(cjs.DefaultTransporter, gal.DefaultTransporter);
    });
    mocha_1.it('should export all the things', () => {
        assert(gal.CodeChallengeMethod);
        assert(gal.Compute);
        assert(gal.DefaultTransporter);
        assert(gal.IAMAuth);
        assert(gal.JWT);
        assert(gal.JWTAccess);
        assert(gal.OAuth2Client);
        assert(gal.UserRefreshClient);
        assert(gal.GoogleAuth);
        assert(gal.ExternalAccountClient);
        assert(gal.IdentityPoolClient);
        assert(gal.AwsClient);
        assert(gal.BaseExternalAccountClient);
    });
});
//# sourceMappingURL=test.index.js.map