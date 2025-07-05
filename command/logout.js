
const fs = require('fs');
const path = require('path');

exports.execute = async (sock, msg, query, { isOwner }) => {
    const sender = msg.key.remoteJid;
    
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: '❌ This command is only available to the bot owner.' 
        });
        return;
    }

    try {
        await sock.sendMessage(sender, { 
            text: '🔄 Logging out and clearing session...\n📱 New QR code will be generated automatically!' 
        });

        // Clear auth files
        const authPath = path.join(__dirname, '..', 'auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('🗑️ Auth files cleared by owner command');
        }

        // Logout from WhatsApp
        await sock.logout();
        
        console.log('👑 Owner triggered logout - QR will regenerate');
        
    } catch (err) {
        console.error('❌ Logout error:', err);
        await sock.sendMessage(sender, { 
            text: '⚠️ Logout completed. Check console for new QR code!'
        });
    }
}; 
        });
    }
};
