module.exports = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[BOT] [${timestamp}]`,...args);
};
