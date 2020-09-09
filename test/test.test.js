const routeParamAlias = require('../index')
const express = require('express')
const request = require('supertest')
const jwt = require('jsonwebtoken')

const any = () => Math.random().toString(36).substring(2, 15)

const echoRequestObject = (req, res) => res.json({
  params: req.params,
  baseUrl: req.baseUrl,
  path: req.path,
  originalUrl: req.originalUrl,
  url: req.url
})

const createApp = ({ middlewares = [], paramNames = [] }) => {
  const app = express()

  // ex: '/:param1/:param2'
  const route = paramNames.map(paramName => `/:${paramName}`).join()

  app.post(route, ...middlewares, echoRequestObject)

  return app
}

describe('routeParamAlias middleware', () => {
  describe('middleware configuration', () => {
    test.each`
    alias        | paramName    | tokenLocation | tokenName    | payloadKey
    ${any()}     | ${any()}     | ${any()}      | ${any()}     | ${any()}
    ${undefined} | ${any()}     | ${'query'}    | ${any()}     | ${any()}
    ${any()}     | ${undefined} | ${'query'}    | ${any()}     | ${any()}
    ${any()}     | ${any()}     | ${undefined}  | ${any()}     | ${any()}
    ${any()}     | ${any()}     | ${'query'}    | ${undefined} | ${any()}
    ${any()}     | ${any()}     | ${'query'}    | ${any()}     | ${undefined}
    ${undefined} | ${undefined} | ${undefined}  | ${undefined} | ${undefined}
    `('should fail on invalid configuration', ({
      alias,
      paramName,
      tokenLocation,
      tokenName,
      payloadKey
    }) => {
      expect(() => routeParamAlias({
        alias,
        paramName,
        tokenLocation,
        tokenName,
        payloadKey
      })).toThrowError()
    })

    test.each`
    alias        | paramName    | tokenLocation | tokenName    | payloadKey
    ${any()}     | ${any()}     | ${'query'}    | ${any()}     | ${any()}
    ${any()}     | ${any()}     | ${'header'}   | ${any()}     | ${any()}
    `('should not fail on valid configuration', ({
      alias,
      paramName,
      tokenLocation,
      tokenName,
      payloadKey
    }) => {
      expect(() => routeParamAlias({
        alias,
        paramName,
        tokenLocation,
        tokenName,
        payloadKey
      })).not.toThrowError()
    })
  })

  describe('aliasing values for tokens in headers', () => {
    const paramName = 'param1'
    const alias = 'latest'
    const headerName = 'x-param'
    const app = createApp({
      paramNames: [paramName],
      middlewares: [
        routeParamAlias({
          alias,
          paramName,
          tokenLocation: 'header',
          tokenName: headerName,
          payloadKey: paramName
        })
      ]
    })

    test.each`
    routeParam | isAlias
    ${alias}   | ${true}
    ${any()}   | ${false}
    `('uses alias: $isAlias', async ({ routeParam, isAlias }) => {
      const headerParam = any()

      const token = jwt.sign({ [paramName]: headerParam }, 'super_secret')

      const route = `/${routeParam}`

      const res = await request(app)
        .post(route)
        .set('x-param', token)
        .expect(200)
        .expect('Content-Type', /json/)

      const {
        params,
        originalUrl,
        baseUrl,
        url,
        path
      } = res.body

      expect(params).toMatchObject({
        [paramName]: isAlias ? headerParam : routeParam
      })

      expect(originalUrl).toEqual(route)

      expect(originalUrl).toEqual(route)
      expect(baseUrl).toEqual('')

      const expectedRoute = isAlias ? route.replace(alias, headerParam) : route

      expect(url).toEqual(expectedRoute)
      expect(path).toEqual(expectedRoute)
    })

    it('should return a 4xx error if the token does not contain the parameter', async () => {
      const token = jwt.sign({}, 'super_secret')

      const res = await request(app)
        .post(`/${alias}`)
        .set('x-param', token)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })

    it('should return a 4xx error if the token does not exist', async () => {
      const res = await request(app)
        .post(`/${alias}`)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })

    it('should return a 4xx error if the query parameter is not a JWT', async () => {
      const token = 'asdf'

      const res = await request(app)
        .post(`/${alias}`)
        .set('x-param', token)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })
  })

  describe('aliasing values for tokens in the query', () => {
    const paramName = 'param1'
    const alias = 'latest'
    const tokenName = 'token'
    const app = createApp({
      paramNames: [paramName],
      middlewares: [
        routeParamAlias({
          alias,
          paramName,
          tokenLocation: 'query',
          tokenName: 'token',
          payloadKey: paramName
        })
      ]
    })

    test.each`
    routeParam | isAlias
    ${alias}   | ${true}
    ${any()}   | ${false}
    `('uses alias: $isAlias', async ({ routeParam, isAlias }) => {
      const queryParam = any()

      const token = jwt.sign({ [paramName]: queryParam }, 'super_secret')

      const route = `/${routeParam}`

      const routeWithQuery = `${route}?${tokenName}=${token}`

      const res = await request(app)
        .post(routeWithQuery)
        .expect(200)
        .expect('Content-Type', /json/)

      const {
        params,
        originalUrl,
        baseUrl,
        url,
        path
      } = res.body

      expect(params).toMatchObject({
        [paramName]: isAlias ? queryParam : routeParam
      })

      expect(originalUrl).toEqual(routeWithQuery)
      expect(baseUrl).toEqual('')

      expect(url).toEqual(isAlias ? routeWithQuery.replace(alias, queryParam) : routeWithQuery)
      expect(path).toEqual(isAlias ? route.replace(alias, queryParam) : route)
    })

    it('should return a 4xx error if the token does not contain the parameter', async () => {
      const token = jwt.sign({}, 'super_secret')

      const res = await request(app)
        .post(`/${alias}?${tokenName}=${token}`)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })

    it('should return a 4xx error if the token does not exist', async () => {
      const res = await request(app)
        .post(`/${alias}`)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })

    it('should return a 4xx error if the query parameter is not a JWT', async () => {
      const token = 'asdf'

      const res = await request(app)
        .post(`/${alias}?${tokenName}=${token}`)
        .expect(400)

      expect(res.body.params).toBeFalsy()
    })
  })
})
