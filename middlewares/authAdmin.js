const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const authAdmin = async (req, res, next) => {
  const token = await req.cookies.token;
  console.log(token);
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        let AuthError = {
          success: false,
          message: "1Admin is not authenticated!",
        };
        res.status(401).send({ AuthError });
      } else {
        const admin = await Admin.findById(decodedToken.id);
        req.admin = admin;
        next();
      }
    });
  } else {
    let AuthError = { success: false, message: "2Admin is not authenticated!" };
    res.status(401).json({ AuthError });
  }
};

module.exports = authAdmin;
