const jwt = require("jsonwebtoken");
const Student = require("../models/student");

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

    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                let AuthError = { error: "Student is not authenticated!" };
                res.status(401).send({ AuthError });
            } else {
                const student = await Student.findById(decodedToken.id);
                req.student = student;
                next();
            }
        });
    } else {
        let AuthError = { error: "Student is not authenticated!" };
        res.status(401).send({ AuthError });

    }
}
}

module.exports = authStudent;