const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Lanjutkan lagu yang di-pause'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }
        if (!queue.node.isPaused()) {
            return interaction.reply({ content: 'lagunya lagi jalan bro, ga di-pause', ephemeral: true });
        }
        queue.node.resume();
        await interaction.reply({ content: '▶️ lanjut ngamen lagi!' });
    },
};
