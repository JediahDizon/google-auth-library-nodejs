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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityPoolClient = void 0;
const fs = require("fs");
const util_1 = require("util");
const baseexternalclient_1 = require("./baseexternalclient");
// fs.readfile is undefined in browser karma tests causing
// `npm run browser-test` to fail as test.oauth2.ts imports this file via
// src/index.ts.
// Fallback to void function to avoid promisify throwing a TypeError.
const readFile = util_1.promisify((_a = fs.readFile) !== null && _a !== void 0 ? _a : (() => { }));
const realpath = util_1.promisify((_b = fs.realpath) !== null && _b !== void 0 ? _b : (() => { }));
const lstat = util_1.promisify((_c = fs.lstat) !== null && _c !== void 0 ? _c : (() => { }));
/**
 * Defines the Url-sourced and file-sourced external account clients mainly
 * used for K8s and Azure workloads.
 */
class IdentityPoolClient extends baseexternalclient_1.BaseExternalAccountClient {
    /**
     * Instantiate an IdentityPoolClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * An error is thrown if the credential is not a valid file-sourced or
     * url-sourced credential.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions Optional additional behavior customization
     *   options. These currently customize expiration threshold time and
     *   whether to retry on 401/403 API request errors.
     */
    constructor(options, additionalOptions) {
        var _a, _b;
        super(options, additionalOptions);
        this.file = options.credential_source.file;
        this.url = options.credential_source.url;
        this.headers = options.credential_source.headers;
        if (!this.file && !this.url) {
            throw new Error('No valid Identity Pool "credential_source" provided');
        }
        // Text is the default format type.
        this.formatType = ((_a = options.credential_source.format) === null || _a === void 0 ? void 0 : _a.type) || 'text';
        this.formatSubjectTokenFieldName = (_b = options.credential_source.format) === null || _b === void 0 ? void 0 : _b.subject_token_field_name;
        if (this.formatType !== 'json' && this.formatType !== 'text') {
            throw new Error(`Invalid credential_source format "${this.formatType}"`);
        }
        if (this.formatType === 'json' && !this.formatSubjectTokenFieldName) {
            throw new Error('Missing subject_token_field_name for JSON credential_source format');
        }
    }
    /**
     * Triggered when a external subject token is needed to be exchanged for a GCP
     * access token via GCP STS endpoint.
     * This uses the `options.credential_source` object to figure out how
     * to retrieve the token using the current environment. In this case,
     * this either retrieves the local credential from a file location (k8s
     * workload) or by sending a GET request to a local metadata server (Azure
     * workloads).
     * @return A promise that resolves with the external subject token.
     */
    async retrieveSubjectToken() {
        if (this.file) {
            return await this.getTokenFromFile(this.file, this.formatType, this.formatSubjectTokenFieldName);
        }
        return await this.getTokenFromUrl(this.url, this.formatType, this.formatSubjectTokenFieldName, this.headers);
    }
    /**
     * Looks up the external subject token in the file path provided and
     * resolves with that token.
     * @param file The file path where the external credential is located.
     * @param formatType The token file or URL response type (JSON or text).
     * @param formatSubjectTokenFieldName For JSON response types, this is the
     *   subject_token field name. For Azure, this is access_token. For text
     *   response types, this is ignored.
     * @return A promise that resolves with the external subject token.
     */
    async getTokenFromFile(filePath, formatType, formatSubjectTokenFieldName) {
        // Make sure there is a file at the path. lstatSync will throw if there is
        // nothing there.
        try {
            // Resolve path to actual file in case of symlink. Expect a thrown error
            // if not resolvable.
            filePath = await realpath(filePath);
            if (!(await lstat(filePath)).isFile()) {
                throw new Error();
            }
        }
        catch (err) {
            err.message = `The file at ${filePath} does not exist, or it is not a file. ${err.message}`;
            throw err;
        }
        let subjectToken;
        const rawText = await readFile(filePath, { encoding: 'utf8' });
        if (formatType === 'text') {
            subjectToken = rawText;
        }
        else if (formatType === 'json' && formatSubjectTokenFieldName) {
            const json = JSON.parse(rawText);
            subjectToken = json[formatSubjectTokenFieldName];
        }
        if (!subjectToken) {
            throw new Error('Unable to parse the subject_token from the credential_source file');
        }
        return subjectToken;
    }
    /**
     * Sends a GET request to the URL provided and resolves with the returned
     * external subject token.
     * @param url The URL to call to retrieve the subject token. This is typically
     *   a local metadata server.
     * @param formatType The token file or URL response type (JSON or text).
     * @param formatSubjectTokenFieldName For JSON response types, this is the
     *   subject_token field name. For Azure, this is access_token. For text
     *   response types, this is ignored.
     * @param headers The optional additional headers to send with the request to
     *   the metadata server url.
     * @return A promise that resolves with the external subject token.
     */
    async getTokenFromUrl(url, formatType, formatSubjectTokenFieldName, headers) {
        const opts = {
            url,
            method: 'GET',
            headers,
            responseType: formatType,
        };
        let subjectToken;
        if (formatType === 'text') {
            const response = await this.transporter.request(opts);
            subjectToken = response.data;
        }
        else if (formatType === 'json' && formatSubjectTokenFieldName) {
            const response = await this.transporter.request(opts);
            subjectToken = response.data[formatSubjectTokenFieldName];
        }
        if (!subjectToken) {
            throw new Error('Unable to parse the subject_token from the credential_source URL');
        }
        return subjectToken;
    }
}
exports.IdentityPoolClient = IdentityPoolClient;
//# sourceMappingURL=identitypoolclient.js.map