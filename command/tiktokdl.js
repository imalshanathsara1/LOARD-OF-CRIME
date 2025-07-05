
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '📱 Please provide a TikTok URL.\n\nExample: `.tiktokdl https://www.tiktok.com/@username/video/1234567890`\n\n💀 Powered by DARK CRIME'
        });
        return;
    }

    // Basic URL validation
    if (!query.includes('tiktok.com') && !query.includes('vm.tiktok.com')) {
        await sock.sendMessage(sender, {
            text: '❌ Please provide a valid TikTok URL.\n\n💀 Powered by DARK CRIME'
        });
        return;
    }

    await sock.sendMessage(sender, { text: `🔍 Processing TikTok video...\n\n💀 Powered by DARK CRIME` });

    try {
        // Clean the URL (remove tracking parameters)
        let cleanUrl = query.split('?')[0];
        if (cleanUrl.includes('vm.tiktok.com')) {
            // Handle short URLs by following redirects
            const response = await axios.get(cleanUrl, {
                maxRedirects: 5,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            cleanUrl = response.request.res.responseUrl || cleanUrl;
        }

        // Extract video ID from URL
        const videoIdMatch = cleanUrl.match(/\/video\/(\d+)/);
        if (!videoIdMatch) {
            throw new Error('Invalid TikTok URL format');
        }

        await sock.sendMessage(sender, { 
            text: `📥 Downloading TikTok video...\n\n💀 Powered by DARK CRIME` 
        });

        // Use TikTok API alternatives
        const apiUrls = [
            `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(cleanUrl)}`,
            `https://tiktok-video-no-watermark2.p.rapidapi.com/`,
            `https://tikwm.com/api/`
        ];

        let videoData = null;
        let downloadUrl = null;
        let videoTitle = 'TikTok Video';
        let author = 'Unknown';

        // Try different APIs
        for (const apiUrl of apiUrls) {
            try {
                let response;
                
                if (apiUrl.includes('tiklydown')) {
                    response = await axios.get(apiUrl, {
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (response.data && response.data.video && response.data.video.noWatermark) {
                        downloadUrl = response.data.video.noWatermark;
                        videoTitle = response.data.title || 'TikTok Video';
                        author = response.data.author?.name || 'Unknown';
                        break;
                    }
                } else if (apiUrl.includes('tikwm')) {
                    const tikwmUrl = `${apiUrl}?url=${encodeURIComponent(cleanUrl)}&hd=1`;
                    response = await axios.get(tikwmUrl, {
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (response.data && response.data.data && response.data.data.hdplay) {
                        downloadUrl = response.data.data.hdplay || response.data.data.play;
                        videoTitle = response.data.data.title || 'TikTok Video';
                        author = response.data.data.author?.nickname || 'Unknown';
                        break;
                    }
                }
                
            } catch (apiError) {
                console.log(`API ${apiUrl} failed:`, apiError.message);
                continue;
            }
        }

        if (!downloadUrl) {
            // Fallback: Try to extract from TikTok page directly
            try {
                const pageResponse = await axios.get(cleanUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 15000
                });

                const pageContent = pageResponse.data;
                
                // Try to extract video URL from page content
                const videoUrlPatterns = [
                    /"playAddr":"([^"]+)"/,
                    /"downloadAddr":"([^"]+)"/,
                    /playAddr":"([^"]+)"/,
                    /"src":"([^"]*\.mp4[^"]*)"/
                ];

                for (const pattern of videoUrlPatterns) {
                    const match = pageContent.match(pattern);
                    if (match && match[1]) {
                        downloadUrl = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
                        break;
                    }
                }

                // Extract title and author from page
                const titleMatch = pageContent.match(/<title[^>]*>([^<]+)</);
                if (titleMatch) {
                    videoTitle = titleMatch[1].replace(' | TikTok', '').trim();
                }
            } catch (pageError) {
                console.log('Page extraction failed:', pageError.message);
            }
        }

        if (!downloadUrl) {
            await sock.sendMessage(sender, {
                text: `❌ **Unable to Download TikTok Video**\n\n🔗 **URL:** ${cleanUrl}\n\n⚠️ **Possible Reasons:**\n• Video is private or restricted\n• Invalid URL format\n• TikTok's anti-bot protection\n• Video was deleted\n\n💡 **Try:**\n• Make sure the video is public\n• Copy the URL directly from TikTok app\n• Try a different video\n\n💀 Powered by DARK CRIME`
            });
            return;
        }

        // Download the video
        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024, // 50MB limit
            maxBodyLength: 50 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.tiktok.com/'
            }
        });

        const videoBuffer = Buffer.from(videoResponse.data);
        const filePath = path.resolve(__dirname, `../temp_tiktok_${Date.now()}.mp4`);
        
        // Save temporarily
        fs.writeFileSync(filePath, videoBuffer);

        // Send the video
        await sock.sendMessage(sender, {
            video: videoBuffer,
            caption: `📱 **${videoTitle}**\n\n👤 **Author:** @${author}\n🔗 **Source:** TikTok\n📥 **URL:** ${cleanUrl}\n\n💀 Powered by DARK CRIME`,
            fileName: `${videoTitle.substring(0, 50)}.mp4`
        });

        // Clean up temporary file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.log(`✅ TikTok video sent: ${videoTitle}`);

    } catch (err) {
        console.error('📱 TikTok download error:', err);
        
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            await sock.sendMessage(sender, {
                text: '⏰ **Download Timeout**\n\nThe TikTok video took too long to download. Please try again.\n\n💀 Powered by DARK CRIME'
            });
        } else if (err.response && err.response.status === 403) {
            await sock.sendMessage(sender, {
                text: '🔒 **Access Denied**\n\nThe TikTok video might be private or region-restricted.\n\n💀 Powered by DARK CRIME'
            });
        } else if (err.response && err.response.status === 404) {
            await sock.sendMessage(sender, {
                text: '❌ **Video Not Found**\n\nThe TikTok video might have been deleted or the URL is incorrect.\n\n💀 Powered by DARK CRIME'
            });
        } else {
            await sock.sendMessage(sender, {
                text: `⚠️ **Download Failed**\n\nError processing TikTok video. Please try:\n\n• Check if the URL is correct\n• Make sure the video is public\n• Try again in a few minutes\n\n💀 Powered by DARK CRIME`
            });
        }
    }
};
