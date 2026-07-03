import prisma from '../../../../db.js'

export const deleteRecipeRow = async (req, res) => {
  try {
    await prisma.recipeDb.delete({ where: { id: req.params.id } })
    return res.json({ success: true, message: 'Row deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const deleteProductRecipe = async (req, res) => {
  try {
    const result = await prisma.recipeDb.deleteMany({ where: { productCode: req.params.productCode } })
    return res.json({ success: true, deleted: result.count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
