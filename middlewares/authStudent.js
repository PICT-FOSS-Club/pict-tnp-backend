const jwt = require("jsonwebtoken");

const authStudent = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        const student = await jwt.verify(token, process.env.JWT_SECRET);
        req.student = student;
        next();
    } catch {
        res.status(401).send( { success:false, message: "Please Authenticate." } );
    }
}

module.exports = authStudent;