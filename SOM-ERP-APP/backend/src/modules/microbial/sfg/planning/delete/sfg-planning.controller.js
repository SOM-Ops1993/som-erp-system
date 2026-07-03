import prisma from '../../../../../db.js'

export const cancelAllocation = async (req, res) => {
  try {
    const alloc = await prisma.microbialSfgAllocation.findUnique({ where: { allocationId: req.params.id } })
    if (!alloc) return res.status(404).json({ success: false, error: 'Allocation not found', code: 'NOT_FOUND' })
    if (alloc.status === 'PICKED') return res.status(409).json({ success: false, error: 'Cannot cancel a PICKED allocation', code: 'CONFLICT' })

    const qty = Number(alloc.allocatedQtyKg)

    await prisma.$transaction(async (tx) => {
      await tx.microbialSfgInward.update({
        where: { inwardId: alloc.inwardId },
        data: { remainingQtyKg: { increment: qty }, status: 'ACTIVE' },
      })
      await tx.microbialSfgContainer.update({
        where: { containerCode: alloc.containerCode },
        data: { currentQtyKg: { increment: qty }, fillStatus: 'PARTIAL' },
      })
      await tx.microbialSfgAllocation.delete({ where: { allocationId: req.params.id } })
    })

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
