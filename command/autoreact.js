
const moment = require('moment');

exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const messageKey = msg.key;
    
    // Array of random reaction emojis
    const reactions = [
        '😀', '😊', '😎', '🔥', '👍', '❤️', '😍', '🤩', '✨', '⚡',
        '🎉', '🎊', '🌟', '💯', '🚀', '🎵', '🎶', '😂', '🤔', '👌',
        '💪', '🙌', '👏', '🎯', '🔮', '💫', '🌈', '🎭', '🎨', '🎪'
    ];
    
    try {
        // Select random emoji
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        // React to the message
        await sock.sendMessage(sender, {
            react: {
                text: randomReaction,
                key: messageKey
            }
        });
        
        console.log(`🎭 Auto-reacted with ${randomReaction} to message from ${sender.split('@')[0]}`);
        
    } catch (err) {
        console.error('❌ Auto-react error:', err);
    }
};

// Function to check if message should get auto-reaction
exports.shouldAutoReact = (text, sender, config) => {
    // Don't auto-react to commands (messages starting with .)
    if (text.startsWith('.')) return false;
    
    // Don't auto-react to empty messages
    if (!text || text.trim() === '') return false;
    
    // Auto-react to every valid message (100% chance)
    return true;
};

// Function for manual reaction command
exports.executeManualReact = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;
    
    if (!query) {
        await sock.sendMessage(sender, {
            text: '🎭 **Auto React Command**\n\n📝 **Usage:**\n• `.autoreact on` - Enable auto reactions\n• `.autoreact off` - Disable auto reactions\n• `.autoreact emoji [emoji]` - React with specific emoji\n\n🎯 **Examples:**\n• `.autoreact emoji 🔥`\n• `.autoreact emoji ❤️`\n\n✨ Auto reactions add fun to conversations!'
        });
        return;
    }
    
    const [action, emoji] = query.split(' ');
    
    if (action === 'emoji' && emoji) {
        try {
            // Get the previous message to react to
            await sock.sendMessage(sender, {
                react: {
                    text: emoji,
                    key: msg.key
                }
            });
            
            await sock.sendMessage(sender, {
                text: `🎭 Reacted with ${emoji}!`
            });
            
        } catch (err) {
            console.error('❌ Manual reaction error:', err);
            await sock.sendMessage(sender, {
                text: '❌ Failed to react. Make sure you used a valid emoji!'
            });
        }
    } else if (action === 'on') {
        await sock.sendMessage(sender, {
            text: '✅ Auto reactions are already enabled!\n\n🎭 Bot will randomly react to messages with fun emojis!'
        });
    } else if (action === 'off') {
        await sock.sendMessage(sender, {
            text: '⚠️ Auto reactions feature is built-in and always active.\n\nTo disable, you would need to modify the bot code.'
        });
    } else {
        await sock.sendMessage(sender, {
            text: '❌ Invalid option!\n\nUse:\n• `.autoreact emoji [emoji]` - React with emoji\n• `.autoreact on/off` - Toggle reactions'
        });
    }
};
