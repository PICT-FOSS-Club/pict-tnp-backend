const jwt = require("jsonwebtoken");
const Student = require("../models/student");

const authStudent = async (req, res, next) => {
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

module.exports = authStudent;