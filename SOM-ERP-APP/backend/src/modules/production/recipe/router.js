import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listRecipe, listRecipeProducts, checkRmMapping } from "./get/recipe.controller.js";
import { bulkSaveRecipe, fixRmMapping } from "./create/recipe.controller.js";
import { deleteRecipeRow, deleteProductRecipe } from "./delete/recipe.controller.js";

const RecipeRouter = express.Router();
const managerOrAbove = authorize(["admin"]);

RecipeRouter.get("/recipe/products", authenticate, listRecipeProducts);
RecipeRouter.get("/recipe/check-rm-mapping", authenticate, checkRmMapping);
RecipeRouter.post("/recipe/fix-rm-mapping", authenticate, managerOrAbove, fixRmMapping);
RecipeRouter.post("/recipe/bulk-save", authenticate, managerOrAbove, bulkSaveRecipe);
RecipeRouter.delete("/recipe/product/:productCode", authenticate, managerOrAbove, deleteProductRecipe);
RecipeRouter.delete("/recipe/:id", authenticate, managerOrAbove, deleteRecipeRow);
RecipeRouter.get("/recipe", authenticate, listRecipe);

export default RecipeRouter;
