import {Router} from 'express';
import uploadSign from '../../middleware/signUpload.js'
import {save  , find} from '../../services/signature.js'
const router = Router();

router.post('/upload',uploadSign.single("file"), async (req, res, next) => {
    try {   
		const file = req.file; 
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        } 
         
        console.log("contains file meta data " , file); 
        const fileUrl = `http://localhost:3000/uploads/signatures/${file.filename}`;
      await save({
       userId: req.session.userId,
        url: fileUrl,
        createdBy: req.session.userId,
        updatedBy: req.session.userId,
      });
         res.status(200).json({success : true , message :"uploaded successfully" , url:fileUrl});
    } catch (error) { 
        next(error);
    }
}); 

router.get("/getSignature/:loggedUserId",async (req , res)=>{
    const loggedUserId =  req.params.loggedUserId;
    console.log("get the logged userID ->",loggedUserId); 
     const response = await find({userId:loggedUserId});
     console.log("response of getSignature",response);
     res.status(200).json({success:true , message :"Successfully fetch the data " ,response:response});
})

export default router;