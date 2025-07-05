const axios = require('axios');
const moment = require('moment');

exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const currentTime = moment().format('MMMM Do YYYY, h:mm A');
    const imageUrl = 'https://files.catbox.moe/op1en8.jpg';

    const menuText = `〔 ☠️𝙳𝙰𝚁𝙺 𝙲𝚁𝙸𝙼𝙴☠️〕

┃ 🕒 Time: ${currentTime}

┃ 👋.hello  
┃ 🤖.alive   
┃ 🏓.ping    
┃ 📋.menu     
┃ 🎵.song 
┃ 🎬.video 
┃ 🎤.lyrics 
┃ 🎙️.voice 
┃ 🎭.autoreact
┃ 👑.owner   
┃ 👢.kick
┃ 🎊.welcome
┃ 📱.tiktokdl

🔧 **Admin Commands:**
• .kick @user - Remove member from group
• .mute on/off - Mute/unmute group
• .welcome - Manual welcome message

┃ 🤖 *Auto-Reply: ON*
┃ 🎭 *Auto-React: ON*
┃ 💬 Send any message to get a response!

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✨ 𝙳𝙰𝚁𝙺 𝚌𝚛𝚒𝚖𝚎 𝚘𝚏𝚏𝚒𝚌𝚎𝚕 𝚋𝚘𝚝

💀 Powered by DARK CRIME`.trim();

    try {
        console.log('📋 Downloading menu image...');
        const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const imageBuffer = Buffer.from(response.data, 'binary');

        console.log('📋 Sending menu with image...');
        await sock.sendMessage(sender, {
            image: imageBuffer,
            caption: menuText
        });
        console.log('📋 Menu sent successfully with image!');
    } catch (err) {
        console.log('📋 Image download failed, sending text menu:', err.message);
        try {
            await sock.sendMessage(sender, { 
                text: menuText
            });
            console.log('📋 Text menu sent successfully!');
        } catch (textErr) {
            console.error('📋 Failed to send text menu:', textErr.message);
            await sock.sendMessage(sender, { 
                text: '📋 Menu\n\n👋.hello\n🤖.alive\n🏓.ping\n📋.menu\n🎵.song\n🎬.video\n🎤.lyrics\n🎙️.voice\n👑.owner' 
            });
        }
    }
};