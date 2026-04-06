const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Atur volume musik (1-100)')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Level volume antara 1 sampai 100')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const level = interaction.options.getInteger('level');
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }
        queue.node.setVolume(level);
        const emoji = level > 66 ? '🔊' : level > 33 ? '🔉' : '🔈';
        await interaction.reply({ content: `${emoji} volume diset ke **${level}%**` });
    },
};
