require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const studentRouter = require("./routes/studentRoute");
const adminRouter = require("./routes/adminRoute");
const companyRouter = require("./routes/companyRoute");
const cors = require("cors");

const app = express();

const port = process.env.PORT;

// built-in middlewares
app.use(cors({
  origin: 'http://localhost:3000', 
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true });

app.use(studentRouter);
app.use(adminRouter);
app.use(companyRouter);

app.listen(port, () => {
  console.log("Server is up on the port : " + port);
});
