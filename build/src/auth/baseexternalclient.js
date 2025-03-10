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
exports.BaseExternalAccountClient = exports.CLOUD_RESOURCE_MANAGER = exports.EXTERNAL_ACCOUNT_TYPE = exports.EXPIRATION_TIME_OFFSET = void 0;
const stream = require("stream");
const authclient_1 = require("./authclient");
const sts = require("./stscredentials");
/**
 * The required token exchange grant_type: rfc8693#section-2.1
 */
const STS_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
/**
 * The requested token exchange requested_token_type: rfc8693#section-2.1
 */
const STS_REQUEST_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
/** The default OAuth scope to request when none is provided. */
const DEFAULT_OAUTH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
/**
 * Offset to take into account network delays and server clock skews.
 */
exports.EXPIRATION_TIME_OFFSET = 5 * 60 * 1000;
/**
 * The credentials JSON file type for external account clients.
 * There are 3 types of JSON configs:
 * 1. authorized_user => Google end user credential
 * 2. service_account => Google service account credential
 * 3. external_Account => non-GCP service (eg. AWS, Azure, K8s)
 */
exports.EXTERNAL_ACCOUNT_TYPE = 'external_account';
/** Cloud resource manager URL used to retrieve project information. */
exports.CLOUD_RESOURCE_MANAGER = 'https://cloudresourcemanager.googleapis.com/v1/projects/';
/**
 * Base external account client. This is used to instantiate AuthClients for
 * exchanging external account credentials for GCP access token and authorizing
 * requests to GCP APIs.
 * The base class implements common logic for exchanging various type of
 * external credentials for GCP access token. The logic of determining and
 * retrieving the external credential based on the environment and
 * credential_source will be left for the subclasses.
 */
class BaseExternalAccountClient extends authclient_1.AuthClient {
    /**
     * Instantiate a BaseExternalAccountClient instance using the provided JSON
     * object loaded from an external account credentials file.
     * @param options The external account options object typically loaded
     *   from the external account JSON credential file.
     * @param additionalOptions Optional additional behavior customization
     *   options. These currently customize expiration threshold time and
     *   whether to retry on 401/403 API request errors.
     */
    constructor(options, additionalOptions) {
        super();
        if (options.type !== exports.EXTERNAL_ACCOUNT_TYPE) {
            throw new Error(`Expected "${exports.EXTERNAL_ACCOUNT_TYPE}" type but ` +
                `received "${options.type}"`);
        }
        const clientAuth = options.client_id
            ? {
                confidentialClientType: 'basic',
                clientId: options.client_id,
                clientSecret: options.client_secret,
            }
            : undefined;
        this.stsCredential = new sts.StsCredentials(options.token_url, clientAuth);
        // Default OAuth scope. This could be overridden via public property.
        this.scopes = [DEFAULT_OAUTH_SCOPE];
        this.cachedAccessToken = null;
        this.audience = options.audience;
        this.subjectTokenType = options.subject_token_type;
        this.quotaProjectId = options.quota_project_id;
        this.serviceAccountImpersonationUrl =
            options.service_account_impersonation_url;
        // As threshold could be zero,
        // eagerRefreshThresholdMillis || EXPIRATION_TIME_OFFSET will override the
        // zero value.
        if (typeof (additionalOptions === null || additionalOptions === void 0 ? void 0 : additionalOptions.eagerRefreshThresholdMillis) !== 'number') {
            this.eagerRefreshThresholdMillis = exports.EXPIRATION_TIME_OFFSET;
        }
        else {
            this.eagerRefreshThresholdMillis = additionalOptions
                .eagerRefreshThresholdMillis;
        }
        this.forceRefreshOnFailure = !!(additionalOptions === null || additionalOptions === void 0 ? void 0 : additionalOptions.forceRefreshOnFailure);
        this.projectId = null;
        this.projectNumber = this.getProjectNumber(this.audience);
    }
    /**
     * Provides a mechanism to inject GCP access tokens directly.
     * When the provided credential expires, a new credential, using the
     * external account options, is retrieved.
     * @param credentials The Credentials object to set on the current client.
     */
    setCredentials(credentials) {
        super.setCredentials(credentials);
        this.cachedAccessToken = credentials;
    }
    /**
     * @return A promise that resolves with the current GCP access token
     *   response. If the current credential is expired, a new one is retrieved.
     */
    async getAccessToken() {
        // If cached access token is unavailable or expired, force refresh.
        if (!this.cachedAccessToken || this.isExpired(this.cachedAccessToken)) {
            await this.refreshAccessTokenAsync();
        }
        // Return GCP access token in GetAccessTokenResponse format.
        return {
            token: this.cachedAccessToken.access_token,
            res: this.cachedAccessToken.res,
        };
    }
    /**
     * The main authentication interface. It takes an optional url which when
     * present is the endpoint> being accessed, and returns a Promise which
     * resolves with authorization header fields.
     *
     * The result has the form:
     * { Authorization: 'Bearer <access_token_value>' }
     */
    async getRequestHeaders() {
        const accessTokenResponse = await this.getAccessToken();
        const headers = {
            Authorization: `Bearer ${accessTokenResponse.token}`,
        };
        return this.addSharedMetadataHeaders(headers);
    }
    request(opts, callback) {
        if (callback) {
            this.requestAsync(opts).then(r => callback(null, r), e => {
                return callback(e, e.response);
            });
        }
        else {
            return this.requestAsync(opts);
        }
    }
    /**
     * @return A promise that resolves with the project ID corresponding to the
     *   current workload identity pool. When not determinable, this resolves with
     *   null.
     *   This is introduced to match the current pattern of using the Auth
     *   library:
     *   const projectId = await auth.getProjectId();
     *   const url = `https://dns.googleapis.com/dns/v1/projects/${projectId}`;
     *   const res = await client.request({ url });
     *   The resource may not have permission
     *   (resourcemanager.projects.get) to call this API or the required
     *   scopes may not be selected:
     *   https://cloud.google.com/resource-manager/reference/rest/v1/projects/get#authorization-scopes
     */
    async getProjectId() {
        if (this.projectId) {
            // Return previously determined project ID.
            return this.projectId;
        }
        else if (this.projectNumber) {
            // Preferable not to use request() to avoid retrial policies.
            const headers = await this.getRequestHeaders();
            const response = await this.transporter.request({
                headers,
                url: `${exports.CLOUD_RESOURCE_MANAGER}${this.projectNumber}`,
                responseType: 'json',
            });
            this.projectId = response.data.projectId;
            return this.projectId;
        }
        return null;
    }
    /**
     * Authenticates the provided HTTP request, processes it and resolves with the
     * returned response.
     * @param opts The HTTP request options.
     * @param retry Whether the current attempt is a retry after a failed attempt.
     * @return A promise that resolves with the successful response.
     */
    async requestAsync(opts, retry = false) {
        let response;
        try {
            const requestHeaders = await this.getRequestHeaders();
            opts.headers = opts.headers || {};
            if (requestHeaders && requestHeaders['x-goog-user-project']) {
                opts.headers['x-goog-user-project'] =
                    requestHeaders['x-goog-user-project'];
            }
            if (requestHeaders && requestHeaders.Authorization) {
                opts.headers.Authorization = requestHeaders.Authorization;
            }
            response = await this.transporter.request(opts);
        }
        catch (e) {
            const res = e.response;
            if (res) {
                const statusCode = res.status;
                // Retry the request for metadata if the following criteria are true:
                // - We haven't already retried.  It only makes sense to retry once.
                // - The response was a 401 or a 403
                // - The request didn't send a readableStream
                // - forceRefreshOnFailure is true
                const isReadableStream = res.config.data instanceof stream.Readable;
                const isAuthErr = statusCode === 401 || statusCode === 403;
                if (!retry &&
                    isAuthErr &&
                    !isReadableStream &&
                    this.forceRefreshOnFailure) {
                    await this.refreshAccessTokenAsync();
                    return await this.requestAsync(opts, true);
                }
            }
            throw e;
        }
        return response;
    }
    /**
     * Forces token refresh, even if unexpired tokens are currently cached.
     * External credentials are exchanged for GCP access tokens via the token
     * exchange endpoint and other settings provided in the client options
     * object.
     * If the service_account_impersonation_url is provided, an additional
     * step to exchange the external account GCP access token for a service
     * account impersonated token is performed.
     * @return A promise that resolves with the fresh GCP access tokens.
     */
    async refreshAccessTokenAsync() {
        // Retrieve the external credential.
        const subjectToken = await this.retrieveSubjectToken();
        // Construct the STS credentials options.
        const stsCredentialsOptions = {
            grantType: STS_GRANT_TYPE,
            audience: this.audience,
            requestedTokenType: STS_REQUEST_TOKEN_TYPE,
            subjectToken,
            subjectTokenType: this.subjectTokenType,
            // generateAccessToken requires the provided access token to have
            // scopes:
            // https://www.googleapis.com/auth/iam or
            // https://www.googleapis.com/auth/cloud-platform
            // The new service account access token scopes will match the user
            // provided ones.
            scope: this.serviceAccountImpersonationUrl
                ? [DEFAULT_OAUTH_SCOPE]
                : this.getScopesArray(),
        };
        // Exchange the external credentials for a GCP access token.
        const stsResponse = await this.stsCredential.exchangeToken(stsCredentialsOptions);
        if (this.serviceAccountImpersonationUrl) {
            this.cachedAccessToken = await this.getImpersonatedAccessToken(stsResponse.access_token);
        }
        else {
            // Save response in cached access token.
            this.cachedAccessToken = {
                access_token: stsResponse.access_token,
                expiry_date: new Date().getTime() + stsResponse.expires_in * 1000,
                res: stsResponse.res,
            };
        }
        // Save credentials.
        this.credentials = {};
        Object.assign(this.credentials, this.cachedAccessToken);
        delete this.credentials.res;
        // Trigger tokens event to notify external listeners.
        this.emit('tokens', {
            refresh_token: null,
            expiry_date: this.cachedAccessToken.expiry_date,
            access_token: this.cachedAccessToken.access_token,
            token_type: 'Bearer',
            id_token: null,
        });
        // Return the cached access token.
        return this.cachedAccessToken;
    }
    /**
     * Returns the workload identity pool project number if it is determinable
     * from the audience resource name.
     * @param audience The STS audience used to determine the project number.
     * @return The project number associated with the workload identity pool, if
     *   this can be determined from the STS audience field. Otherwise, null is
     *   returned.
     */
    getProjectNumber(audience) {
        // STS audience pattern:
        // //iam.googleapis.com/projects/$PROJECT_NUMBER/locations/...
        const match = audience.match(/\/projects\/([^/]+)/);
        if (!match) {
            return null;
        }
        return match[1];
    }
    /**
     * Exchanges an external account GCP access token for a service
     * account impersonated access token using iamcredentials
     * GenerateAccessToken API.
     * @param token The access token to exchange for a service account access
     *   token.
     * @return A promise that resolves with the service account impersonated
     *   credentials response.
     */
    async getImpersonatedAccessToken(token) {
        const opts = {
            url: this.serviceAccountImpersonationUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            data: {
                scope: this.getScopesArray(),
            },
            responseType: 'json',
        };
        const response = await this.transporter.request(opts);
        const successResponse = response.data;
        return {
            access_token: successResponse.accessToken,
            // Convert from ISO format to timestamp.
            expiry_date: new Date(successResponse.expireTime).getTime(),
            res: response,
        };
    }
    /**
     * Returns whether the provided credentials are expired or not.
     * If there is no expiry time, assumes the token is not expired or expiring.
     * @param accessToken The credentials to check for expiration.
     * @return Whether the credentials are expired or not.
     */
    isExpired(accessToken) {
        const now = new Date().getTime();
        return accessToken.expiry_date
            ? now >= accessToken.expiry_date - this.eagerRefreshThresholdMillis
            : false;
    }
    /**
     * @return The list of scopes for the requested GCP access token.
     */
    getScopesArray() {
        // Since scopes can be provided as string or array, the type should
        // be normalized.
        if (typeof this.scopes === 'string') {
            return [this.scopes];
        }
        else if (typeof this.scopes === 'undefined') {
            return [DEFAULT_OAUTH_SCOPE];
        }
        else {
            return this.scopes;
        }
    }
}
exports.BaseExternalAccountClient = BaseExternalAccountClient;
//# sourceMappingURL=baseexternalclient.js.map