import test from 'node:test'
import assert from 'node:assert'
import { isRecoveryUrl } from './recovery.js'
test('implicit recovery link hash', () => assert.ok(isRecoveryUrl('#access_token=abc&refresh_token=x&type=recovery')))
test('type=recovery first in hash', () => assert.ok(isRecoveryUrl('#type=recovery&access_token=abc')))
test('signup confirm link is not recovery', () => assert.ok(!isRecoveryUrl('#access_token=abc&type=signup')))
test('empty url', () => assert.ok(!isRecoveryUrl('', '')))
