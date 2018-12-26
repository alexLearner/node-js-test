const nodemailer = require('nodemailer');


const MAILER_DEFAULT_CONFIG = {
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
};

const MAILER_DEFAULT_SEND_CONFIG = {
  from: 'alexq.dev@gmail.com',
  subject: 'Subject message',
  text: 'Default message',
};

exports.sendMail = (config) => {
  const transporter = nodemailer.createTransport(MAILER_DEFAULT_CONFIG);

  transporter.sendMail({
    ...MAILER_DEFAULT_SEND_CONFIG,
    ...config,
  }, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Message sent: ${info.response}`);
    }
  });
};
