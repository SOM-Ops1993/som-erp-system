import prisma from '../../../../db.js'

export const deleteRm = async (req, res) => {
  await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
  return res.json({ success: true, message: 'Deleted' })
}
