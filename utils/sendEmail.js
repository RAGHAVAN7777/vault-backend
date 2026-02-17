const axios = require("axios");

const sendEmail = async (to, subject, text) => {
    try {
        const response = await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: {
                    name: "Vault Security",
                    email: process.env.EMAIL_USER,
                },
                to: [
                    {
                        email: to,
                    },
                ],
                subject: subject,
                textContent: text,
            },
            {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Email sent via Brevo:", response.data);
        return response.data;
    } catch (error) {
        console.error("Brevo Error:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = sendEmail;
