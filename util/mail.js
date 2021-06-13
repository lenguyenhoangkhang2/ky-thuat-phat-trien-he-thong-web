const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const dotenv = require("dotenv");
dotenv.config({ path: "../config/config.env" });

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const refreshToken = process.env.REFRESH_TOKEN;
const adminEmail = process.env.ADMIN_EMAIL;

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
oAuth2Client.setCredentials({ refresh_token: refreshToken });

exports.sendMail = async ({ to, subject, htmlContent }) => {
  const accessToken = await oAuth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAUTH2",
      user: "18520887@gm.uit.edu.vn",
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
      accessToken: accessToken,
    },
    // logger: true,
    // debug: true,
  });

  return transporter.sendMail({
    from: "HOÀNG KHANG <" + adminEmail + ">",
    to: to,
    subject: subject,
    html: htmlContent,
  });
};
