import jwt from  "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if(!token){
            return res.status(401).json({ message: "No token provided" });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if(!decode){
            return res.status(401).json({ message: "Invalid token" });
        }
        req.id = decode.userId;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unauthorized: Invalid or expired token" });
    }
}

export default isAuthenticated;