export const CatchAsyncError = (passedFunction) =>  (req,res,next)=> {
         Promise.resolve(passedFunction(req,res,next)).catch(next);
    };
