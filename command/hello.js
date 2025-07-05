
exports.execute = async (sock, msg) => {
    const sender = msg.key.remoteJid;
    await sock.sendMessage(sender, { 
        text: '👋 Hello! I am your WhatsApp Bot.\n\nType .menu to see all available commands!\n\n💀 Powered by DARK CRIME' 
    });
};
