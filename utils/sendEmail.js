const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, text) => {
    try {
        const response = await resend.emails.send({
            from: "onboarding@resend.dev", // default sender for testing
            to: to,
            subject: subject,
            html: `<p>${text}</p>`,
        });

        console.log("Email sent:", response);
        return response;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

module.exports = sendEmail;
