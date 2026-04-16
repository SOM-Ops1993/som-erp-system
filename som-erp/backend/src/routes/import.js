import { previewImport, executeImport } from '../services/import-service.js'

export default async function importRoutes(fastify) {

  // POST preview import (returns summary without committing)
  fastify.post('/preview', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' })

    const buffer = await data.toBuffer()
    const summary = await previewImport(buffer)
    return { success: true, summary }
  })

  // POST execute import (full commit)
  fastify.post('/execute', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.status(400).send({ success: false, error: 'No file uploaded' })

    const buffer = await data.toBuffer()
    reply.header('Content-Type', 'application/json')

    // Stream progress (large import can take time)
    const results = await executeImport(buffer)
    return { success: true, results }
  })
}
