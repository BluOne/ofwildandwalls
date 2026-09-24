import {Request, Response, NextFunction} from "express";


const authenticate = (req: Request, res: Response, next: NextFunction)=>{
   

    if(!req.session.userId){
        return res.redirect("/admin/login")
    }
next();

};

export default authenticate;