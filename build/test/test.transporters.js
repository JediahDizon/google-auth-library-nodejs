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
const nock = require("nock");
const transporters_1 = require("../src/transporters");
mocha_1.describe('transporters', () => {
    const savedEnv = process.env;
    mocha_1.afterEach(() => {
        process.env = savedEnv;
    });
    nock.disableNetConnect();
    const defaultUserAgentRE = 'google-api-nodejs-client/\\d+.\\d+.\\d+';
    const transporter = new transporters_1.DefaultTransporter();
    mocha_1.it('should set default adapter to node.js', () => {
        const opts = transporter.configure();
        const re = new RegExp(defaultUserAgentRE);
        assert(re.test(opts.headers['User-Agent']));
    });
    mocha_1.it('should append default client user agent to the existing user agent', () => {
        const applicationName = 'MyTestApplication-1.0';
        const opts = transporter.configure({
            headers: { 'User-Agent': applicationName },
            url: '',
        });
        const re = new RegExp(applicationName + ' ' + defaultUserAgentRE);
        assert(re.test(opts.headers['User-Agent']));
    });
    mocha_1.it('should not append default client user agent to the existing user agent more than once', () => {
        const appName = 'MyTestApplication-1.0 google-api-nodejs-client/foobear';
        const opts = transporter.configure({
            headers: { 'User-Agent': appName },
            url: '',
        });
        assert.strictEqual(opts.headers['User-Agent'], appName);
    });
    mocha_1.it('should add x-goog-api-client header if none exists', () => {
        const opts = transporter.configure({
            url: '',
        });
        assert(/^gl-node\/[.-\w$]+ auth\/[.-\w$]+$/.test(opts.headers['x-goog-api-client']));
    });
    mocha_1.it('should append to x-goog-api-client header if it exists', () => {
        const opts = transporter.configure({
            headers: { 'x-goog-api-client': 'gdcl/1.0.0' },
            url: '',
        });
        assert(/^gdcl\/[.-\w$]+ auth\/[.-\w$]+$/.test(opts.headers['x-goog-api-client']));
    });
    // see: https://github.com/googleapis/google-auth-library-nodejs/issues/819
    mocha_1.it('should not append x-goog-api-client header multiple times', () => {
        const opts = {
            headers: { 'x-goog-api-client': 'gdcl/1.0.0' },
            url: '',
        };
        let configuredOpts = transporter.configure(opts);
        configuredOpts = transporter.configure(opts);
        assert(/^gdcl\/[.-\w$]+ auth\/[.-\w$]+$/.test(configuredOpts.headers['x-goog-api-client']));
    });
    mocha_1.it('should create a single error from multiple response errors', done => {
        const firstError = { message: 'Error 1' };
        const secondError = { message: 'Error 2' };
        const url = 'http://example.com';
        const scope = nock(url)
            .get('/')
            .reply(400, { error: { code: 500, errors: [firstError, secondError] } });
        transporter.request({ url }, error => {
            scope.done();
            assert.strictEqual(error.message, 'Error 1\nError 2');
            assert.strictEqual(error.code, 500);
            assert.strictEqual(error.errors.length, 2);
            done();
        });
    });
    mocha_1.it('should return an error for a 404 response', done => {
        const url = 'http://example.com';
        const scope = nock(url).get('/').reply(404, 'Not found');
        transporter.request({ url }, error => {
            scope.done();
            assert.strictEqual(error.message, 'Not found');
            assert.strictEqual(error.code, '404');
            done();
        });
    });
    mocha_1.it('should return an error if you try to use request config options', done => {
        const expected = "'uri' is not a valid configuration option. Please use 'url' instead. This library is using Axios for requests. Please see https://github.com/axios/axios to learn more about the valid request options.";
        transporter.request({
            uri: 'http://example.com/api',
        }, error => {
            assert.strictEqual(error.message, expected);
            done();
        });
    });
    mocha_1.it('should return an error if you try to use request config options with a promise', async () => {
        const expected = new RegExp("'uri' is not a valid configuration option. Please use 'url' instead. This " +
            'library is using Axios for requests. Please see https://github.com/axios/axios ' +
            'to learn more about the valid request options.');
        const uri = 'http://example.com/api';
        assert.throws(() => transporter.request({ uri }), expected);
    });
    mocha_1.it('should support invocation with async/await', async () => {
        const url = 'http://example.com';
        const scope = nock(url).get('/').reply(200);
        const res = await transporter.request({ url });
        scope.done();
        assert.strictEqual(res.status, 200);
    });
    mocha_1.it('should throw if using async/await', async () => {
        const url = 'http://example.com';
        const scope = nock(url).get('/').reply(500, '🦃');
        await assert.rejects(transporter.request({ url }), /🦃/);
        scope.done();
    });
    mocha_1.it('should work with a callback', done => {
        const url = 'http://example.com';
        const scope = nock(url).get('/').reply(200);
        transporter.request({ url }, (err, res) => {
            scope.done();
            assert.strictEqual(err, null);
            assert.strictEqual(res.status, 200);
            done();
        });
    });
    // tslint:disable-next-line ban
    mocha_1.it.skip('should use the https proxy if one is configured', async () => {
        process.env['https_proxy'] = 'https://han:solo@proxy-server:1234';
        const transporter = new transporters_1.DefaultTransporter();
        const scope = nock('https://proxy-server:1234')
            .get('https://example.com/fake', undefined, {
            reqheaders: {
                host: 'example.com',
                accept: /.*/g,
                'user-agent': /google-api-nodejs-client\/.*/g,
                'proxy-authorization': /.*/g,
            },
        })
            .reply(200);
        const url = 'https://example.com/fake';
        const result = await transporter.request({ url });
        scope.done();
        assert.strictEqual(result.status, 200);
    });
});
//# sourceMappingURL=test.transporters.js.map