
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '🎬 Please provide a video name.\n\nExample: `.video Despacito`'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Searching for "${query}"...` });

    try {
        const result = await yts(query);
        const video = result.videos[0];

        if (!video) {
            await sock.sendMessage(sender, { text: '❌ Video not found.' });
            return;
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(video.url)) {
            await sock.sendMessage(sender, { text: '❌ Invalid YouTube URL.' });
            return;
        }

        // Check video duration (limit to 10 minutes for better performance)
        const info = await ytdl.getInfo(video.url);
        const duration = parseInt(info.videoDetails.lengthSeconds);
        if (duration > 600) {
            await sock.sendMessage(sender, { 
                text: '❌ Video is too long (max 10 minutes). Please try a shorter video.' 
            });
            return;
        }

        await sock.sendMessage(sender, { 
            text: `📥 Downloading: ${video.title}\n⏱️ Duration: ${video.timestamp}\n📊 Quality: Low (for faster download)` 
        });

        const stream = ytdl(video.url, { 
            filter: 'videoandaudio', 
            quality: 'lowest',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        });
        
        const filePath = path.resolve(__dirname, `../temp_${Date.now()}.mp4`);
        const writeStream = fs.createWriteStream(filePath);

        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                const videoBuffer = fs.readFileSync(filePath);
                
                // Send thumbnail first
                try {
                    console.log('📸 Downloading video thumbnail...');
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
                        caption: `🎬 **${video.title}**\n\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views}\n🔗 ${video.url}\n\n📥 Video file coming next...`
                    });
                    console.log('📸 Video thumbnail sent successfully!');
                } catch (thumbErr) {
                    console.log('📸 Thumbnail failed, continuing with video:', thumbErr.message);
                }
                
                // Send video file
                await sock.sendMessage(sender, {
                    video: videoBuffer,
                    caption: `🎬 ${video.title}\n\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views}`,
                    fileName: `${video.title}.mp4`
                });
                
                fs.unlinkSync(filePath);
                console.log(`✅ Video sent: ${video.title}`);
            } catch (readErr) {
                console.error('Error reading video file:', readErr);
                await sock.sendMessage(sender, { text: '⚠️ Error processing video file.' });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });

        writeStream.on('error', async (writeErr) => {
            console.error('Write stream error:', writeErr);
            await sock.sendMessage(sender, { text: '⚠️ Error writing video file.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

        stream.on('error', async (streamErr) => {
            console.error('Download stream error:', streamErr);
            await sock.sendMessage(sender, { text: '⚠️ Error downloading from YouTube.' });
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.error('🎬 Video error:', err);
        await sock.sendMessage(sender, { text: '⚠️ Error downloading video. Please try again later.' });
    }
};
