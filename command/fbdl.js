

const axios = require('axios');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '📱 Please provide a Facebook video URL.\n\nExample: `.fbdl https://www.facebook.com/video_url`'
        });
        return;
    }

    // Basic URL validation
    if (!query.includes('facebook.com') && !query.includes('fb.watch')) {
        await sock.sendMessage(sender, {
            text: '❌ Please provide a valid Facebook video URL.'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Processing Facebook video...` });

    try {
        // Using Facebook video downloader API
        const apiUrl = `https://api.facebookdownloader.com/api/video?url=${encodeURIComponent(query)}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        if (response.data && response.data.success && response.data.data) {
            const videoData = response.data.data;
            
            await sock.sendMessage(sender, {
                text: `📱 **Facebook Video Found!**\n\n📝 **Title:** ${videoData.title || 'No title'}\n⏱️ **Duration:** ${videoData.duration || 'Unknown'}\n\n🔗 **Download Links:**\n• HD: ${videoData.hd_url || 'Not available'}\n• SD: ${videoData.sd_url || 'Not available'}\n\n💡 **Note:** Click on the links above to download the video.`
            });

            console.log(`✅ Facebook video info sent for: ${query}`);
        } else {
            throw new Error('No video data found');
        }

    } catch (err) {
        console.error('📱 Facebook download error:', err);
        
        // Fallback response with helpful information
        await sock.sendMessage(sender, {
            text: `📱 **Facebook Video Downloader**\n\n🔗 **URL:** ${query}\n\n⚠️ **Status:** Could not process this video. This might be due to:\n\n• Video is private or restricted\n• Invalid URL format\n• Facebook's privacy settings\n• Video was deleted\n\n💡 **Alternative Methods:**\n• Try fbdown.net\n• Use getfvid.com\n• Check if video is public\n• Share directly from Facebook app`
        });
    }
};
