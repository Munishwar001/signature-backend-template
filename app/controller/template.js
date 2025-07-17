import { find, findOne, updateOne, save } from "../services/templates.js";
import { signStatus, roles } from "../constants/index.js";
import convertToPDF from "../utils/convertToPdf.js";
import Template from "../models/template.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 const handleRejectedTemplate = async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: " reason is required" });
    }
    const existingRecord = await findOne({ id: id });
    if (!existingRecord) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    if (existingRecord.signStatus !== signStatus.readForSign) {
      return res.status(409).json({success: false,message: `Cannot reject `,
        });
    }
    existingRecord.signStatus = signStatus.rejected;
    existingRecord.rejectionReason = reason;
    await existingRecord.save();

    return res.status(200).json({success: true,message: "Request rejected successfully.",data: existingRecord,});
  } catch (err) {
    console.error(` Error while rejecting : ${err.message}`, err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
 

const handleDeleteWholeTemplate = async (req, res) => {
    const { id } = req.params;
    console.log("id while deleting template =>", id);
    try {
      const updatedTemplate = await updateOne(
        {
          _id: id,
          $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
        },
        { $set: { status: 0 } },
        { new: true }
      );

      if (!updatedTemplate) {
        return res.status(400).json({ message: "Cannot delete." });
      }
      res.status(201).json({ message: "successfully deleted", data: updatedTemplate });
    } catch (err) {
      console.error("Error deleting whole template :", err);
    }
  }


const handleDelegate = async (req, res) => {
  try {
    const { recordId, reason } = req.body;
    console.log("recordId , reason", recordId, reason);
    const existingRecord = await findOne({ id: recordId, signStatus: signStatus.readForSign, assignedTo: { $exists: true, $ne: null}});
     
    if (!existingRecord) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const createdBy = existingRecord.createdBy;

    const updatedTemplate = await updateOne(
      { id: recordId },
      {
        $set: {
          delegatedTo: createdBy,
          signStatus: signStatus.delegated,
          delegationReason: reason,
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Delegated", data: updatedTemplate });
  } catch (err) {
    console.log("Error while delegate =>", err);
    res.status(400).json({ success: false });
  }
}  

const handleSendForSign = async (req, res) => {
  try {
    const { recordId, officerId } = req.body.data;
    const updatedTemplate = await updateOne(
      {
        id: recordId,
        signStatus: signStatus.unsigned,
        "data.0": { $exists: true },
      },
      {
        $set: { assignedTo: officerId, signStatus: signStatus.readForSign },
      },
      { new: true }
    );
    console.log("updatedTemplate ", updatedTemplate);
    res.status(200).json({ success: true, message: "sent for sign" });
  } catch (err) {
    console.error("Error sending for sign:", err);
  }
}

const handleDocsPreview =  async (req, res) => {
  try {
    const templateId = req.params.id;
    if (!templateId) {
      return res.status(400).send("No Id provided provided.");
    }
    const template = await findOne({ id: templateId });
    console.log("templateURL", template.url);
    const BASE_DIR = path.resolve(__dirname, "../../");
    const filePath = path.join(BASE_DIR, template.url);
    const docxBuffer = fs.readFileSync(filePath);
    const pdfBuffer = await convertToPDF(docxBuffer);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="preview.pdf"',
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF preview:", error);
    res.status(500).send("Failed to preview document.");
  }
}

const handleClone = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("welcome in clone id is ", id);
    const original = await findOne({ _id: id });
    if (
      !original ||original.isDeleted ||original.signStatus == signStatus.rejected) {
      return res.status(404).json({ message: "Try to access invalid access" });
    }
    console.log("findinf for cloning the data ", original);
    const cloned = new Template({
      ...original.toObject(),
      _id: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: req.session.userId,
      createdBy: req.session.userId,
      assignedTo: null,
      delegatedTo: null,
      templateName: original.templateName + " (Clone)",
      data: [],
      signStatus: signStatus.unsigned,
    });
    console.log("reques session id ", req.session.userId);
    await cloned.save();
    console.log("cloned data =>", cloned);
    res.send({ success: true });
  } catch (error) {
    console.error("Error in cloning:", {
      error: error.message,
      stack: error.stack,
      templateId: req.params.id,
    });
    res.status(500).json({ error: "Error in cloning the document" });
  }
}
export { handleRejectedTemplate , 
  handleDeleteWholeTemplate , 
  handleDelegate,
  handleSendForSign ,
  handleDocsPreview,
  handleClone 

};