import {Router} from 'express';
import Template from '../../models/template.js';
import upload from '../../middleware/uploads.js';
import { bulkUpload } from '../../middleware/uploads.js';
import path from 'path';
import {signStatus} from '../../constants/index.js'
import mongoose from 'mongoose';
import { find, findOne, updateOne, save } from '../../services/templates.js'
import extractExcelData  from  '../../utils/readExcel.js'
import {checkLoginStatus} from '../../middleware/checkAuth.js'
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import  convertToPDF from '../../utils/convertToPdf.js';
const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const userRole = req.session.role;
        console.log("userId", userId);
        console.log("userRole", userRole);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No session user ID" });
        }
        let data ;
          if(userRole == 2){
            data = await find({ $or: [ { assignedTo: userId },{ createdBy: userId } , {delegatedTo :userId}],
         status: { $ne: 0 }});
          }
          else if(userRole == 3){
         data = await find({ createdBy: userId, status: { $ne: 0 } });
    }
         console.log(data);
        res.status(200).json({ message: "Successfully fetched templates", data });
    } catch (error) {
        next(error);
    }
});

router.post('/',checkLoginStatus,upload.single("file"), async (req, res, next) => {
	try {
    		const {title, description} = req.body;
		   const file = req.file;
           console.log("Incoming body:", req.body);
          console.log("File:", file);
          console.log("file link " , file);
		if (!file) {
    			return res.status(400).json({ message: "No file uploaded" });
		} 

        const content = fs.readFileSync(file.path, 'binary');
        //console.log("reading the file at the time of / content => " ,  content)
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true,linebreaks: true, });

        const tags = doc.getFullText().match(/{{(.*?)}}|{(.*?)}/g) || [];
          
         const templateVariables = tags.map(tag => {
            const cleanTag = tag.replace(/{{|}}|{|}/g, '').trim();
              return {
                name: cleanTag,
                required: true,
                showOnExcel: false,
            };
        });  
		const newTemplate = new Template({
    		templateName: title,
			description : description,
			url:`/uploads/templates/${file.filename}`, 
			createdBy: req.session.userId,  
			updatedBy: req.session.userId ,
            templateVariables: templateVariables,            
		});

		const saved = await newTemplate.save();

		res.status(201).json({
    			message: "Template uploaded successfully",
    			data: saved
    		});
    	} catch (error) {
        		next(error);
        	}
        });
    
router.post('/datahandling',checkLoginStatus,bulkUpload.single("file"), async (req, res, next) => {
    try {
        const { title, templateId } = req.body;
        const file = req.file;
        
        console.log("Received templateId:", templateId);

		if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
         if (typeof(templateId) !== 'string') {
           console.error(`Invalid templateId ${templateId} type => :`, typeof(templateId));
           return res.status(400).json({ message: "templateId must be a string" });
         }
     const cleanTemplateId =  templateId.trim();
        
        let templateIdObj;
        try {
            templateIdObj = new mongoose.Types.ObjectId(cleanTemplateId);
        } catch (err) {
            return res.status(400).json({ message: "Invalid template ID format" });
        }

        const existingTemplate = await findOne({ id: templateIdObj });
        console.log("Existing template:", existingTemplate);
        
        if (!existingTemplate) {
            return res.status(404).json({ 
                message: "Template not found in DB",
                receivedId: cleanTemplateId,
                convertedId: templateIdObj
            });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        
        const excelData = await extractExcelData(filePath);
        console.log("Extracted Excel data:", excelData);
        const allfields = Object.keys(excelData[0]);
        console.log("allfields",allfields);

       const validData = [];
        const skippedEntries = [];

        for (const [index, data] of excelData.entries()) {
            const hasEmptyField = allfields.some(
                field => !data[field] || data[field].toString().trim() === ''
            );

            if (hasEmptyField) {
                skippedEntries.push({
                    rowNumber: index + 2, 
                    data,
                    message: "Missing or empty fields"
                });
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
                $set: { updatedBy: req.session.userId  ,
                },
            },
            { new: true }
        );

        if (!updatedTemplate) {
            return res.status(500).json({ message: "Update failed unexpectedly" });
        }

        res.status(201).json({
            message: "Excel data uploaded and saved successfully lkmnjbhvgcfgvbhnm,", 
            templateData: updatedTemplate,
            allfields:updatedTemplate.templateVariables.map(v => v.name),
        });

    } catch (error) {
        console.error("Error in datahandling:", {
            error: error.message,
            stack: error.stack,
            templateId: req.body.templateId
        });
        next(error);
    }
});

router.get('/:id/clone', async (req, res) => { 
    try{
    const id = req.params.id;
    console.log("welcome in clone id is " , id);
    const original = await Template.findOne({_id :id});
    console.log("findinf for cloning the data ", original);
    const cloned = new Template({
      ...original.toObject(),
      _id: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      id:req.session.userId, 
      createdBy:req.session.userId ,
      assignedTo:null,
      delegatedTo:null,  
      templateName: original.templateName + " (Clone)" ,
    });
    console.log("reques session id ", req.session.userId);
    await cloned.save(); 
    console.log("cloned data =>", cloned );
    res.send({ success: true });
    } catch (error) { 
    console.error("Error in cloning:", {
        error: error.message,
        stack: error.stack,
        templateId: req.params.id 
        }) 
        res.status(500).json({error:"Error in cloning the document"});
    }
  });
    

router.get('/:id', checkLoginStatus, async (req, res, next) => {
    try {
        const { id } = req.params;
          console.log("abc");
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }
 
        const template = await Template.findOne({ id: id });

        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        const transformedData = template.data.filter(item => !item.isDeleted).map(item => ({
            ...item.toObject(),
            data: item.data instanceof Map ? 
                Object.fromEntries(item.data) : 
                item.data,
            _id: item._id.toString()
        }));

        res.status(200).json({
            ...template.toObject(),
            data: transformedData,
            templateVariables: template.templateVariables,
            allfields: template.templateVariables.map(v => v.name)
        });
        
    } catch (error) {
        console.error("Fetch template error:", error);
        next(error);
    }
});

router.post('/delete/:id', checkLoginStatus, async (req, res, next) => { 
       const record = req.body;
       const {id} = req.params;
       console.log("record =>", record);
       console.log("id =>",id);  
       try {
        if (!record.id) {
            return res.status(400).json({ message: "Record ID is missing" });
        }
        const updatedTemplate = await Template.updateOne(
            { id: id }, 
            {
                $set: {
                    "data.$[elem].isDeleted": true
                }
            },
            {
                arrayFilters: [{ "elem.id": new mongoose.Types.ObjectId(record.id) }],
                new: true
            }
        );

        if (updatedTemplate.modifiedCount === 0) {
            return res.status(404).json({ message: "Record not found in data array" });
        }

        res.status(200).json({ success: true, message: "Record marked as deleted" });

    }  catch (error) {
        console.error("Error while marking record as deleted:", error);
        next(error);
    } 

  })

  router.get('/preview/:templateId/:dataId', async (req, res, next) => {
  const { templateId, dataId } = req.params;

  try {
    const template = await findOne({ id: templateId });
    if (!template) return res.status(404).send("Template not found");
     console.log("template data in preview =>", template.data);
    
     const dataRecord = template.data.find(item => item.id.toString() === dataId);
      console.log("dataRecord",dataRecord);
     if (!dataRecord) return res.status(404).send("Data not found");
     console.log("template.url  =>",template.url);

    const templatePath = path.join('uploads/templates', path.basename(template.url));
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // const filledData = Object.fromEntries(dataRecord.data);
    const filledData = dataRecord.data;
    doc.setData(filledData); 
    doc.render();

    const buf = doc.getZip().generate({ type: 'nodebuffer' }); 
    const pdfBuffer = await convertToPDF(buf);
    res.set({"Content-Type": "application/pdf"});
    res.setHeader("Content-Disposition", 'inline; filename="preview.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).send("Error generating preview");
  }
});


router.delete('/deleteWholeTemplate/:id',async (req,res)=>{
   
    const {id }= req.params;
    console.log("id while deleting template =>",id);
    try {
    const updatedTemplate = await updateOne(
            { _id: id },
            {
                $set: { status: 0  ,
                },
            },
            { new: true }
        );
        res.status(201).json({message:'successfully deleted' , data:updatedTemplate});
    }catch(err){
        console.error("Error deleting whole template :", err);
    }
}) 
router.post("/sendForSign",async (req, res)=>{
    try{ 
        // console.log("recordId  and officerId", recordId,officerId);
      const {recordId , officerId} = req.body.data ; 
      const updatedTemplate = await updateOne(
        { id:  recordId},
        {
            $set: { assignedTo:  officerId , signStatus:4
            },
        },
        { new: true }
    );  
      console.log("updatedTemplate ",updatedTemplate);
     res.status(200).json({success :true , message: "sent for sign"});
  } catch(err){
    console.error("Error sending for sign:", err);
  }
}) 

router.post("/delegate", async (req,res) =>{
    try{ 
         const {recordId ,reason} = req.body; 
         console.log("recordId , reason" , recordId , reason);
         const existingRecord = await findOne({ id: recordId });

         if (!existingRecord) {
             return res.status(404).json({ success: false, message: "Record not found" });
         }
 
         const createdBy = existingRecord.createdBy;
 
         const updatedTemplate = await updateOne(
             { id: recordId },
             {
                 $set: {
                     delegatedTo: createdBy,
                     signStatus: 3,
                     delegationReason: reason
                 },
             },
             { new: true }
         );
 
         res.status(200).json({ success: true, message: "Delegated", data: updatedTemplate }); 
    } catch(err){
        console.log("Error while delegate =>", err);
        res.status(400).json({success:false});
    }    
})
export default router;