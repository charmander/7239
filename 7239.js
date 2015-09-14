'use strict';

var TOKEN_CHARACTERS = "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var DOUBLE_QUOTED_CHARACTER = /[\t \x21\x23-\x5b\x5d-\x7e\x80-\xff]/;
var DOUBLE_QUOTED_PAIR = /[\t -\x7e\x80-\xff]/;
var HOST_PORT = /:\d*$/;
var HOST_IPV4 = /^(?:(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/;
var HOST_IPV6 = /^\[(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:)?[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5]))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)\]$/i;
var HOST_IPVFUTURE = /^\[v[0-9a-f]+\.[\w.~!$&'()*+,;=:-]+\]$/i;
var HOST_REG_NAME = /^(?:[\w.~!$&'()*+,;=-]|%[0-9a-f]{2})*$/i;
var NODE_PORT = /:(?:\d{1,5}|_[\w.-]+)$/;
var NODE_OBFNODE = /^_[\w.-]+$/;
var SCHEME_NAME = /^[a-z][a-z0-9+.-]*$/i;

function isHost(s) {
	s = s.replace(HOST_PORT, '');

	return HOST_IPVFUTURE.test(s) ||
		HOST_IPV6.test(s) ||
		HOST_IPV4.test(s) ||
		HOST_REG_NAME.test(s);
}

function isNodeIdentifier(s) {
	s = s.replace(NODE_PORT, '');

	return s === 'unknown' ||
		NODE_OBFNODE.test(s) ||
		HOST_IPV6.test(s) ||
		HOST_IPV4.test(s);
}

function parseForwardedHeader(forwardedHeader) {
	var i = 0;
	var l = forwardedHeader.length;

	function readToken() {
		for (var end = i; end < l; end++) {
			if (TOKEN_CHARACTERS.indexOf(forwardedHeader.charAt(end)) === -1) {
				break;
			}
		}

		if (end === i) {
			return null;
		}

		var result = forwardedHeader.substring(i, end);
		i = end;
		return result;
	}

	function readQuotedString() {
		if (forwardedHeader.charAt(i) !== '"') {
			return null;
		}

		var result = '';

		for (var end = i + 1; end < l; end++) {
			var c = forwardedHeader.charAt(end);

			if (c === '"') {
				i = end + 1;
				return result;
			}

			if (c === '\\') {
				end++;

				if (end < l && DOUBLE_QUOTED_PAIR.test(c = forwardedHeader.charAt(end))) {
					result += c;
				} else {
					break;
				}
			} else if (DOUBLE_QUOTED_CHARACTER.test(c)) {
				result += c;
			} else {
				break;
			}
		}

		return null;
	}

	function readForwardedPair() {
		var name = readToken();

		if (name === null) {
			return null;
		}

		name = name.toLowerCase();

		if (forwardedHeader.charAt(i) !== '=') {
			return null;
		}

		i++;

		var value = readQuotedString();

		if (value === null && (value = readToken()) === null) {
			return null;
		}

		switch (name) {
			case 'by':
			case 'for':
				if (!isNodeIdentifier(value)) {
					return null;
				}

				break;

			case 'host':
				if (!isHost(value)) {
					return null;
				}

				break;

			case 'proto':
				if (!SCHEME_NAME.test(value)) {
					return null;
				}

				break;
		}

		return {
			name: name,
			value: value,
		};
	}

	function readForwardedElement() {
		var element = {
			by: null,
			for: null,
			host: null,
			proto: null,
		};

		do {
			var pair = readForwardedPair();

			if (pair === null) {
				return null;
			}

			if (element[pair.name] !== null) {
				return null;
			}

			element[pair.name] = pair.value;
		} while (i < l && forwardedHeader.charAt(i++) === ';');

		return element;
	}

	var elements = [];

	for (;;) {
		var element = readForwardedElement();
		var c;

		if (element === null) {
			return null;
		}

		elements.push(element);

		for (;; i++) {
			if (i === l) {
				return elements;
			}

			c = forwardedHeader.charAt(i);

			if (c === ',') {
				i++;
				break;
			}

			if (c !== ' ' && c !== '\t') {
				return null;
			}
		}

		for (;; i++) {
			if (i === l) {
				return null;
			}

			c = forwardedHeader.charAt(i);

			if (c !== ' ' && c !== '\t') {
				break;
			}
		}
	}
}

function middleware(request, response, next) {
	var header = request.headers.forwarded;
	var forwarded;

	request.forwarded =
		header && (forwarded = parseForwardedHeader(header)) !== null ?
			forwarded[forwarded.length - 1] :
			{ by: null, for: null, host: null, proto: null };

	next();
}

exports.parseForwardedHeader = parseForwardedHeader;
exports.middleware = middleware;
