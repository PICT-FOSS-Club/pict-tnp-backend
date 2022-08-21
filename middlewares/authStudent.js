const jwt = require("jsonwebtoken");

const authStudent = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        console.log('token',token)
        const studentId = jwt.verify(token, process.env.JWT_SECRET);
        console.log('student',studentId)
        req.studentId = studentId;
        next();
    } catch {
        res.status(401).send( { success:false, message: "Please Authenticate." } );
    }
}

module.exports = authStudent;