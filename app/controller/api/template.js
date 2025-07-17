import { find, findOne, updateOne, save } from "../../services/templates.js";
import { signStatus, roles } from "../../constants/index.js";
import { mongoose } from "mongoose";
import Template from "../../models/template.js";
import path from "path";
import PizZip from "pizzip";
import fs from "fs";
import Docxtemplater from "docxtemplater";
import convertToPDF from "../../utils/convertToPdf.js";

const handleDelete = async (req, res, next) => {
  const record = req.body;
  const { id } = req.params;
  console.log("record =>", record);
  console.log("id =>", id);
  try {
    if (!record.id) {
      return res.status(400).json({ message: "Record ID is missing" });
    }
    const updatedTemplate = await updateOne(
      {
        id: id,
        $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
      },
      {
        $set: {
          "data.$[elem].isDeleted": true,
        },
      },
      {
        arrayFilters: [{ "elem.id": new mongoose.Types.ObjectId(record.id) }],
        new: true,
      }
    );

    if (updatedTemplate.modifiedCount === 0) {
      return res.status(404).json({ message: "Record not found in data array" });}

    res.status(200).json({ success: true, message: "Record marked as deleted" });
  } catch (error) {
    console.error("Error while marking record as deleted:", error);
    next(error);
  }
}

const handleGet = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const template = await Template.findOne({ id: id });
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    const transformedData = template.data
      .filter((item) => !item.isDeleted)
      .map((item) => ({
        ...item.toObject(),
        data:
          item.data instanceof Map ? Object.fromEntries(item.data) : item.data,
        _id: item._id.toString(),
      }));

    res.status(200).json({
      ...template.toObject(),
      data: transformedData,
      templateVariables: template.templateVariables,
      allfields: template.templateVariables.map((v) => v.name),
    });
  } catch (error) {
    console.error("Fetch template error:", error);
    next(error);
  }
}

const handleCertificatePreview = async (req, res, next) => {
  const { templateId, dataId } = req.params;
  try {
    const template = await findOne({ id: templateId });
    if (!template) return res.status(404).send("Template not found");
    console.log("template data in preview =>", template.data);

    const dataRecord = template.data.find(
      (item) => item.id.toString() === dataId
    );
    console.log("dataRecord", dataRecord);
    if (!dataRecord) return res.status(404).send("Data not found");
    console.log("template.url  =>", template.url);

    const templatePath = path.join("uploads/templates",path.basename(template.url));
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // const filledData = dataRecord.data;
    const filledData = Object.fromEntries(dataRecord.data);
    doc.setData(filledData);
    doc.render();

    const buf = doc.getZip().generate({ type: "nodebuffer" });
    const pdfBuffer = await convertToPDF(buf);
    res.set({ "Content-Type": "application/pdf" });
    res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).send("Error generating preview");
  }
};
export { handleDelete , handleGet , handleCertificatePreview};
