const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Lihat lagu yang sedang diputar sekarang'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar();

        const embed = new EmbedBuilder()
            .setColor(0x1DB954) // Hijau ala Spotify
            .setTitle('🎵 Lagi Diputar Sekarang')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '🎤 Artis', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Durasi', value: track.duration, inline: true },
                { name: '🔁 Loop', value: queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue', inline: true }
            )
            .setThumbnail(track.thumbnail)
            .addFields({ name: '📊 Progress', value: progress || 'Loading...' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
