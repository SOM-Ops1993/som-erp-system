import prisma from '../db.js'

export default async function equipmentMasterRoutes(fastify) {
  fastify.get('/', async (req) => {
    const items = await prisma.equipmentMaster.findMany({ orderBy: { equipName: 'asc' } })
    return { success: true, data: items }
  })

  fastify.post('/', async (req, reply) => {
    const { equipName, plant, workingVolume, operation } = req.body
    if (!equipName)
      return reply.status(400).send({ success: false, error: 'equipName is required' })
    const existing = await prisma.equipmentMaster.findUnique({ where: { equipName } })
    if (existing) return reply.status(409).send({ success: false, error: 'Equipment already exists' })
    const item = await prisma.equipmentMaster.create({
      data: {
        equipName,
        plant: plant || '',
        workingVolume: workingVolume ? parseFloat(workingVolume) : null,
        operation: operation || '',
      }
    })
    return reply.status(201).send({ success: true, data: item })
  })

  fastify.put('/:equipId', async (req, reply) => {
    const { equipName, plant, workingVolume, operation } = req.body
    const item = await prisma.equipmentMaster.update({
      where: { equipId: req.params.equipId },
      data: {
        equipName,
        plant: plant ?? '',
        workingVolume: workingVolume !== undefined ? parseFloat(workingVolume) || null : undefined,
        operation: operation ?? '',
      },
    })
    return { success: true, data: item }
  })

  fastify.delete('/:equipId', async (req, reply) => {
    await prisma.equipmentMaster.delete({ where: { equipId: req.params.equipId } })
    return { success: true, message: 'Deleted' }
  })
}
