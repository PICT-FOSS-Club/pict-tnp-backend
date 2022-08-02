const Company = require("../models/company");
const Student = require("../models/student");
const nodeMailer = require("nodemailer");

module.exports.apply_drive = async (req, res) => {
<<<<<<< HEAD
  const company = req.body;
  console.log("company", company);
  try {
    await Company.create(company);
    console.log("company", company);
    res
      .status(200)
      .json({ success: true, message: "Company Drive Added Successfully." });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({
        success: false,
        message: "Error while applying company drive.",
        errors: err,
      });
  }
};
=======
    const company = req.body;
    try {
        await Company.create(company);
        console.log('company', company)
        res.status(200).json({ success: true, message: "Company Drive Added Successfully." });
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ success: false, message: "Error while applying company drive.", errors: err });
    }
}
>>>>>>> bf8b2cf171cc9076470bcbdd4e3550d2c1740806

module.exports.drive_update = async (req, res) => {
  const { id, company } = req.body;

  try {
    await Company.findByIdAndUpdate(id, company);
    res
      .status(200)
      .json({
        success: true,
        message: "Company Details Updated Successfully.",
      });
  } catch {
    res
      .status(400)
      .json({
        success: false,
        message: "Error while updating the company details.",
      });
  }
};

module.exports.rounds_result = async (req, res) => {
  const { companyId, qualifiedStudents } = req.body;

  const transporter = nodeMailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    const company = await Company.findById(companyId);
    const currentRound = company.currentRound;
    if (company.currentRound + 1 > company.totalRounds) {
      return res
        .status(400)
        .json({ success: false, message: "Drive is Completed." });
    }
    company.currentRound = currentRound + 1;
    await company.save();

    const qualMessage = `Your are qualified for ${currentRound + 1} round of ${
      company.name
    }.`;
    const disqualMessage = `Your are Disqualified for ${
      currentRound + 1
    } round of ${company.name}.`;

    const previousQualifiedStudents = company.appliedStudents.filter(
      (appliedStudent) =>
        appliedStudent.roundCleared === company.currentRound - 1
    );

    const qualStudents = [],
      disqualStudents = [];
    for (i = 0; i < qualifiedStudents.length; i++) {
      qualStudents.push(qualifiedStudents[i].email);
    }

    for (const prevQualStudent of previousQualifiedStudents) {
      if (qualStudents.includes(prevQualStudent.email)) {
        await Company.findOneAndUpdate(
          {
            id: companyId,
            "appliedStudents.email": { $eq: prevQualStudent.email },
          },
          { $inc: { "appliedStudents.$.roundCleared": 1 } }
        );
        await Student.findOneAndUpdate(
          {
            email: prevQualStudent.email,
            "appliedCompanies.companyId": { $eq: companyId },
          },
          { $inc: { "appliedCompanies.$.roundCleared": 1 } }
        );
        if (company.currentRound === company.totalRounds) {
          company.result = true;
          company.ctc <= 20
            ? await Student.findOneAndUpdate(
                { email: prevQualStudent.email },
                { $set: { isLTE20: true } }
              )
            : await Student.findOneAndUpdate(
                { email: prevQualStudent.email },
                { $set: { isGTE20: true } }
              );
          company.save();
          qualMessage +=
            "\nCongratulations you are placed in ${company.name}!😍😍😍.";
        }
      } else {
        disqualStudents.push(prevQualStudent.email);
        await Company.findOneAndUpdate(
          {
            id: companyId,
            "appliedStudents.email": { $eq: prevQualStudent.email },
          },
          { $set: { "appliedStudents.$.studentResult": false } }
        );
        await Student.findOneAndUpdate(
          {
            email: prevQualStudent.email,
            "appliedCompanies.companyId": { $eq: companyId },
          },
          { $set: { "appliedCompanies.$.result": false } }
        );
      }
    }

    console.log("disqualStudents", disqualStudents);
    console.log("qualStudents", qualStudents);

<<<<<<< HEAD
    try {
      // let info = await transporter.sendMail({
      //     from: process.env.SMTP_SERVICE,
      //     to: qualStudents,
      //     subject: 'Qualification of Rounds',
      //     html: qualMessage
      // });
      // res.status(200).json({
      //     success: true,
      //     message: `Email send to ${qualStudents} successfully`,
      // });

      await transporter.sendMail(
        {
          from: process.env.SMTP_SERVICE,
          to: qualStudents,
          subject: "Qualification of Rounds",
          html: qualMessage,
        },
        (error, data) => {
          if (error) {
            console.log(error);
            res.status(500).json({ message: "ERROR SENDING MAIL !!!" });
          } else {
            console.log(
              "Sent! ",
              data.response,
              " messageId: ",
              data.messageId
            );
            res.status(200).json({ message: "NOTIFICATION MAIL SENT !!!" });
          }
        }
      );
      // console.log("Message sent: %s", info.messageId);
    } catch (err) {
      console.log("err in rounds_result", err);
    }

    try {
      // let info = await transporter.sendMail({
      //     from: process.env.SMTP_SERVICE,
      //     to: disqualStudents,
      //     subject: 'Qualification of Rounds',
      //     html: disqualMessage
      // });
      // res.status(200).json({
      //     success: true,
      //     message: `Email send to ${disqualStudents} successfully`,
      // });
      await transporter.sendMail(
        {
          from: process.env.SMTP_SERVICE,
          to: disqualStudents,
          subject: "Qualification of Rounds",
          html: disqualMessage,
        },
        (error, data) => {
          if (error) {
            console.log(error);
            res.status(500).json({ message: "ERROR SENDING MAIL !!!" });
          } else {
            console.log("Sent!", data.response, " messageId: ", data.messageId);
            res.status(200).json({ message: "NOTIFICATION MAIL SENT !!!" });
          }
        }
      );
      // console.log("Message sent: %s", info.messageId);
    } catch (err) {
      console.log("err in rounds_result", err);
    }

    res
      .status(200)
      .json({ success: true, message: "Result Updated Successfully" });
  } catch {
    res
      .status(400)
      .json({
        success: false,
        message: "Error while updating the company details.",
      });
  }
};
=======
        try {
            // let info = await transporter.sendMail({
            //     from: process.env.SMTP_SERVICE,
            //     to: qualStudents,
            //     subject: 'Qualification of Rounds',
            //     html: qualMessage
            // });
            // res.status(200).json({
            //     success: true,
            //     message: `Email send to ${qualStudents} successfully`,
            // });
            if(qualMessage.length !=0){

                await transporter.sendMail({
                    from: process.env.SMTP_SERVICE,
                    to: qualStudents,
                    subject: 'Qualification of Rounds',
                    html: qualMessage
                }, async (error, data) => {
                    if (error) {
                        console.log(error);
                        res.status(500).json({ message: 'ERROR SENDING MAIL !!!' });
                    } else {
                        // console.log("Sent! ", data.response, " messageId: ", data.messageId);
                        // res.status(200).json({ message: 'NOTIFICATION MAIL SENT !!!' });
                        if(disqualStudents.length !=0){

                            await transporter.sendMail({
                                from: process.env.SMTP_SERVICE,
                                to: disqualStudents,
                                subject: 'Qualification of Rounds',
                                html: disqualMessage
                            }, (error, data) => {
                                if (error) {
                                    console.log(error);
                                    res.status(500).json({ message: 'ERROR SENDING MAIL !!!' });
                                } else {
                                    console.log("Sent!", data.response, " messageId: ", data.messageId);
                                    res.status(200).json({ message: 'NOTIFICATION MAIL SENT !!!' });
                                }
                            });
                        }
                    }
                });
        }
            // console.log("Message sent: %s", info.messageId);
        } catch (err) {
            console.log('err in rounds_result', err);
        }

        // try {
        //     // let info = await transporter.sendMail({
        //     //     from: process.env.SMTP_SERVICE,
        //     //     to: disqualStudents,
        //     //     subject: 'Qualification of Rounds',
        //     //     html: disqualMessage
        //     // });
        //     // res.status(200).json({
        //     //     success: true,
        //     //     message: `Email send to ${disqualStudents} successfully`,
        //     // });

        //     // console.log("Message sent: %s", info.messageId);
        // } catch (err) {
        //     console.log('err in rounds_result', err);
        // }

        // res.status(200).json({ success: true, message: "Result Updated Successfully" });
    }
    catch {
        res.status(400).json({ success: false, message: "Error while updating the company details." });
    }
}
>>>>>>> bf8b2cf171cc9076470bcbdd4e3550d2c1740806
