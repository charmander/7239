'use strict';

var tap = require('tap');

var sttn = require('../');
var parse = sttn.parseForwardedHeader;

tap.test('Valid Forwarded headers should be parsed correctly', function (t) {
	t.test('A single unquoted pair should be parsed correctly', function (t) {
		t.deepEquals(
			parse('for=203.0.113.72'),
			[{ by: null, for: '203.0.113.72', host: null, proto: null }]
		);
		t.end();
	});

	t.test('A single quoted pair should be parsed correctly', function (t) {
		t.deepEquals(
			parse('for="203.0\\.113.72"'),
			[{ by: null, for: '203.0.113.72', host: null, proto: null }]
		);
		t.deepEquals(
			parse('for="[2001:db8::39]"'),
			[{ by: null, for: '[2001:db8::39]', host: null, proto: null }]
		);
		t.end();
	});

	t.test('Multiple pairs should be parsed correctly', function (t) {
		t.deepEquals(
			parse('for=203.0.113.72;by="[2001:db8::39]";proto=https'),
			[{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' }]
		);
		t.end();
	});

	t.test('Multiple elements should be parsed correctly', function (t) {
		t.deepEquals(
			parse('for=203.0.113.72;by="[2001:db8::39]";proto=https,for="[2001:db8::72]";by=203.0.113.39;host=example.com'),
			[
				{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' },
				{ by: '203.0.113.39', for: '[2001:db8::72]', host: 'example.com', proto: null },
			]
		);
		t.deepEquals(
			parse('for=203.0.113.72;by="[2001:db8::39]";proto=https\t,  for="[2001:db8::72]";by=203.0.113.39;host=example.com'),
			[
				{ by: '[2001:db8::39]', for: '203.0.113.72', host: null, proto: 'https' },
				{ by: '203.0.113.39', for: '[2001:db8::72]', host: 'example.com', proto: null },
			]
		);
		t.end();
	});

	t.end();
});

tap.test('Invalid Forwarded headers should be rejected', function (t) {
	t.equal(parse(''), null);
	t.equal(parse('for= 203.0.113.0'), null);
	t.equal(parse('for=203.0.113.0;for=203.0.113.1'), null);
	t.equal(parse('for=203.0.113.0; by=203.0.113.1'), null);
	t.equal(parse('for'), null);
	t.equal(parse('for="_\\'), null);
	t.equal(parse('for="_\\\x1f"'), null);
	t.equal(parse('for="\x1f"'), null);
	t.equal(parse('for=[2001:db8::39]'), null);
	t.equal(parse('for="2989"'), null);
	t.equal(parse('host="#"'), null);
	t.equal(parse('proto=192.0.2.0'), null);
	t.equal(parse('for="[2001:db8::39]"x'), null);
	t.equal(parse('for="[2001:db8::39]",'), null);
	t.end();
});
