import {Router} from 'express';
import Template from '../../models/template.js';
import upload from '../../middleware/uploads.js';
import path from 'path';
import { find, findOne, updateOne, save } from '../../services/otp.js'
import { find as findTemplate, updateOne as updatedTemplate} from "../../services/templates.js";
import {checkLoginStatus} from '../../middleware/checkAuth.js'
import  {checkOfficer}  from '../../middleware/checkOfficer.js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ImageModule from 'docxtemplater-image-module-free';
import  convertToPDF from '../../utils/convertToPdf.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

router.get('/:id',checkLoginStatus,checkOfficer , async (req,res)=>{
  try{
    const templateId = req.params.id;
    // **** code for generating OTP and storing it in database ****

    // const otp = Math.floor(100000 + Math.random() * 900000);
    // await save({
    //   templateId,
    //   userId,
    //   otp,
    //   createdAt: new Date(),
    //   expiresAt: new Date(Date.now() + 5 * 60 * 1000), 
    // }); 
    res.status(200).json({success:true , message:"generated Successfully"})
  } catch(err){
     console.log("error while generating OTP");
     res.status(400).json({success:false})
  }
}) 
router.post("/verify",checkLoginStatus , checkOfficer , async (req,res)=>{
  const {otp, recordId , selectedImg} = req.body; 
   console.log("otp =>",otp , " receiverId=>",recordId , " selectedImg",selectedImg);
  try{
    // const otpRecord = await OtpModel.findOne({ recordId});
    // if (!otpRecord || otpRecord.expiresAt < Date.now()) {
    //   return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    // }
       
    
    const templateDocArray = await findTemplate({ id: recordId });
    if (!templateDocArray || templateDocArray.length === 0) {
     return res.status(404).json({ message: "Template not found" });
     }
     const templateDoc = templateDocArray[0];
     console.log("templateDoc in the verify route =>",templateDoc);
     console.log("url of templateDoc =>",templateDoc.url);
    const templatePath = path.resolve(templateDoc.url.replace("/uploads", "./uploads/"));
    console.log("templatePath =>",templatePath);
    const relativePath = selectedImg.replace("http://localhost:3000/uploads/", "");
    const signaturePath = path.join(__dirname, "../../../uploads", relativePath);
    console.log("signaturePth =>",signaturePath);

    if (!fs.existsSync(signaturePath)) {
      return res.status(404).json({ message: "Signature image not found", path: signaturePath });
    }
     
    let signedCount = 0;

    for (const record of templateDoc.data) {
      if (record?.isDeleted) continue;

      const recordData = record.data || {}; 
      recordData["image:Signature"] = signaturePath;
      console.log("recordData =>", recordData)
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);

      const imageModule = new ImageModule({
        centered: false,
        getImage: tagValue => fs.readFileSync(tagValue),
        getSize: () => [150, 50],
      });

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
      });

      doc.render(recordData);
      const docBuffer = doc.getZip().generate({ type: 'nodebuffer' });

      const signedDocxPath = `uploads/signed/${Date.now()}_${record.id}_signed.docx`;
      fs.writeFileSync(signedDocxPath, docBuffer);

      const pdfBuf = await convertToPDF(docBuffer);

      const finalPdfPath = signedDocxPath.replace('.docx', '.pdf');
      fs.writeFileSync(finalPdfPath, pdfBuf);

      record.signStatus = 5;
      record.signedDate = new Date();
      record.url = finalPdfPath;
      signedCount++;
    }

    await templateDoc.save();
    // await updatedTemplate({ id: templateDoc.id }, { data: templateDoc.data });
    res.status(200).json({ 
      success:true,
      message: `Signing completed for ${signedCount} records`,
      signedCount,
    });

  } catch (err) {
    console.error("Signing error:", err);
    res.status(500).json({ message: "Signing failed", error: err.message });
  }
}) 


export default router ; 