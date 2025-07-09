import {Router} from 'express';

const router = Router();

router.get('/', async (req, res, next) => {
    try { 
        console.log("welcome to sign route uhgfjgkhl "); 
        res.status(200);
        throw new Error("Not Implemented yet");
    } catch (error) {
        next(error);
    }
});

export default router;