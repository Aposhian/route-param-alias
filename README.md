[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Coverage Status](https://coveralls.io/repos/github/Aposhian/route-param-alias/badge.svg?branch=master)](https://coveralls.io/github/Aposhian/route-param-alias?branch=master)
![ci](https://github.com/Aposhian/route-param-alias/workflows/ci/badge.svg?event=push&branch=master)

# route-param-alias
Express.js middleware to substitute route parameters with values from other parts of the request.

Currently, this is supported in the form of [JSON Web Tokens](https://jwt.io/introduction/) in the request headers or as query parameters.

## Usage


```javascript
const routeParamAlias = require('route-param-alias')
const meConverter = routeParamAlias({
  alias: 'me',
  paramName: 'id',
  tokenLocation: 'header',
  tokenName: 'Authorization',
  payloadKey: 'sub'
})

app.get('/:id', (req, res) => {
  const payload = jwt.decode(req.headers.authorization)

  /// Assertions before applying middleware
  assert.equals(req.params.id, 'me')
  assert.not.equals(req.params.id, payload.sub)

  meConverter(req, res, () => {
    /// Assertions after applying middleware
    assert.not.equals(req.params.id, 'me')
    assert.equals(req.params.id, payload.sub)
    ...
  })
})
```

### URL rewriting
In order to match up with downstream middleware or handlers, this middleware also rewrites the url variables on the Express.js request object.

This is done by rewriting `req.url`, which is parsed to produce `req.path`. This does not modify `req.baseUrl` or `req.originalUrl`.