import test from 'node:test'
import assert from 'node:assert'
import { validatePassword, validateNewPassword } from './password.js'
test('rejects short', () => assert.ok(validatePassword('a1')))
test('rejects no number', () => assert.ok(validatePassword('abcdefgh')))
test('rejects no letter', () => assert.ok(validatePassword('12345678')))
test('rejects >72 chars', () => assert.ok(validatePassword('a1'.repeat(40))))
test('accepts strong', () => assert.equal(validatePassword('Passw0rdok'), null))
test('mismatch rejected', () => assert.equal(validateNewPassword('Passw0rdok', 'Passw0rdXX'), 'Passwords do not match.'))
test('match accepted', () => assert.equal(validateNewPassword('Passw0rdok', 'Passw0rdok'), null))
