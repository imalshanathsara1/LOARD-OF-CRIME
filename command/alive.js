const axios = require('axios');
const moment = require('moment');

exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const currentTime = moment().format('MMMM Do YYYY, h:mm A');
    const imageUrl = 'https://files.catbox.moe/op1en8.jpg';

    const aliveText = `𝗗𝗔𝗥𝗞 𝗖𝗥𝗜𝗠𝗘 𝗠𝗗 𝗢𝗡𝗟𝗜𝗡𝗘🥱


🧠 System: Operational

📡 Connection: Stable  

🔋 Power: 100%

🕒 Time: ${currentTime}

👑 Identity: 𝗟𝗢𝗔𝗥𝗗 𝗢𝗙 𝗖𝗥𝗜𝗠𝗘 

☠️𝙲𝚁𝙴𝙰𝚃𝙴𝚁=𝗜𝗠𝗔𝗟𝗦𝗛𝗔

💀 Powered by DARK CRIME

    `.trim();

    try {
        console.log('🤖 Downloading alive image...');
        const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const imageBuffer = Buffer.from(response.data, 'binary');

        console.log('🤖 Sending alive message with image...');
        await sock.sendMessage(sender, {
            image: imageBuffer,
            caption: aliveText
        });
        console.log('🤖 Alive message sent successfully with image!');
    } catch (err) {
        console.log('🤖 Image download failed, sending text alive message:', err.message);
        try {
            await sock.sendMessage(sender, { 
                text: aliveText
            });
            console.log('🤖 Text alive message sent successfully!');
        } catch (textErr) {
            console.error('🤖 Failed to send text alive message:', textErr.message);
            await sock.sendMessage(sender, { 
                text: '🤖 Alive check is temporarily unavailable. Please try again later.' 
            });
        }
    }
};