import {Router} from 'express';
import uploadSign from '../../middleware/signUpload.js'
const router = Router();

router.post('/upload',uploadSign.single("file"), async (req, res, next) => {
    try {   
         console.log("welcome to sign route "); 
		const file = req.file;
        console.log("contains file meta data " , file); 
         res.status(200).json({success : true , message :"uploaded successfully"});
        // throw new Error("Not Implemented yet");
    } catch (error) {
        next(error);
    }
});

export default router;