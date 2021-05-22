"use strict";
// Copyright 2020 Google LLC
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
const fs = require("fs");
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const crypto_1 = require("../src/crypto/crypto");
const crypto_2 = require("../src/crypto/node/crypto");
const publicKey = fs.readFileSync('./test/fixtures/public.pem', 'utf-8');
const privateKey = fs.readFileSync('./test/fixtures/private.pem', 'utf-8');
/**
 * Converts a Node.js Buffer to an ArrayBuffer.
 * https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
 * @param buffer The Buffer input to covert.
 * @return The ArrayBuffer representation of the input.
 */
function toArrayBuffer(buffer) {
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const arrayBufferView = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; i++) {
        arrayBufferView[i] = buffer[i];
    }
    return arrayBuffer;
}
mocha_1.describe('crypto', () => {
    const crypto = crypto_1.createCrypto();
    mocha_1.it('should create a NodeCrypto instance', () => {
        chai_1.assert(crypto instanceof crypto_2.NodeCrypto);
    });
    mocha_1.it('should calculate SHA256 digest', async () => {
        const input = 'I can calculate SHA256';
        const expectedDigest = 'c9CEhti/1PtLwS3YkDYE3b3lrZW276VnvXI86BqIESI=';
        const calculatedDigest = await crypto.sha256DigestBase64(input);
        chai_1.assert.strictEqual(calculatedDigest, expectedDigest);
    });
    mocha_1.it('should generate random bytes', () => {
        const requestedLength = 20;
        const generated1Base64 = crypto.randomBytesBase64(requestedLength);
        const generated1 = Buffer.from(generated1Base64, 'base64');
        chai_1.assert.strictEqual(generated1.length, requestedLength);
        const generated2Base64 = crypto.randomBytesBase64(requestedLength);
        const generated2 = Buffer.from(generated2Base64, 'base64');
        chai_1.assert.strictEqual(generated2.length, requestedLength);
        // random strings are random! let's just check they are different.
        // if they are the same, we have a problem.
        chai_1.assert.notStrictEqual(generated1Base64, generated2Base64);
    });
    mocha_1.it('should verify a signature', async () => {
        const message = 'This message is signed';
        const signatureBase64 = [
            'ufyKBV+Ar7Yq8CSmSIN9m38ch4xnWBz8CP4qHh6V+',
            'm4cCbeXdR1MEmWVhNJjZQFv3KL3tDAnl0Q4bTcSR/',
            'mmhXaRjdxyJ6xAUp0KcbVq6xsDIbnnYHSgYr3zVoS',
            'dRRefWSWTknN1S69fNmKEfUeBIJA93xitr3pbqtLC',
            'bP28XNU',
        ].join(''); // note: no padding
        const verified = await crypto.verify(publicKey, message, signatureBase64);
        chai_1.assert(verified);
    });
    mocha_1.it('should sign a message', async () => {
        const message = 'This message is signed';
        const expectedSignatureBase64 = [
            'ufyKBV+Ar7Yq8CSmSIN9m38ch4xnWBz8CP4qHh6V+',
            'm4cCbeXdR1MEmWVhNJjZQFv3KL3tDAnl0Q4bTcSR/',
            'mmhXaRjdxyJ6xAUp0KcbVq6xsDIbnnYHSgYr3zVoS',
            'dRRefWSWTknN1S69fNmKEfUeBIJA93xitr3pbqtLC',
            'bP28XNU=',
        ].join('');
        const signatureBase64 = await crypto.sign(privateKey, message);
        chai_1.assert.strictEqual(signatureBase64, expectedSignatureBase64);
    });
    mocha_1.it('should decode unpadded base64', () => {
        const originalString = 'test string';
        const base64String = 'dGVzdCBzdHJpbmc';
        const decodedString = crypto.decodeBase64StringUtf8(base64String);
        chai_1.assert.strictEqual(decodedString, originalString);
    });
    mocha_1.it('should encode to base64 and pad the result', () => {
        const originalString = 'test string';
        const base64String = 'dGVzdCBzdHJpbmc=';
        const encodedString = crypto.encodeBase64StringUtf8(originalString);
        chai_1.assert.strictEqual(encodedString, base64String);
    });
    mocha_1.it('should not load fast-text-encoding while running in nodejs', () => {
        const loadedModules = Object.keys(require('module')._cache);
        const hits = loadedModules.filter(x => x.includes('fast-text-encoding'));
        chai_1.assert.strictEqual(hits.length, 0);
    });
    mocha_1.it('should calculate SHA256 digest in hex encoding', async () => {
        const input = 'I can calculate SHA256';
        const expectedHexDigest = '73d08486d8bfd4fb4bc12dd8903604ddbde5ad95b6efa567bd723ce81a881122';
        const calculatedHexDigest = await crypto.sha256DigestHex(input);
        chai_1.assert.strictEqual(calculatedHexDigest, expectedHexDigest);
    });
    mocha_1.describe('should compute the HMAC-SHA256 hash of a message', () => {
        mocha_1.it('using string key', async () => {
            const message = 'The quick brown fox jumps over the lazy dog';
            const key = 'key';
            const expectedHexHash = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
            const extectedHash = new Uint8Array(expectedHexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const calculatedHash = await crypto.signWithHmacSha256(key, message);
            chai_1.assert.deepStrictEqual(calculatedHash, extectedHash.buffer);
        });
        mocha_1.it('using an ArrayBuffer key', async () => {
            const message = 'The quick brown fox jumps over the lazy dog';
            const key = toArrayBuffer(Buffer.from('key'));
            const expectedHexHash = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
            const extectedHash = new Uint8Array(expectedHexHash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const calculatedHash = await crypto.signWithHmacSha256(key, message);
            chai_1.assert.deepStrictEqual(calculatedHash, extectedHash.buffer);
        });
    });
    mocha_1.it('should expose a method to convert an ArrayBuffer to hex', () => {
        const arrayBuffer = new Uint8Array([4, 8, 0, 12, 16, 0])
            .buffer;
        const expectedHexEncoding = '0408000c1000';
        const calculatedHexEncoding = crypto_1.fromArrayBufferToHex(arrayBuffer);
        chai_1.assert.strictEqual(calculatedHexEncoding, expectedHexEncoding);
    });
});
//# sourceMappingURL=test.crypto.js.map