const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '🎵 Please provide a song name.\n\nExample: `.song Shape of You`'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Searching for "${query}"...`});

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
            text: `📥 Downloading: ${video.title}\n⏱️ Duration: ${video.timestamp}` 
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
                
                // Send thumbnail first
                try {
                    console.log('📸 Downloading thumbnail...');
                    const thumbnailResponse = await axios.get(video.thumbnail, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    const thumbnailBuffer = Buffer.from(thumbnailResponse.data, 'binary');
                    
                    await sock.sendMessage(sender, {
                        image: thumbnailBuffer,
                        caption: `🎵 **${video.title}**\n\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views}\n🔗 ${video.url}\n\n📥 Audio file coming next...`
                    });
                    console.log('📸 Thumbnail sent successfully!');
                } catch (thumbErr) {
                    console.log('📸 Thumbnail failed, continuing with audio:', thumbErr.message);
                }
                
                // Send audio file
                await sock.sendMessage(sender, {
                    audio,
                    mimetype: 'audio/mp4',
                    ptt: false,
                    fileName: `${video.title}.mp3`
                });
                
                fs.unlinkSync(filePath);
                console.log(`✅ Song sent: ${video.title}`);
            } catch (readErr) {
                console.error('Error reading file:', readErr);
                await sock.sendMessage(sender, { text: '⚠️ Error processing audio file.' });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });

        writeStream.on('error', async (writeErr) => {
            console.error('Write stream error:', writeErr);
            await sock.sendMessage(sender, { text: '⚠️ Error writing audio file.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        stream.on('error', async (streamErr) => {
            console.error('Download stream error:', streamErr);
            await sock.sendMessage(sender, { text: '⚠️ Error downloading from YouTube.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.error('🎵 Song error:', err);
        await sock.sendMessage(sender, { text: '⚠️ Error downloading song. Please try again later.' });
    }
};
