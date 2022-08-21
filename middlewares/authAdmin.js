const jwt = require("jsonwebtoken");

const authAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        const admin = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = admin;
        next();
    } catch {
        res.status(401).send( { message: "Please Authenticate." } );
    }
}

module.exports = authAdmin;