
const config = require('../config');

exports.execute = async (sock, msg, query, { isOwner }) => {
    const sender = msg.key.remoteJid;
    
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: '❌ This command is only available to the bot owner.' 
        });
        return;
    }

    if (!query) {
        await sock.sendMessage(sender, { 
            text: '⚠️ Please provide code to evaluate.\n\nExample: `.eval console.log("Hello")`' 
        });
        return;
    }

    try {
        let result = eval(query);
        if (typeof result !== 'string') {
            result = JSON.stringify(result, null, 2);
        }
        
        await sock.sendMessage(sender, { 
            text: `📝 **Code Evaluation**\n\n**Input:**\n\`\`\`${query}\`\`\`\n\n**Output:**\n\`\`\`${result}\`\`\`` 
        });
    } catch (err) {
        await sock.sendMessage(sender, { 
            text: `❌ **Error:**\n\`\`\`${err.message}\`\`\`` 
        });
    }
};
