
const config = require('../config');

exports.execute = async (sock, msg, query, { isOwner }) => {
    const sender = msg.key.remoteJid;
    
    // Check if this is a group chat
    if (!sender.includes('@g.us')) {
        await sock.sendMessage(sender, { 
            text: '❌ This command can only be used in groups!\n\n💀 Powered by DARK CRIME' 
        });
        return;
    }

    try {
        // Get group metadata to check admin status
        const groupMetadata = await sock.groupMetadata(sender);
        const botNumber = sock.user.id.replace(/:\d+/, '');
        const botParticipant = groupMetadata.participants.find(p => p.id.includes(botNumber));
        
        // Check if bot is admin
        if (!botParticipant || botParticipant.admin !== 'admin') {
            await sock.sendMessage(sender, { 
                text: '❌ I need to be an admin to mute/unmute the group!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Check if user is admin (for non-owners)
        const senderNumber = msg.key.participant || sender;
        const senderParticipant = groupMetadata.participants.find(p => p.id === senderNumber);
        if (!isOwner && (!senderParticipant || senderParticipant.admin !== 'admin')) {
            await sock.sendMessage(sender, { 
                text: '❌ Only group admins can mute/unmute the group!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        if (!query) {
            await sock.sendMessage(sender, {
                text: `🔇 **Group Mute/Unmute Command**

📝 **Usage:**
• \`.mute on\` - Mute group (only admins can send messages)
• \`.mute off\` - Unmute group (all members can send messages)
• \`.mute status\` - Check current group mute status

🎯 **Examples:**
• \`.mute on\` - Mutes the group
• \`.mute off\` - Unmutes the group

⚠️ **Note:** Bot must be admin to control group settings!

💀 Powered by DARK CRIME`
            });
            return;
        }

        const action = query.toLowerCase().trim();
        const groupName = groupMetadata.subject;

        if (action === 'on' || action === 'mute') {
            // Mute the group (only admins can send messages)
            await sock.groupSettingUpdate(sender, 'announcement');
            
            await sock.sendMessage(sender, {
                text: `🔇 **GROUP MUTED**

📢 **${groupName}** has been muted!

🚫 **Restrictions:**
• Only admins can send messages
• Regular members cannot send messages
• Voice notes and media are also restricted

👮‍♂️ **Muted by:** ${msg.pushName || senderNumber.split('@')[0]}
⏰ **Time:** ${new Date().toLocaleString()}

💡 **To unmute:** Use \`.mute off\`

💀 Powered by DARK CRIME`
            });

            console.log(`🔇 Group ${groupName} was muted by ${senderNumber.split('@')[0]}`);

        } else if (action === 'off' || action === 'unmute') {
            // Unmute the group (all members can send messages)
            await sock.groupSettingUpdate(sender, 'not_announcement');
            
            await sock.sendMessage(sender, {
                text: `🔊 **GROUP UNMUTED**

📢 **${groupName}** has been unmuted!

✅ **Freedom Restored:**
• All members can send messages
• Voice notes and media allowed
• Normal group activity resumed

👮‍♂️ **Unmuted by:** ${msg.pushName || senderNumber.split('@')[0]}
⏰ **Time:** ${new Date().toLocaleString()}

🎉 **Welcome back to free communication!**

💀 Powered by DARK CRIME`
            });

            console.log(`🔊 Group ${groupName} was unmuted by ${senderNumber.split('@')[0]}`);

        } else if (action === 'status') {
            // Check current mute status
            const isMuted = groupMetadata.announce;
            const statusEmoji = isMuted ? '🔇' : '🔊';
            const statusText = isMuted ? 'MUTED' : 'UNMUTED';
            const description = isMuted ? 'Only admins can send messages' : 'All members can send messages';

            await sock.sendMessage(sender, {
                text: `${statusEmoji} **GROUP STATUS**

📢 **Group:** ${groupName}
🎯 **Status:** ${statusText}
📝 **Description:** ${description}

👥 **Total Members:** ${groupMetadata.participants.length}
👮‍♂️ **Total Admins:** ${groupMetadata.participants.filter(p => p.admin === 'admin').length}

⏰ **Checked at:** ${new Date().toLocaleString()}

💀 Powered by DARK CRIME`
            });

        } else {
            await sock.sendMessage(sender, {
                text: '❌ Invalid option! Use:\n• `.mute on` - to mute group\n• `.mute off` - to unmute group\n• `.mute status` - to check status\n\n💀 Powered by DARK CRIME'
            });
        }

    } catch (err) {
        console.error('❌ Mute command error:', err);
        await sock.sendMessage(sender, { 
            text: '❌ Failed to change group settings. Make sure I have admin permissions!\n\n💀 Powered by DARK CRIME' 
        });
    }
};
