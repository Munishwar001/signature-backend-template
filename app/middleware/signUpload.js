import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


const router = Router();

const uploadSignDirectory = 'uploads/signatures' ; 

     if (!fs.existsSync(uploadSignDirectory)) {
       fs.mkdirSync(uploadSignDirectory, { recursive: true });
     }
   
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadSignDirectory);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const imageFileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, png) are allowed!'), false);
    }
  };
  
  const uploadSign = multer({
    storage,
    fileFilter: imageFileFilter,
  });

  export default uploadSign ; 