
const moment = require('moment');

exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    const start = Date.now();
    
    await sock.sendMessage(sender, { text: '🏓 Pinging...' });
    
    const end = Date.now();
    const ping = end - start;
    
    await sock.sendMessage(sender, { 
        text: `🏓 Pong!\n\n⚡ Response time: ${ping}ms\n🕒 Server time: ${moment().format('HH:mm:ss')}\n\n💀 Powered by DARK CRIME` 
    });
};
