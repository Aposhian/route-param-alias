const jwt = require('jsonwebtoken')

const getToken = ({ req, tokenLocation, tokenName }) => {
  if (tokenLocation === 'header') {
    return req.get(tokenName)
  } else if (tokenLocation === 'query') {
    if (!req.query) {
      throw new Error('No query object found on request object')
    }

    return req.query[tokenName]
  }
}

/**
 * Get a particular value out of a JWT lying within a Express.js request object
 * @param {Object} params.req Express.js request object
 * @param {String} params.tokenLocation property of req where the token is to be found. ex: 'header' or 'query'
 * @param {String} params.tokenName name of the token property or header
 * @param {String} params.payloadKey name of the property in the JWT payload
 * @return value from the JWT
 */
const getParamValue = ({ req, tokenLocation, tokenName, payloadKey }) => {
  const token = getToken({ req, tokenLocation, tokenName })
  const { [payloadKey]: value } = jwt.decode(token.replace('Bearer ', ''))
  return value
}

/**
 * Allows using route parameter aliases in a request. Aliases are mapped to values
 * in the payload of a JWT provided elsewhere in the request
 *
 * Example:
 * ```javascript
 * const routeParamAlias = require('route-param-alias')
 * const meConverter = routeParamAlias({
 *  alias: 'me',
 *  paramName: 'id',
 *  tokenLocation: 'header',
 *  tokenName: 'Authorization',
 *  payloadKey: 'sub'
 * })
 *
 * app.get('/:id', (req, res) => {
 *  const payload = jwt.decode(req.headers.authorization)
 *
 *  /// Assertions before applying middleware
 *  assert.equals(req.params.id, 'me')
 *  assert.not.equals(req.params.id, payload.sub)
 *
 *  meConverter(req, res, () => {
 *    /// Assertions after applying middleware
 *    assert.not.equals(req.params.id, 'me')
 *    assert.equals(req.params.id, payload.sub)
 *    ...
 *  })
 * })
 * ```
 */
module.exports = ({
  alias,
  paramName,
  tokenLocation = 'header',
  tokenName = 'Authorization',
  payloadKey
}) => (req, _, next) => {
  if (req.params[paramName] === alias) {
    req.params[paramName] = getParamValue({ req, tokenLocation, tokenName, payloadKey })
  }

  next()
}
