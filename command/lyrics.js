
const lf = require('lyrics-finder');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '🎤 Please provide a song name.\n\nExample: `.lyrics Shape of You`'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Searching lyrics for "${query}"...` });

    try {
        const lyrics = await lf(query) || "Lyrics not found.";
        await sock.sendMessage(sender, {
            text: `🎤 **${query}**\n\n${lyrics}`
        });
    } catch (err) {
        console.error('🎤 Lyrics error:', err);
        await sock.sendMessage(sender, { text: '⚠️ Error fetching lyrics.' });
    }
};
