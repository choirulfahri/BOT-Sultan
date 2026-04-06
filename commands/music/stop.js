const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopin')
        .setDescription('sip gue cabut'),
    async execute(interaction) {
        // useQueue mengambil music queue di server (guild) tersebut
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ada yang salah tapi apa ye ??', ephemeral: true });
        }

        // Hentikan lagu dan kosongkan antrian, tapi bot TETAP di channel
        queue.tracks.clear();   // hapus semua antrian lagu
        queue.node.stop();      // hentikan lagu yang sedang diputar

        await interaction.reply({ content: 'ok bang lagunya distop, gue masih di sini nunggu lagu selanjutnya 🎵' });
    },
};
