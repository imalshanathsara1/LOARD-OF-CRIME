
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
                text: '❌ I need to be an admin to kick members!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Check if user is admin (for non-owners)
        const senderParticipant = groupMetadata.participants.find(p => p.id === sender.split('@')[0] + '@s.whatsapp.net');
        if (!isOwner && (!senderParticipant || senderParticipant.admin !== 'admin')) {
            await sock.sendMessage(sender, { 
                text: '❌ Only group admins can use this command!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        if (!query) {
            await sock.sendMessage(sender, {
                text: '👢 **Group Kick Command**\n\n📝 **Usage:**\n• `.kick @user` - Kick mentioned user\n• `.kick reply` - Reply to a message to kick that user\n\n🎯 **Examples:**\n• `.kick @94123456789`\n• Reply to someone\'s message and type `.kick reply`\n\n⚠️ **Note:** Bot must be admin to kick members!\n\n💀 Powered by DARK CRIME'
            });
            return;
        }

        let targetNumber = null;

        // Method 1: Check if replying to a message
        if (query.toLowerCase() === 'reply' && msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo;
            targetNumber = quotedMsg.participant || quotedMsg.remoteJid;
        }
        // Method 2: Check for mentioned users
        else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetNumber = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Method 3: Extract number from query text
        else if (query.includes('@')) {
            const numberMatch = query.match(/(\d+)/);
            if (numberMatch) {
                targetNumber = numberMatch[1] + '@s.whatsapp.net';
            }
        }
        else {
            // Try to parse as plain number
            const cleanNumber = query.replace(/\D/g, '');
            if (cleanNumber.length >= 10) {
                targetNumber = cleanNumber + '@s.whatsapp.net';
            }
        }

        if (!targetNumber) {
            await sock.sendMessage(sender, { 
                text: '❌ Please mention a user or reply to their message!\n\nExample: `.kick @94123456789` or reply to a message with `.kick reply`\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Check if target is in the group
        const targetParticipant = groupMetadata.participants.find(p => p.id === targetNumber);
        if (!targetParticipant) {
            await sock.sendMessage(sender, { 
                text: '❌ User not found in this group!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Prevent kicking other admins (unless user is owner)
        if (!isOwner && targetParticipant.admin === 'admin') {
            await sock.sendMessage(sender, { 
                text: '❌ Cannot kick group admins!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Prevent kicking the bot owner
        if (targetNumber === config.OWNER_NUMBER) {
            await sock.sendMessage(sender, { 
                text: '❌ Cannot kick the bot owner!\n\n💀 Powered by DARK CRIME' 
            });
            return;
        }

        // Perform the kick
        await sock.groupParticipantsUpdate(sender, [targetNumber], 'remove');
        
        const targetName = targetParticipant.notify || targetNumber.split('@')[0];
        await sock.sendMessage(sender, { 
            text: `👢 Successfully kicked ${targetName} from the group!\n\n⚡ Action performed by: ${msg.pushName || sender.split('@')[0]}\n\n💀 Powered by DARK CRIME` 
        });

        console.log(`👢 User ${targetName} was kicked from group by ${sender.split('@')[0]}`);

    } catch (err) {
        console.error('❌ Kick command error:', err);
        await sock.sendMessage(sender, { 
            text: '❌ Failed to kick user. Make sure I have admin permissions and the user is in this group!\n\n💀 Powered by DARK CRIME' 
        });
    }
};
