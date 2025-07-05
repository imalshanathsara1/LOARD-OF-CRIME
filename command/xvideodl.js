
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.execute = async (sock, msg, query) => {
    const sender = msg.key.remoteJid;

    if (!query) {
        await sock.sendMessage(sender, {
            text: '🔞 Please provide a search term.\n\nExample: `.xvideodl stepmom`\n\n💀 Powered by DARK CRIME'
        });
        return;
    }

    // Filter keywords - only process if keywords are relevant
    const filteredQuery = query.toLowerCase().trim();
    
    // Skip very short or inappropriate keywords
    if (filteredQuery.length < 3) {
        await sock.sendMessage(sender, {
            text: '❌ Please provide more specific keywords (at least 3 characters).\n\nExample: `.xvideodl romantic scene`\n\n💀 Powered by DARK CRIME'
        });
        return;
    }

    await sock.sendMessage(sender, { 
        text: `🔍 Searching Xhamster for "${query}"...\n\n💀 Powered by DARK CRIME` 
    });

    try {
        // Search Xhamster with better search parameters
        const searchUrl = `https://xhamster.com/search/${encodeURIComponent(query)}`;
        
        const searchResponse = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://xhamster.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin'
            },
            timeout: 30000
        });

        const searchContent = searchResponse.data;
        
        // Look for Xhamster video links with improved regex
        const videoMatches = searchContent.match(/href="(\/videos\/[^"]+)"/g);
        
        if (!videoMatches || videoMatches.length === 0) {
            await sock.sendMessage(sender, {
                text: `❌ **No Videos Found**\n\n🔍 **Search:** "${query}"\n🌐 **Source:** Xhamster\n\n💡 **Try These Keywords:**\n• stepmom\n• milf\n• amateur\n• teen\n• mature\n• romantic\n• couple\n\n🔄 **Tips:**\n• Use English keywords\n• Be more specific\n• Try different combinations\n\n💀 Powered by DARK CRIME`
            });
            return;
        }

        // Get the first valid video link
        const videoPath = videoMatches[0].match(/href="(\/videos\/[^"]+)"/)[1];
        const videoUrl = `https://xhamster.com${videoPath}`;
        
        await sock.sendMessage(sender, { 
            text: `📱 **Video Found!**\n\n🔗 Processing download from Xhamster...\n\n💀 Powered by DARK CRIME` 
        });

        // Get video page content
        const pageResponse = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://xhamster.com/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 30000
        });

        const pageContent = pageResponse.data;
        
        // Extract video title with better regex
        let title = 'Xhamster Video';
        const titlePatterns = [
            /<title>([^<]+)<\/title>/i,
            /"title":\s*"([^"]+)"/,
            /<h1[^>]*>([^<]+)<\/h1>/i
        ];

        for (const pattern of titlePatterns) {
            const titleMatch = pageContent.match(pattern);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1]
                    .replace(' - xHamster', '')
                    .replace(' - Free Porn Video', '')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .trim();
                break;
            }
        }
        
        // Extract video URL patterns for Xhamster with improved patterns
        let downloadUrl = null;
        
        const urlPatterns = [
            /"sources":\s*\[\s*{\s*"src":\s*"([^"]+\.mp4[^"]*)"/i,
            /"file":\s*"([^"]*\.mp4[^"]*)"/i,
            /"url":\s*"([^"]*\.mp4[^"]*)"/i,
            /sources:\s*\[\s*{\s*src:\s*['"]([^'"]*\.mp4[^'"]*)['"]/ ,
            /video_url['"]*:\s*['"]([^'"]*\.mp4[^'"]*)['"]/ ,
            /mp4['"]*:\s*['"]([^'"]*\.mp4[^'"]*)['"]/,
            /"720":\s*"([^"]*\.mp4[^"]*)"/i,
            /"480":\s*"([^"]*\.mp4[^"]*)"/i,
            /"360":\s*"([^"]*\.mp4[^"]*)"/i,
            /videoUrl['"]*:\s*['"]([^'"]*\.mp4[^'"]*)['"]/ ,
            /src['"]*:\s*['"]([^'"]*\.mp4[^'"]*)['"]/
        ];

        for (const pattern of urlPatterns) {
            const match = pageContent.match(pattern);
            if (match && match[1]) {
                downloadUrl = match[1]
                    .replace(/\\u002F/g, '/')
                    .replace(/\\/g, '')
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'");
                
                // Clean up the URL
                if (downloadUrl.startsWith('//')) {
                    downloadUrl = 'https:' + downloadUrl;
                } else if (downloadUrl.startsWith('/')) {
                    downloadUrl = 'https://xhamster.com' + downloadUrl;
                } else if (!downloadUrl.startsWith('http')) {
                    continue; // Skip invalid URLs
                }
                
                // Validate URL
                if (downloadUrl.includes('.mp4') && downloadUrl.includes('http')) {
                    break;
                }
                downloadUrl = null;
            }
        }

        if (!downloadUrl) {
            await sock.sendMessage(sender, {
                text: `❌ **Cannot Extract Video URL**\n\n📝 **Title:** ${title}\n🔍 **Search:** "${query}"\n🔗 **Page:** ${videoUrl}\n\n⚠️ **Possible Reasons:**\n• Video format not supported\n• Premium content detected\n• Region restrictions\n• Site protection enabled\n\n💡 **Suggestions:**\n• Try different keywords\n• Use more common terms\n• Search again later\n\n🌐 **Alternative:** Visit the link manually:\n${videoUrl}\n\n💀 Powered by DARK CRIME`
            });
            return;
        }

        await sock.sendMessage(sender, { 
            text: `📥 **Downloading Video**\n\n📝 **Title:** ${title.substring(0, 50)}...\n🔗 **URL:** ${downloadUrl.substring(0, 50)}...\n\n⏳ Please wait...\n\n💀 Powered by DARK CRIME` 
        });

        // Download video with improved error handling
        const videoResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://xhamster.com/',
                'Accept': '*/*',
                'Accept-Encoding': 'identity'
            },
            timeout: 120000, // 2 minutes
            maxContentLength: 100 * 1024 * 1024, // 100MB limit
            maxBodyLength: 100 * 1024 * 1024
        });

        const videoBuffer = Buffer.from(videoResponse.data);
        
        // Validate file size
        if (videoBuffer.length < 1000) {
            throw new Error('Downloaded file too small - might be an error page');
        }

        const filePath = path.resolve(__dirname, `../temp_${Date.now()}.mp4`);
        
        // Save temporarily for validation
        fs.writeFileSync(filePath, videoBuffer);

        // Send video with detailed caption
        await sock.sendMessage(sender, {
            video: videoBuffer,
            caption: `🔞 **${title}**\n\n📱 **Downloaded from:** Xhamster\n🔍 **Search Term:** "${query}"\n💾 **File Size:** ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB\n🔗 **Source:** ${videoUrl}\n\n⚠️ **Content Warning:** Adult Content\n🔞 **Age Restriction:** 18+ Only\n\n💀 Powered by DARK CRIME`,
            fileName: `${title.substring(0, 50).replace(/[^\w\s-]/g, '')}.mp4`
        });

        // Clean up
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.log(`✅ Xhamster video sent: ${title}`);

    } catch (err) {
        console.error('🔞 Xhamster search/download error:', err);
        
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            await sock.sendMessage(sender, {
                text: `⏰ **Search/Download Timeout**\n\n🔍 **Search:** "${query}"\n\n🔄 **What to do:**\n• Try again in a few minutes\n• Use shorter, simpler keywords\n• Check your internet connection\n\n💀 Powered by DARK CRIME`
            });
        } else if (err.response && err.response.status === 403) {
            await sock.sendMessage(sender, {
                text: `🔒 **Access Denied**\n\n🔍 **Search:** "${query}"\n\n⚠️ **Reason:** Content might be:\n• Region restricted\n• Premium only\n• Age verification required\n\n💡 **Try:** Different keywords or search terms\n\n💀 Powered by DARK CRIME`
            });
        } else if (err.response && err.response.status === 404) {
            await sock.sendMessage(sender, {
                text: `❌ **No Results Found**\n\n🔍 **Search:** "${query}"\n\n💡 **Try These Popular Keywords:**\n• stepmom\n• milf\n• amateur\n• couple\n• teen\n• mature\n• romantic\n• massage\n\n🌐 **Tips:**\n• Use English keywords\n• Be more specific\n• Try different combinations\n\n💀 Powered by DARK CRIME`
            });
        } else {
            await sock.sendMessage(sender, {
                text: `⚠️ **Download Error**\n\n🔍 **Search:** "${query}"\n🐛 **Error:** ${err.message || 'Unknown error'}\n\n🔄 **Solutions:**\n• Try different keywords\n• Search again later\n• Use simpler terms\n• Check spelling\n\n💡 **Popular Terms:**\n• stepmom, milf, amateur\n• couple, romantic, massage\n• teen, mature, blonde\n\n💀 Powered by DARK CRIME`
            });
        }
    }
};
