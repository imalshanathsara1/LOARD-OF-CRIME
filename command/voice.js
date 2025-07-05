
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '🎙️ Please provide a song name.\n\nExample: `.voice Despacito`'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Searching for "${query}"...` });

    try {
        const result = await yts(query);
        const video = result.videos[0];

        if (!video) {
            await sock.sendMessage(sender, { text: '❌ Song not found.' });
            return;
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(video.url)) {
            await sock.sendMessage(sender, { text: '❌ Invalid YouTube URL.' });
            return;
        }

        await sock.sendMessage(sender, { 
            text: `🎙️ Creating voice note: ${video.title}` 
        });

        const stream = ytdl(video.url, { 
            filter: 'audioonly',
            quality: 'highestaudio',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        });
        
        const filePath = path.resolve(__dirname, `../temp_${Date.now()}.mp3`);
        const writeStream = fs.createWriteStream(filePath);

        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                const audio = fs.readFileSync(filePath);
                await sock.sendMessage(sender, {
                    audio,
                    mimetype: 'audio/mp4',
                    ptt: true
                });
                fs.unlinkSync(filePath);
                console.log(`✅ Voice note sent: ${video.title}`);
            } catch (readErr) {
                console.error('Error reading audio file:', readErr);
                await sock.sendMessage(sender, { text: '⚠️ Error processing voice note.' });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });

        writeStream.on('error', async (writeErr) => {
            console.error('Write stream error:', writeErr);
            await sock.sendMessage(sender, { text: '⚠️ Error creating voice note.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        stream.on('error', async (streamErr) => {
            console.error('Download stream error:', streamErr);
            await sock.sendMessage(sender, { text: '⚠️ Error downloading audio from YouTube.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.error('🎙️ Voice error:', err);
        await sock.sendMessage(sender, { text: '⚠️ Error creating voice note. Please try again later.' });
    }
};
