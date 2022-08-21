const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

const authAdmin = async (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        let AuthError = { error: "Admin is not authenticated!" };
        res.status(401).send({ AuthError });
      } else {
        const admin = await Admin.findById(decodedToken.id);
        req.admin = admin;
        next();
      }
    });
  } else {
    let AuthError = { error: "Admin is not authenticated!" };
    res.status(401).send({ AuthError });
  }
};

module.exports = authAdmin;
