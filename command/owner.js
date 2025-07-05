
const config = require('../config');

exports.execute = async (sock, msg, query, { isOwner }) => {
    const sender = msg.key.remoteJid;
    
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: '❌ You are not the owner of this bot!' 
        });
        return;
    }

    const ownerNumber = config.OWNER_NUMBER.replace('@s.whatsapp.net', '');
    
    await sock.sendMessage(sender, { 
        text: `👑 **BOT OWNER PANEL**

📱 **Owner Number:** +${ownerNumber}
🤖 **Bot Name:** ${config.BOT_NAME}
📝 **Command Prefix:** ${config.PREFIX}

🔧 **Owner-Only Commands:**
${config.OWNER_ONLY_COMMANDS.map(cmd => `• .${cmd}`).join('\n')}

⚡ **Bot Status:** Online & Active
🛡️ **Security:** Protected
🎯 **Access Level:** Owner Only

💀 Powered by DARK CRIME`
    });
};
