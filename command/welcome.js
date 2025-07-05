
const moment = require('moment');
const config = require('../config');

exports.handleGroupUpdate = async (sock, update) => {
    try {
        const { id, participants, action } = update;
        
        // Only handle group events
        if (!id.includes('@g.us')) return;
        
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(id);
        const groupName = groupMetadata.subject;
        
        for (const participant of participants) {
            const participantNumber = participant.split('@')[0];
            
            if (action === 'add') {
                // Welcome message for new members
                const welcomeMessage = `
🎉 *WELCOME TO ${groupName.toUpperCase()}!* 🎉

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👋 Welcome @${participantNumber}!
┃  
┃  🌟 You've joined an amazing community!
┃  
┃  📋 *Quick Start:*
┃  • Type .menu to see all bot commands
┃  • Use .hello for a greeting
┃  • Try .song [name] to download music
┃  • Use .video [name] for video downloads
┃  
┃  🤖 *Bot Features:*
┃  • Auto-Reply: Enabled ✅
┃  • Auto-React: Enabled ✅
┃  • Music & Video Downloads
┃  • Voice Messages
┃  • And much more!
┃  
┃  🎯 *Group Rules:*
┃  • Be respectful to all members
┃  • No spam or inappropriate content
┃  • Enjoy and have fun!
┃  
┃  ⏰ Joined: ${moment().format('MMMM Do YYYY, h:mm A')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔥 Welcome to the *DARK CRIME* family! 🔥

💀 Powered by DARK CRIME
                `.trim();

                // Send welcome message
                await sock.sendMessage(id, {
                    text: welcomeMessage,
                    mentions: [participant]
                });

                console.log(`👋 Welcome message sent to ${participantNumber} in group ${groupName}`);

            } else if (action === 'remove') {
                // Goodbye message for leaving members
                const goodbyeMessage = `
😢 *GOODBYE FROM ${groupName.toUpperCase()}* 😢

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👋 @${participantNumber} has left the group
┃  
┃  🌅 *Farewell Message:*
┃  Thanks for being part of our community!
┃  
┃  ✨ You were a valued member of this group
┃  🤝 The door is always open for your return
┃  🎭 Hope to see you again soon!
┃  
┃  📊 *Your Time With Us:*
┃  • Contributed to our amazing community
┃  • Shared memorable moments
┃  • Left a positive impact
┃  
┃  💫 *Final Words:*
┃  "Goodbyes are not forever, they are not the end;
┃   it simply means I'll miss you until we meet again."
┃  
┃  ⏰ Left: ${moment().format('MMMM Do YYYY, h:mm A')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🌟 Thank you for being part of the *DARK CRIME* family! 🌟

💀 Powered by DARK CRIME
                `.trim();

                // Send goodbye message
                await sock.sendMessage(id, {
                    text: goodbyeMessage
                });

                console.log(`👋 Goodbye message sent for ${participantNumber} in group ${groupName}`);
            }
        }

    } catch (err) {
        console.error('❌ Welcome/Goodbye message error:', err);
    }
};

// Alternative welcome message for manual use
exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;
    
    if (!sender.includes('@g.us')) {
        await sock.sendMessage(sender, { 
            text: '❌ This command can only be used in groups!\n\n💀 Powered by DARK CRIME' 
        });
        return;
    }

    const groupMetadata = await sock.groupMetadata(sender);
    const groupName = groupMetadata.subject;

    const manualWelcomeMessage = `
🎊 *MANUAL WELCOME ACTIVATED!* 🎊

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🌟 Welcome everyone to ${groupName}!
┃  
┃  🤖 *DARK CRIME BOT* is active and ready!
┃  
┃  📋 *Available Commands:*
┃  • .menu - Show all commands
┃  • .song [name] - Download music
┃  • .video [name] - Download videos
┃  • .voice [name] - Voice messages
┃  • .lyrics [name] - Get song lyrics
┃  • .alive - Check bot status
┃  • .ping - Test response time
┃  
┃  🎭 *Auto Features:*
┃  • Auto-Reply: ON ✅
┃  • Auto-React: ON ✅
┃  • Welcome Messages: ON ✅
┃  • Goodbye Messages: ON ✅
┃  
┃  ⏰ Current Time: ${moment().format('MMMM Do YYYY, h:mm A')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔥 *DARK CRIME* family welcomes you all! 🔥

💀 Powered by DARK CRIME
    `.trim();

    await sock.sendMessage(sender, { text: manualWelcomeMessage });
};
