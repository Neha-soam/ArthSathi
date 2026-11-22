import test from 'node:test'
import assert from 'node:assert'
import { describeDbError, dbErrorDetail } from './dberror.js'
const permission = { code: '42501', message: 'permission denied for table transactions' }
test('user message has no codes or jargon', () => { const m = describeDbError(permission); assert.doesNotMatch(m, /42501|RLS|policy|schema|table|SQL/i); assert.match(m, /Please try again/) })
test('technical detail keeps code and hint', () => { const d = dbErrorDetail(permission); assert.match(d, /42501/); assert.match(d, /fix_permissions\.sql/) })
test('expired session', () => assert.match(describeDbError({ status: 401, message: 'JWT expired' }), /log in again/))
test('network', () => assert.match(describeDbError({ message: 'Failed to fetch' }), /internet connection/))
test('save wording', () => assert.match(describeDbError({ code: 'XX1', message: 'boom' }, 'save'), /save this/))
test('delete wording', () => assert.match(describeDbError({ code: 'XX1', message: 'boom' }, 'delete'), /delete this/))
test('check constraint is friendly', () => assert.match(describeDbError({ code: '23514', message: 'violates check' }, 'save'), /amount, category and date/))
test('no error -> empty', () => { assert.equal(describeDbError(null), ''); assert.equal(dbErrorDetail(null), '') })
