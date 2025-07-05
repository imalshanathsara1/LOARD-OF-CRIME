
// Bot Configuration
module.exports = {
    // Replace with your WhatsApp number (include country code without +)
    OWNER_NUMBER: '94740196225@s.whatsapp.net', // Change this to your number
    
    // Commands that only owner can use
    OWNER_ONLY_COMMANDS: ['eval', 'restart', 'ban', 'unban', 'broadcast'],
    
    // Bot settings
    BOT_NAME: 'WhatsApp Bot',
    PREFIX: '.',
    
    // Other settings
    MAX_DOWNLOAD_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_VIDEO_DURATION: 600 // 10 minutes
};
