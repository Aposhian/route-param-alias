const jwt = require('jsonwebtoken')

const supportedTokenLocations = ['header', 'query']

const getToken = ({ req, tokenLocation, tokenName }) => {
  if (tokenLocation === 'header') {
    return req.get(tokenName)
  } else {
    return req[tokenLocation][tokenName]
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
  if (!token) {
    const err = new Error('Cannot subsitute value for alias: token does not exist')
    err.statusCode = 400
    throw err
  }

  const decoded = jwt.decode(token.replace('Bearer ', ''))

  if (!decoded) {
    const err = new Error('Cannot substitue value for alias: token is not a JWT')
    err.statusCode = 400
    throw err
  }

  const { [payloadKey]: value } = decoded

  if (!value) {
    const err = new Error('Cannot subsitute value for alias: not contained in token')
    err.statusCode = 400
    throw err
  }

  return value
}

const required = (name) => {
  throw new Error(`Required parameter: ${name}`)
}

const rewriteUrl = ({ req, alias, value }) => {
  const re = new RegExp(`(?<=/)${alias}(?=/)?`)
  return req.url.replace(re, value)
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
  alias = required('alias'),
  paramName = required('paramName'),
  tokenLocation = required('tokenLocation'),
  tokenName = required('tokenName'),
  payloadKey = required('payloadKey')
}) => {
  if (!supportedTokenLocations.includes(tokenLocation)) {
    throw new Error(`Unsupported tokenLocation: ${tokenLocation}`)
  }

  const middleware = (req, _, next) => {
    if (req.params[paramName] === alias) {
      const value = getParamValue({ req, tokenLocation, tokenName, payloadKey })

      req.params[paramName] = value

      req.url = rewriteUrl({ req, alias, value })
    }

    next()
  }

  return middleware
}
