import { find, findOne, updateOne, save } from "../../services/templates.js";
import { signStatus, roles } from "../../constants/index.js";
import { mongoose } from "mongoose";
import Template from "../../models/template.js";
import { fileURLToPath } from "url";
import extractExcelData from "../../utils/readExcel.js";
import path from "path";
import PizZip from "pizzip";
import fs from "fs";
import Docxtemplater from "docxtemplater";

const handleDocs = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    console.log("Incoming body:", req.body);
    console.log("File:", file);
    console.log("file link ", file);
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const content = fs.readFileSync(file.path, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const tags = doc.getFullText().match(/{{(.*?)}}|{(.*?)}/g) || [];

    const templateVariables = tags
      .map((tag) => tag.replace(/{{|}}|{|}/g, "").trim())
      .filter((name) => !name.toLowerCase().includes("%image:signature"))
      .map((name) => ({
        name,
        required: true,
        showOnExcel: false,
      }));
    const newTemplate = new Template({
      templateName: title,
      description: description,
      url: `/uploads/templates/${file.filename}`,
      createdBy: req.session.userId,
      updatedBy: req.session.userId,
      templateVariables: templateVariables,
    });

    const saved = await newTemplate.save();

    res.status(201).json({ message: "Template uploaded successfully",data: saved,});
  } catch (error) {
    next(error);
  }
};

const handleBulkUpload = async (req, res, next) => {
    try {
      const { title, templateId } = req.body;
      const file = req.file;

      console.log("Received templateId:", templateId);

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (typeof templateId !== "string") {
        console.error(`Invalid templateId ${templateId} type => :`,typeof templateId);
        return res.status(400).json({ message: "templateId must be a string" });
      }
      const cleanTemplateId = templateId.trim();

      let templateIdObj;
      try {
        templateIdObj = new mongoose.Types.ObjectId(cleanTemplateId);
      } catch (err) {
        return res.status(400).json({ message: "Invalid template ID format" });
      }

      const existingTemplate = await findOne({ id: templateIdObj });
      console.log("Existing template:", existingTemplate);

      if (!existingTemplate) {
        return res.status(404).json({success:false ,message: "Template not found"});
      }

      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();

      const excelData = await extractExcelData(filePath);
      console.log("Extracted Excel data:", excelData);
      const allfields = Object.keys(excelData[0]);
      console.log("allfields", allfields);

      const validData = [];
      const skippedEntries = [];

      for (const [index, data] of excelData.entries()) {
        const hasEmptyField = allfields.some(
          (field) => !data[field] || data[field].toString().trim() === ""
        );

        if (hasEmptyField) {
          skippedEntries.push({rowNumber: index + 2,data,message: "Missing or empty fields",});
          continue;
        }

        validData.push({
          id: new mongoose.Types.ObjectId(),
          data: new Map(Object.entries(data)),
          signStatus: signStatus.unsigned,
        });
      }

      console.log(skippedEntries);
      const updatedTemplate = await updateOne(
        { id: templateIdObj },
        {
          $push: { data: { $each: validData } },
          $set: { updatedBy: req.session.userId },
        },
        { new: true }
      );

      if (!updatedTemplate) {
        return res.status(500).json({ message: "Update failed unexpectedly" });
      }

      res.status(201).json({
        message:
          "Excel data uploaded and saved successfully lkmnjbhvgcfgvbhnm,",
        templateData: updatedTemplate,
        allfields: updatedTemplate.templateVariables.map((v) => v.name),
      });
    } catch (error) {
      console.error("Error in datahandling:", error.message ,req.body.templateId,);
      next(error);
    }
  }
export { handleDocs, handleBulkUpload };
