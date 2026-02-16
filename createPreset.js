require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function createVaultPreset() {
    try {
        console.log("INITIALIZING_PRESET_CREATION...");
        const result = await cloudinary.api.create_upload_preset({
            name: "vault_unsigned",
            unsigned: true,
            type: "upload",
            access_mode: "public",
            resource_type: "auto",
            tags: "vault_system",
            folder: "vault_unprotected"
        });
        console.log("PRESET_CREATED_SUCCESSFULLY:", result.message);
        process.exit(0);
    } catch (error) {
        console.error("PRESET_CREATION_FAILED:", error);
        process.exit(1);
    }
}

createVaultPreset();
