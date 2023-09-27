class ErrorHandler extends Error {
    constructor(message,statusCode){

        super(message);
        this.statusCode = statusCode;
        console.log(statusCode);
    }
}


export default ErrorHandler;