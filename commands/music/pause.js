const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause lagu yang sedang diputar'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }
        if (queue.node.isPaused()) {
            return interaction.reply({ content: 'lagunya udah di-pause bro', ephemeral: true });
        }
        queue.node.pause();
        await interaction.reply({ content: '⏸️ lagu di-pause, ketik `/resume` buat lanjutin' });
    },
};
