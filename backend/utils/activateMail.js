const nodemailer = require("nodemailer")
const { ADMIN_EMAIL, ADMIN_PASS } = process.env

const activateMailAccount = (to, url, text) => {
    const smtpTransport = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: {
            user: ADMIN_EMAIL,
            pass: ADMIN_PASS
        }
    }) 

    const mailOptions = {
        from: ADMIN_EMAIL,
        to: to,
        subject: "ACCOUNT ACTIVATION",
        html: `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Activation</title>
        </head>
        <body>
            <div style="background-color: #333333; font-family: Verdana; color: #fff; text-align: center; margin: 0; padding: 0;">
                <div style="margin: 0 auto; padding: 0 15px; display: flex; align-items: center; justify-content: center;">
                    <div style="margin: 1rem;">
                        <div style="">
                            <h1 style="color: #3292ec;">Account Activation</h1>
                            <h3>Welcome! and thank you for signup</h3>
                            <p>Just click the button below to complete the signup process.</p>
                            <p style="color: #3292ec; font-weight: bold;">The link will expire in 15 minutes.</p>
                            <a href="${url}" style="text-decoration: none;">
                                <button style="padding: 1em 6em; border-radius: 5px; border: 0; background-color: #0184ff; color: white; transition: background-color 0.3s ease-in; cursor: pointer;">
                                    ${text}
                                </button>
                            </a>
                            <p style="margin-top: 2rem;">If the button above does not work, please navigate to the link provided below 👇🏻</p>
                            <div style="word-break: break-all;">${url}</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `,
    } 

    smtpTransport.sendMail(mailOptions, (err, info) => {
        if (err) return { err }
        return info
    })
}

module.exports = { activateMailAccount }