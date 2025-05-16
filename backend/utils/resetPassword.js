const nodemailer = require("nodemailer")
const { ADMIN_EMAIL, ADMIN_PASS } = process.env

const receiveOTP = (to, otp) => {
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
            <title>Verification Code</title>
        </head>
        <body>
            <div style="background-color: #333333; font-family: Verdana; color: #fff; margin: 0; padding: 0;">
                <div style="margin: 0 auto; padding: 0 15px; display: flex; align-items: center; justify-content: center;">
                    <div style="margin: 1rem;">
                        <h1 style="color: #3292ec;">Verification Code</h1>
                        <p>We detected someone trying to reset your account password. If this was you, here is your one-time password (OTP) Verification Code 👇.</p>
                        <div style="background-color: #385877; padding: 1rem; font-size: 2rem; margin: 1rem 0;">
                            <strong>${otp}</strong>
                        </div>
                        <p style="color: #3292ec; font-weight: bold;">The code will expire in 5 minutes.</p>
                        <p style="margin-top: 2rem;">
                            <strong>Don't share this OTP with anyone.</strong> We take your account security very seriously. Customer Service will never ask you to disclose or verify your password, OTP, or credit card number. If you receive a suspicious email with a link to update your account information, don't click on the link. Instead, report the email to us for investigation.
                        </p>
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

module.exports = { receiveOTP }