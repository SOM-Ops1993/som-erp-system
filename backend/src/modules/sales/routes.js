import express from "express";
import CustomerProfilesRouter from "./customer-profiles/routes.js";
import NotificationRouter from "./notification/routes.js";
import TrackerRouter from "./tracker/routes.js";
import BomSendsRouter from "./bom-sends/routes.js";
import SalesOrderRouter from "./sales-order/routes.js";

const SalesRouter = express.Router();

SalesRouter.use("/customer-profiles", CustomerProfilesRouter);
SalesRouter.use("/tracker", TrackerRouter);
SalesRouter.use("/bom-sends", BomSendsRouter);
SalesRouter.use("/sales-orders", SalesOrderRouter);
SalesRouter.use("/notifications", NotificationRouter);

export default SalesRouter;
