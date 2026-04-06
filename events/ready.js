const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Bot berhasil terhubung dan siap! Login sebagai ${client.user.tag}`);
        client.user.setActivity('Head of Security', { type: 2 }); // type 2 = Listening
        console.log('[Voice] Bot siap, akan join otomatis ke channel saat music diputar pertama kali.');
    },
};
