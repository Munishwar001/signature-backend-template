import {Router} from 'express';
import Template from '../../models/template.js';
import upload from '../../middleware/uploads.js';
import path from 'path';
import { find, findOne, updateOne, save } from '../../services/otp.js'
import {checkLoginStatus} from '../../middleware/checkAuth.js'
import  {checkOfficer}  from '../../middleware/checkOfficer.js';
const router = Router();

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
router.post("/verify",async (req,res)=>{
  const {otp, receiverId} = req.body;
  try{
     console.log("getting the OTP from database");
     
     res.status(200).json({success:true , message:"verified"});
  }catch(err){
    console.log("error while verifying OTP", err);
    res.status(400).json({success:false , message:"Not verified"});
  }
}) 


export default router ; 