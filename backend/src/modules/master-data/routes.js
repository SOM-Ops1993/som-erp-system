import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "./product-master/product-master.controller.js";
import { listEquipment, createEquipment, updateEquipment, deleteEquipment } from "./equipment-master/equipment-master.controller.js";
import { listItems, getItem, createItem, updateItem, listSuppliers, createSupplier, updateSupplier, listPlants, createPlant, listErpEquipment, createErpEquipment, patchErpEquipment, listErpProducts, createErpProduct, listBom, getBom, createBom, listStrains, createStrain, listCustomers, createCustomer, listReasonCodes, listErpContainers, createErpContainer } from "./erp-masters/erp-masters.controller.js";
import { listPackingMaterials, createPackingMaterial, updatePackingMaterial, deletePackingMaterial } from "./packing-master/packing-master.controller.js";
import rmMasterRouter from "./rm-master.js";

const MasterDataRouter = express.Router();
const adminOnly = authorize(["admin"]);
const storeManager = authorize(["admin", "store_manager"]);
const plannerPlus = authorize(["admin", "planner", "planning_manager"]);

// ── RM Master (already Express router) ───────────────────────────────────────
MasterDataRouter.use("/rm", rmMasterRouter);

// ── Product Master ────────────────────────────────────────────────────────────
MasterDataRouter.get("/products", authenticate, listProducts);
MasterDataRouter.get("/products/:productCode", authenticate, getProduct);
MasterDataRouter.post("/products", authenticate, createProduct);
MasterDataRouter.put("/products/:productCode", authenticate, updateProduct);
MasterDataRouter.delete("/products/:productCode", authenticate, adminOnly, deleteProduct);

// ── Equipment Master ──────────────────────────────────────────────────────────
MasterDataRouter.get("/equipment", authenticate, listEquipment);
MasterDataRouter.post("/equipment", authenticate, createEquipment);
MasterDataRouter.put("/equipment/:equipId", authenticate, updateEquipment);
MasterDataRouter.delete("/equipment/:equipId", authenticate, adminOnly, deleteEquipment);

// ── ERP Items ─────────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/items", authenticate, listItems);
MasterDataRouter.get("/erp/masters/items/:code", authenticate, getItem);
MasterDataRouter.post("/erp/masters/items", authenticate, storeManager, createItem);
MasterDataRouter.put("/erp/masters/items/:code", authenticate, storeManager, updateItem);

// ── ERP Suppliers ─────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/suppliers", authenticate, listSuppliers);
MasterDataRouter.post("/erp/masters/suppliers", authenticate, storeManager, createSupplier);
MasterDataRouter.put("/erp/masters/suppliers/:id", authenticate, storeManager, updateSupplier);

// ── ERP Plants ────────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/plants", authenticate, listPlants);
MasterDataRouter.post("/erp/masters/plants", authenticate, adminOnly, createPlant);

// ── ERP Equipment ─────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/equipment", authenticate, listErpEquipment);
MasterDataRouter.post("/erp/masters/equipment", authenticate, adminOnly, createErpEquipment);
MasterDataRouter.patch("/erp/masters/equipment/:id", authenticate, adminOnly, patchErpEquipment);

// ── ERP Products ──────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/erp-products", authenticate, listErpProducts);
MasterDataRouter.post("/erp/masters/erp-products", authenticate, adminOnly, createErpProduct);

// ── BOM ───────────────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/bom", authenticate, plannerPlus, listBom);
MasterDataRouter.get("/erp/masters/bom/:id", authenticate, getBom);
MasterDataRouter.post("/erp/masters/bom", authenticate, authorize(["admin", "planning_manager"]), createBom);

// ── Microbial Strains ─────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/strains", authenticate, listStrains);
MasterDataRouter.post("/erp/masters/strains", authenticate, adminOnly, createStrain);

// ── Customers ─────────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/customers", authenticate, listCustomers);
MasterDataRouter.post("/erp/masters/customers", authenticate, authorize(["admin", "sales_team", "store_manager"]), createCustomer);

// ── Reason Codes ─────────────────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/reason-codes", authenticate, listReasonCodes);

// ── Containers (for decanting) ────────────────────────────────────────────────
MasterDataRouter.get("/erp/masters/containers", authenticate, listErpContainers);
MasterDataRouter.post("/erp/masters/containers", authenticate, storeManager, createErpContainer);

// ── Packing Material Master ───────────────────────────────────────────────────
MasterDataRouter.get("/packing-materials",      authenticate, listPackingMaterials);
MasterDataRouter.post("/packing-materials",     authenticate, storeManager, createPackingMaterial);
MasterDataRouter.put("/packing-materials/:id",  authenticate, storeManager, updatePackingMaterial);
MasterDataRouter.delete("/packing-materials/:id", authenticate, adminOnly, deletePackingMaterial);

export default MasterDataRouter;
