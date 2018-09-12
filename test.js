'use strict';

const assert = require('assert');
const test = require('@charmander/test')(module);

const sttn = require('./');
const parse = sttn.parseForwardedHeader;

test('single unquoted pair', () => {
	assert.deepStrictEqual(
		parse('for=203.0.113.72'),
		[{ by: null, for: '203.0.113.72', host: null, proto: null }]
	);
});

test('single quoted pair', () => {
	assert.deepStrictEqual(
		parse('for="203.0\\.113.72"'),
		[{ by: null, for: '203.0.113.72', host: null, proto: null }]
	);
	assert.deepStrictEqual(
		parse('for="[2001:db8::39]"'),
		[{ by: null, for: '[2001:db8::39]', host: null, proto: null }]
	);
});

test('multiple pairs', () => {
	assert.deepStrictEqual(
		parse('for=203.0.113.72;by="[2001:db8::39]";proto=https'),
		[{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' }]
	);
});

test('multiple elements', () => {
	assert.deepStrictEqual(
		parse('for=203.0.113.72;by="[2001:db8::39]";proto=https,for="[2001:db8::72]";by=203.0.113.39;host=example.com'),
		[
			{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' },
			{ by: '203.0.113.39', for: '[2001:db8::72]', host: 'example.com', proto: null },
		]
	);
	assert.deepStrictEqual(
		parse('for=203.0.113.72;by="[2001:db8::39]";proto=https\t,  for="[2001:db8::72]";by=203.0.113.39;host=example.com'),
		[
			{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' },
			{ by: '203.0.113.39', for: '[2001:db8::72]', host: 'example.com', proto: null },
		]
	);
});

test('invalid headers', () => {
	assert.strictEqual(parse(''), null);
	assert.strictEqual(parse('for= 203.0.113.0'), null);
	assert.strictEqual(parse('for=203.0.113.0;for=203.0.113.1'), null);
	assert.strictEqual(parse('for=203.0.113.0; by=203.0.113.1'), null);
	assert.strictEqual(parse('for'), null);
	assert.strictEqual(parse('for="_\\'), null);
	assert.strictEqual(parse('for="_\\\x1f"'), null);
	assert.strictEqual(parse('for="\x1f"'), null);
	assert.strictEqual(parse('for=[2001:db8::39]'), null);
	assert.strictEqual(parse('for="2989"'), null);
	assert.strictEqual(parse('host="#"'), null);
	assert.strictEqual(parse('proto=192.0.2.0'), null);
	assert.strictEqual(parse('for="[2001:db8::39]"x'), null);
	assert.strictEqual(parse('for="[2001:db8::39]",'), null);
});

test.group('middleware', test => {
	test('calls back immediately', () => {
		const request = {
			headers: {
				forwarded: 'for="[2001:db8::39]"',
			},
			forwarded: null,
		};

		let called = false;

		sttn.middleware(request, null, () => {
			called = true;
		});

		assert(called);
		assert.deepStrictEqual(
			request.forwarded,
			{ by: null, for: '[2001:db8::39]', host: null, proto: null }
		);
	});

	test('ignores invalid headers', () => {
		const request = {
			headers: {
				forwarded: 'for=[2001:db8::39]',
			},
			forwarded: null,
		};

		sttn.middleware(request, null, () => {});

		assert.deepStrictEqual(
			request.forwarded,
			{ by: null, for: null, host: null, proto: null }
		);
	});
});
