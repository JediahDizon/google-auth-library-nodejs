import * as nock from 'nock';
import { GetAccessTokenResponse } from '../src/auth/oauth2client';
import { OAuthErrorResponse } from '../src/auth/oauth2common';
import { StsSuccessfulResponse } from '../src/auth/stscredentials';
import { IamGenerateAccessTokenResponse, ProjectInfo } from '../src/auth/baseexternalclient';
interface CloudRequestError {
    error: {
        code: number;
        message: string;
        status: string;
    };
}
interface NockMockStsToken {
    statusCode: number;
    response: StsSuccessfulResponse | OAuthErrorResponse;
    request: {
        [key: string]: any;
    };
    additionalHeaders?: {
        [key: string]: string;
    };
}
interface NockMockGenerateAccessToken {
    statusCode: number;
    token: string;
    response: IamGenerateAccessTokenResponse | CloudRequestError;
    scopes: string[];
}
export declare function mockStsTokenExchange(nockParams: NockMockStsToken[]): nock.Scope;
export declare function mockGenerateAccessToken(nockParams: NockMockGenerateAccessToken[]): nock.Scope;
export declare function getAudience(projectNumber?: string): string;
export declare function getTokenUrl(): string;
export declare function getServiceAccountImpersonationUrl(): string;
export declare function assertGaxiosResponsePresent(resp: GetAccessTokenResponse): void;
export declare function mockCloudResourceManager(projectNumber: string, accessToken: string, statusCode: number, response: ProjectInfo | CloudRequestError): nock.Scope;
export {};
