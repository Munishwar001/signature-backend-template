import { Router } from "express";
import upload from "../../middleware/uploads.js";
import { bulkUpload } from "../../middleware/uploads.js";
import { checkLoginStatus } from "../../middleware/checkAuth.js";
import { checkOfficer } from "../../middleware/checkOfficer.js";
import {handleDelete,handleGet,handleCertificatePreview,} from "../../controller/api/template.js";
import {handleFetchRejected,handleRejectTemplate, } from "../../controller/api/rejectedTemplate.js";
import {handleDocs,handleBulkUpload} from "../../controller/api/uploadTemplate.js";
const router = Router();

router.post("/",checkLoginStatus,upload.single("file"),handleDocs);
router.post("/datahandling",checkLoginStatus,bulkUpload.single("file"),handleBulkUpload);
router.get("/:id", checkLoginStatus,handleGet);
router.post("/delete/:id", checkLoginStatus, handleDelete);
router.get("/preview/:templateId/:dataId",checkLoginStatus,handleCertificatePreview);
router.post("/reject/:id",checkLoginStatus,checkOfficer,handleRejectTemplate);
router.get("/fetchRejected/:id", checkLoginStatus, handleFetchRejected);

export default router;
