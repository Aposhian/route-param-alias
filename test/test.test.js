const routeParamAlias = require('../index')
const express = require('express')
const request = require('supertest')
const jwt = require('jsonwebtoken')

const randomstring = () => Math.random().toString(36).substring(2, 15)

const echoParams = (req, res) => res.json(req.params)

const createApp = ({ middlewares = [], paramNames = [] }) => {
  const app = express()

  // ex: '/:param1/:param2'
  const route = paramNames.map(paramName => `/:${paramName}`).join()

  app.post(route, ...middlewares, echoParams)

  return app
}

describe('routeParamAlias middleware', () => {
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
    routeParam        | isAlias
    ${alias}          | ${true}
    ${randomstring()} | ${false}
    `('uses alias: $isAlias', async ({ routeParam, isAlias }) => {
      const headerParam = randomstring()

      const res = await request(app)
        .post(`/${routeParam}`)
        .set('x-param', jwt.sign({ [paramName]: headerParam }, 'super_secret'))
        .expect(200)
        .expect('Content-Type', /json/)

      expect(res.body).toMatchObject({
        [paramName]: isAlias ? headerParam : routeParam
      })
    })

    it('should return a 4xx error if an alias is used without a header', async () => {
      expect(false).toBe(true)
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
    routeParam        | isAlias
    ${alias}          | ${true}
    ${randomstring()} | ${false}
    `('uses alias: $isAlias', async ({ routeParam, isAlias }) => {
      const queryParam = randomstring()

      const token = jwt.sign({ [paramName]: queryParam }, 'super_secret')

      const res = await request(app)
        .post(`/${routeParam}?${tokenName}=${token}`)
        .expect(200)
        .expect('Content-Type', /json/)

      expect(res.body).toMatchObject({
        [paramName]: isAlias ? queryParam : routeParam
      })
    })

    it('should return a 5xx error if there is no query object', async () => {
      expect(false).toBe(true)
    })
  })
})
