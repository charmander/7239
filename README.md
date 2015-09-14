# 7239

[![Build status][ci-image]][ci]

A module to parse Forwarded headers according to [RFC 7239][].

```javascript
const sttn = require('7239');

sttn.parseForwardedHeader('for=203.0.113.72;proto=https')
// [{ for: '203.0.113.72', proto: 'https', by: null, host: null }]

sttn.parseForwardedHeader('for=[2001:db8::39]')
// null

app.use(sttn.middleware);
```

The middleware is compatible with [Connect][] (and therefore Express).
It adds a `forwarded` property to the request, with the value of the last
forwarded element or `{ for: null, proto: null, by: null, host: null }`
if no such object exists or if the header is invalid.


  [RFC 7239]: https://tools.ietf.org/html/rfc7239
  [Connect]: https://github.com/senchalabs/connect

  [ci]: https://travis-ci.org/charmander/7239
  [ci-image]: https://api.travis-ci.org/charmander/7239.svg
