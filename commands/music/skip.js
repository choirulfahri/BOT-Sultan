const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip lagu yang sedang diputar'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }
        const skipped = queue.node.skip();
        await interaction.reply({ content: skipped ? `⏭️ oke dilangkahi lagunya!` : '❌ gagal skip, coba lagi' });
    },
};
