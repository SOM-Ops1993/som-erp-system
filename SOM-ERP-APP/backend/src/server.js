import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { registerRoutes } from './routes/index.js'

const fastify = Fastify({
  logger: {
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
  bodyLimit: 30 * 1024 * 1024,
})

await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
})

await fastify.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
})

fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

await registerRoutes(fastify)

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  const statusCode = error.statusCode || 500
  reply.status(statusCode).send({
    success: false,
    error: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_ERROR',
  })
})

const PORT = parseInt(process.env.PORT || '3001', 10)
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`SOM ERP Backend running on port ${PORT}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
