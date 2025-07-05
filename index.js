const { default: makeWASocket, useMultiFileAuthState, DisconnectReason} = require('@whiskeysockets/baileys');
const { Boom} = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const pino = require('pino');

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.log('🔄 Bot will continue running...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Bot will continue running...');
});

// Ensure auth directory exists
const authDir = path.join(__dirname, 'auth');
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('📁 Created auth directory');
}

// Increase EventEmitter limit to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 50;

let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
let isRestarting = false;
let sock = null;

async function startBot() {
    if (isRestarting) {
        console.log('🔄 Already restarting, skipping...');
        return;
    }

    try {
        console.log('🚀 Starting WhatsApp Bot...');
        isRestarting = true;

        const { state, saveCreds} = await useMultiFileAuthState('./auth');

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Dark Crime Bot', 'Chrome', '120.0.6099.109'],
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: true,
            syncFullHistory: false,
            fireInitQueries: false,
            generateHighQualityLinkPreview: true,
            logger: pino({ level: 'silent' }),
            retryRequestDelayMs: 5000,
            maxMsgRetryCount: 2,
            qrTimeout: 60000
        });

        sock.ev.on('creds.update', saveCreds);

        // Handle group participant updates (join/leave)
        sock.ev.on('group-participants.update', async (update) => {
            try {
                console.log('👥 Group participant update:', JSON.stringify(update, null, 2));
                const welcomePath = path.join(__dirname, 'command', 'welcome.js');
                if (fs.existsSync(welcomePath)) {
                    delete require.cache[require.resolve(welcomePath)];
                    const welcome = require(welcomePath);
                    if (welcome.handleGroupUpdate) {
                        await welcome.handleGroupUpdate(sock, update);
                        console.log('✅ Welcome/Goodbye handler executed successfully');
                    } else {
                        console.log('❌ handleGroupUpdate function not found in welcome.js');
                    }
                } else {
                    console.log('❌ Welcome.js file not found');
                }
            } catch (welcomeError) {
                console.error('❌ Welcome/Goodbye error:', welcomeError);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages}) => {
            try {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;

                const text = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text || 
                           msg.message.imageMessage?.caption || 
                           msg.message.videoMessage?.caption || '';

                const sender = msg.key.remoteJid;

                if (text.startsWith('.')) {
                    const [cmd, ...args] = text.slice(1).split(' ');
                    const commandPath = path.join(__dirname, 'command', `${cmd}.js`);

                    console.log(`📱 Command: .${cmd} from ${sender.split('@')[0]}`);

                    // Check if command exists
                    if (fs.existsSync(commandPath)) {
                        // Check if command is owner-only
                        if (config.OWNER_ONLY_COMMANDS.includes(cmd)) {
                            console.log(`🔒 Checking owner: ${sender} === ${config.OWNER_NUMBER}`);
                            if (sender !== config.OWNER_NUMBER) {
                                console.log(`🔒 Owner check failed: ${sender} !== ${config.OWNER_NUMBER}`);
                                await sock.sendMessage(sender, { 
                                    text: '❌ This command is only available to the bot owner.' 
                                });
                                return;
                            }
                            console.log(`✅ Owner verified!`);
                        }

                        try {
                            // Clear require cache to avoid issues
                            delete require.cache[require.resolve(commandPath)];
                            const command = require(commandPath);

                            // Special handling for autoreact command
                            if (cmd === 'autoreact') {
                                await command.executeManualReact(sock, msg, args.join(' '));
                            } else {
                                await command.execute(sock, msg, args.join(' '), { 
                                    isOwner: sender === config.OWNER_NUMBER 
                                });
                            }
                            console.log(`✅ Command .${cmd} executed successfully`);
                        } catch (commandError) {
                            console.error(`❌ Error executing command .${cmd}:`, commandError);
                            try {
                                await sock.sendMessage(sender, { 
                                    text: `⚠️ An error occurred while executing .${cmd}. Please try again later.\n\n💀 Powered by DARK CRIME` 
                                });
                            } catch (sendError) {
                                console.error(`❌ Failed to send error message:`, sendError);
                            }
                        }
                    } else {
                        try {
                            await sock.sendMessage(sender, { text: `❌ Unknown command: .${cmd}\n\nType .menu to see available commands.\n\n💀 Powered by DARK CRIME`});
                        } catch (sendError) {
                            console.error(`❌ Failed to send unknown command message:`, sendError);
                        }
                    }
                } else {
                    // Auto-reply for non-command messages
                    try {
                        const autoReplyPath = path.join(__dirname, 'command', 'autoreply.js');
                        if (fs.existsSync(autoReplyPath)) {
                            delete require.cache[require.resolve(autoReplyPath)];
                            const autoReply = require(autoReplyPath);

                            // Check if this message should get an auto-reply
                            if (autoReply.shouldAutoReply && autoReply.shouldAutoReply(text, sender, config)) {
                                await autoReply.execute(sock, msg);
                            }
                        }
                    } catch (autoReplyError) {
                        console.error(`❌ Auto-reply error:`, autoReplyError);
                        // Don't send error message for auto-reply failures
                    }
                }

                // Auto-react for ALL non-command messages (independent of auto-reply)
                if (!text.startsWith('.') && text.trim() !== '') {
                    try {
                        const autoReactPath = path.join(__dirname, 'command', 'autoreact.js');
                        if (fs.existsSync(autoReactPath)) {
                            delete require.cache[require.resolve(autoReactPath)];
                            const autoReact = require(autoReactPath);

                            // Check if this message should get an auto-reaction
                            if (autoReact.shouldAutoReact && autoReact.shouldAutoReact(text, sender, config)) {
                                // Add small delay to avoid rate limiting
                                setTimeout(async () => {
                                    try {
                                        await autoReact.execute(sock, msg);
                                    } catch (delayedReactError) {
                                        console.error(`❌ Delayed auto-react error:`, delayedReactError);
                                    }
                                }, 500);
                            }
                        }
                    } catch (autoReactError) {
                        console.error(`❌ Auto-react error:`, autoReactError);
                        // Don't send error message for auto-react failures
                    }
                }
            } catch (messageError) {
                console.error(`❌ Error processing message:`, messageError);
                // Continue running - don't let message errors crash the bot
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr} = update;

            // Display QR code when available
            if (qr) {
                console.log('\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
                console.log('📱 QR CODE GENERATED! SCAN NOW WITH WHATSAPP:');
                console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');

                try {
                    // Generate QR code in terminal
                    qrcode.generate(qr, { small: true });
                    console.log('\n✅ QR Code displayed above!');
                } catch (qrError) {
                    console.log('\n⚠️ QR Display Error, here is the raw QR:');
                    console.log(qr);
                }

                console.log('\n📲 INSTRUCTIONS:');
                console.log('1. Open WhatsApp on your phone');
                console.log('2. Go to Settings → Linked Devices');
                console.log('3. Tap "Link a Device"');
                console.log('4. Scan the QR code above');
                console.log('5. Wait for connection...');
                console.log('\n⏰ QR Code expires in 60 seconds!');
                console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('❌ Connection closed with status:', statusCode);

                // Handle different disconnect reasons
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('🔐 Device logged out. Generating new QR code...');
                    // Clear auth and restart immediately for quick QR generation
                    try {
                        const authPath = path.join(__dirname, 'auth');
                        if (fs.existsSync(authPath)) {
                            fs.rmSync(authPath, { recursive: true, force: true });
                            console.log('🗑️ Cleared old auth files for fresh login');
                        }
                    } catch (clearError) {
                        console.log('⚠️ Could not clear auth files:', clearError.message);
                    }
                    reconnectAttempts = 0;
                     isRestarting = false;
                    console.log('🚀 Restarting for fresh QR code generation...');
                    setTimeout(() => startBot(), 1000); // Faster restart for QR
                } else if (statusCode === 401) {
                    console.log('🔑 Authentication expired (401). Generating new QR...');
                    // Clear auth for 401 errors and restart quickly
                    try {
                        const authPath = path.join(__dirname, 'auth');
                        if (fs.existsSync(authPath)) {
                            fs.rmSync(authPath, { recursive: true, force: true });
                            console.log('🗑️ Cleared all auth files for fresh start');
                        }
                    } catch (clearError) {
                        console.log('⚠️ Could not clear auth:', clearError.message);
                    }
                    reconnectAttempts = 0;
                     isRestarting = false;
                    console.log('🔄 Restarting for new QR code...');
                    setTimeout(() => startBot(), 1000); // Quick restart
                } else if (statusCode === DisconnectReason.badSession || statusCode === 405) {
                    console.log('🔄 Bad session or connection error (405). Clearing and generating QR...');
                    try {
                        const authPath = path.join(__dirname, 'auth');
                        if (fs.existsSync(authPath)) {
                            fs.rmSync(authPath, { recursive: true, force: true });
                            console.log('🗑️ Cleared auth directory for fresh login');
                        }
                    } catch (clearError) {
                        console.log('⚠️ Could not clear auth:', clearError.message);
                    }
                    reconnectAttempts = 0;
                     isRestarting = false;
                    console.log('📱 Generating fresh QR code...');
                    setTimeout(() => startBot(), 1000);
                } else if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = Math.min(5000 * reconnectAttempts, 30000); // Exponential backoff up to 30s
                    console.log(`🔄 Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                    setTimeout(() => startBot(), delay);
                } else {
                    console.log('❌ Max reconnect attempts reached. Clearing auth and restarting...');
                    try {
                        const authPath = path.join(__dirname, 'auth');
                        if (fs.existsSync(authPath)) {
                            fs.rmSync(authPath, { recursive: true, force: true });
                            console.log('🗑️ Cleared auth files for fresh start');
                        }
                    } catch (clearError) {
                        console.log('⚠️ Could not clear auth files:', clearError.message);
                    }
                    reconnectAttempts = 0;
                     isRestarting = false;
                    setTimeout(() => startBot(), 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp successfully!');
                console.log('🤖 Bot is now ready to receive commands!');
                console.log('📱 Bot Number:', sock.user?.id || 'Unknown');
                reconnectAttempts = 0; // Reset counter on successful connection
                 isRestarting = false;
            } else if (connection === 'connecting') {
                console.log('🔄 Connecting to WhatsApp...');
            }
        });

        // Handle process termination gracefully
        process.on('SIGINT', async () => {
             console.log('🛑 Received SIGINT. Shutting down gracefully...');
            isRestarting = true; 
            try {
                if (sock) {
                  await sock.logout();
                  sock.ws.close();
                  sock = null;
                }
            } catch (err) {
                console.log('Error during logout:', err.message);
            } finally {
                process.exit(0);
            }
        });

        process.on('SIGTERM', async () => {
            console.log('🛑 Received SIGTERM. Shutting down gracefully...');
            isRestarting = true;
            try {
                if (sock) {
                   await sock.logout();
                   sock.ws.close();
                   sock = null;
                }
            } catch (err) {
                console.log('Error during logout:', err.message);
            } finally {
                process.exit(0);
            }
        });

    } catch (startError) {
        console.error('❌ Error starting bot:', startError);
         isRestarting = false;
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Restarting bot... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(() => startBot(), 10000);
        } else {
            console.log('❌ Failed to start bot after maximum attempts.');
        }
    } finally {
        isRestarting = false;
    }
}

// Start the bot
startBot().catch((err) => {
    console.error('❌ Fatal error starting bot:', err);
    process.exit(1);
});

// Web server for deployment platforms (Replit, Heroku, Glitch, etc.)
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>WhatsApp Bot - Online</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        margin: 0;
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: rgba(255,255,255,0.1); 
                        padding: 30px; 
                        border-radius: 10px; 
                        backdrop-filter: blur(10px);
                    }
                    .status { color: #00ff88; font-size: 24px; margin: 20px 0; }
                    .info { margin: 10px 0; font-size: 18px; }
                    .commands { text-align: left; margin: 20px 0; }
                    .cmd { background: rgba(0,0,0,0.3); padding: 5px 10px; margin: 5px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 WhatsApp Bot</h1>
                    <div class="status">✅ Status: Online & Ready</div>
                    <div class="info">🔗 Platform: Multi-Platform Compatible</div>
                    <div class="info">📡 Server: Running on Port ${PORT}</div>
                    <div class="info">🕒 Uptime: ${process.uptime().toFixed(0)} seconds</div>

                    <h3>📋 Available Commands:</h3>
                    <div class="commands">
                        <div class="cmd">.menu - Show all commands</div>
                        <div class="cmd">.alive - Check bot status</div>
                        <div class="cmd">.ping - Test response time</div>
                        <div class="cmd">.song [name] - Download songs</div>
                        <div class="cmd">.voice [name] - Voice notes</div>
                        <div class="cmd">.lyrics [name] - Get lyrics</div>
                        <div class="cmd">.hello - Simple greeting</div>
                    </div>

                    <p>🚀 Bot is running smoothly across all platforms!</p>
                </div>
            </body>
        </html>
    `);
});

server.listen(PORT, HOST, () => {
    console.log(`🌐 HTTP server running on ${HOST}:${PORT}`);
    console.log(`🔗 Access: http://localhost:${PORT}`);
});

// Health check endpoint
server.on('request', (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            node_version: process.version
        }));
    }
});

// Keep alive function for some platforms
setInterval(() => {
    console.log(`💓 Bot heartbeat - Uptime: ${Math.floor(process.uptime())}s`);
}, 300000); // Every 5 minutes

console.log('🚀 WhatsApp Bot initialized for multi-platform deployment!');