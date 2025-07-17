import { Router } from "express";
import Template from "../../app/models/template.js";
import { checkOfficer } from "../middleware/checkOfficer.js";
import { checkLoginStatus } from "../middleware/checkAuth.js";
import { signStatus, roles } from "../constants/index.js";
import mongoose from "mongoose";
import convertToPDF from "../utils/convertToPdf.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { find, findOne, updateOne, save } from "../services/templates.js";
import {
  handleRejectedTemplate,
  handleDeleteWholeTemplate,
  handleDelegate,
  handleDocsPreview , 
  handleSendForSign,
  handleClone , 
  handleGet
} from "../controller/template.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();


router.get("/", checkLoginStatus, handleGet);
router.post("/rejectWholeRequest/:id",checkLoginStatus,checkOfficer,handleRejectedTemplate);
router.delete("/deleteWholeTemplate/:id",checkLoginStatus , handleDeleteWholeTemplate);
router.post("/delegate", checkLoginStatus, checkOfficer,handleDelegate);
router.post("/sendForSign", checkLoginStatus, handleSendForSign);
router.get("/previewDocs/:id",checkLoginStatus ,handleDocsPreview);
router.get("/:id/clone", checkLoginStatus, handleClone);



export default router;
