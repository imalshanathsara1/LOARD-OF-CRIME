
const moment = require('moment');

exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const senderName = msg.pushName || sender.split('@')[0];
    const currentTime = moment().format('h:mm A');
    
    // Different auto-reply messages based on keywords or random selection
    const text = msg.message.conversation || 
                msg.message.extendedTextMessage?.text || 
                msg.message.imageMessage?.caption || 
                msg.message.videoMessage?.caption || '';
    
    let autoReply = '';
    
    // Keyword-based responses
    if (text.toLowerCase().includes('hi') || text.toLowerCase().includes('hi')) {
        autoReply = `👋 Hello ${senderName}! Welcome to Dark Crime Bot!\n\n🤖 I'm here to help you. Type .menu to see all available commands!\n\n⏰ Time: ${currentTime}\n\n💀 Powered by DARK CRIME`;
    } else if (text.toLowerCase().includes('mk')) {
        autoReply = `😊 I'm doing great, thanks for asking ${senderName}!\n\n🔥 I'm always ready to help you with music, videos, and more!\n\nType .menu to explore my features! 🚀\n\n💀 Powered by DARK CRIME`;
    } else if (text.toLowerCase().includes('m')) {
        autoReply = `🙏 You're welcome ${senderName}!\n\nHappy to help anytime! 😊\n\nType .menu for more commands! 🎵\n\n💀 Powered by DARK CRIME`;
    } else if (text.toLowerCase().includes('bye') || text.toLowerCase().includes('goodbye')) {
        autoReply = `👋 Goodbye ${senderName}!\n\nSee you later! Come back anytime for music and entertainment! 🎶\n\n💀 Powered by DARK CRIME`;
    } else {
        // Random general responses for other messages
        const randomReplies = [
            `🤖 Hi ${senderName}! I received your message!\n\nType .menu to see what I can do for you! 🎵\n\n💀 Powered by DARK CRIME`,
            `✨ Hello ${senderName}! Thanks for messaging!\n\n🎶 I can help you with music, videos, and more!\n\nTry .menu to get started! 🚀\n\n💀 Powered by DARK CRIME`,
            `🔥 Hey ${senderName}! What's up?\n\n🎵 Ready to download some music or videos?\n\nType .menu to explore! 📱\n\n💀 Powered by DARK CRIME`,
            `👋 Hi there ${senderName}!\n\n🤖 I'm Dark Crime Bot, your entertainment assistant!\n\nUse .menu to see all commands! 🎬\n\n💀 Powered by DARK CRIME`
        ];
        
        autoReply = randomReplies[Math.floor(Math.random() * randomReplies.length)];
    }
    
    try {
        await sock.sendMessage(sender, { 
            text: autoReply 
        });
        console.log(`🤖 Auto-reply sent to ${senderName}`);
    } catch (err) {
        console.error('❌ Auto-reply error:', err);
    }
};

// Function to check if message should get auto-reply
exports.shouldAutoReply = (text, sender, config) => {
    // Don't auto-reply to commands (messages starting with .)
    if (text.startsWith('.')) return false;
    
    // Don't auto-reply to bot owner (optional - remove this if you want auto-replies to owner)
    // if (sender === config.OWNER_NUMBER) return false;
    
    // Don't auto-reply to empty messages
    if (!text || text.trim() === '') return false;
    
    // Don't auto-reply to very short messages (less than 2 characters)
    if (text.trim().length < 2) return false;
    
    return true;
};
