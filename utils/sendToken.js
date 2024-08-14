export const sendToken = (res, user, message, statusCode = 200) => {
    const token = user.getJWTToken();

    const options = {
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', // true only in production (HTTPS)
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // 'None' for cross-site in production, 'Lax' for local dev
    };

    res.status(statusCode)
       .cookie("token", token, options)
       .json({
           success: true,
           message,
           user,
       });
};
