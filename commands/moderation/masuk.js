const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const voiceStateUpdateEvent = require('../../events/voiceStateUpdate.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('masuk')
        .setDescription('Masuk ke Temp Voice Channel milik teman yang sedang dikunci password')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih pemilik room (temanmu)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('password')
                .setDescription('Masukkan kata sandi ruangan tersebut')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const inputPassword = interaction.options.getString('password');

        // Ambil data private channels
        const privateChannels = voiceStateUpdateEvent.getPrivateChannels();
        let targetChannelId = null;
        let roomData = null;

        // Cari apakah targetUser memiliki channel
        for (const [channelId, data] of privateChannels.entries()) {
            if (data.ownerId === targetUser.id) {
                targetChannelId = channelId;
                roomData = data;
                break;
            }
        }

        if (!targetChannelId || !roomData) {
            return interaction.reply({ content: `❌ **${targetUser.username}** tidak sedang memiliki room Temp Voice.`, ephemeral: true });
        }

        // Cek apakah channel tersebut dikunci/menggunakan password
        if (!roomData.password) {
            return interaction.reply({ content: `🔓 Room **${targetUser.username}** tidak menggunakan password, kamu bisa langsung masuk!`, ephemeral: true });
        }

        // Cek kecocokan password
        if (roomData.password !== inputPassword) {
            return interaction.reply({ content: `❌ **Password salah!** Akses ditolak.`, ephemeral: true });
        }

        // Jika password benar, berikan izin ke channel tersebut
        const guildChannel = interaction.guild.channels.cache.get(targetChannelId);
        if (!guildChannel) {
            return interaction.reply({ content: `❌ Terjadi kesalahan: Channel tidak ditemukan di server.`, ephemeral: true });
        }

        try {
            await guildChannel.permissionOverwrites.create(interaction.user.id, {
                Connect: true,
                ViewChannel: true
            });
            await interaction.reply({ content: `✅ **Akses Diberikan!**\n\nKamu sekarang sudah memiliki izin masuk. Silakan langsung klik voice channel **${guildChannel.name}** untuk bergabung!`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ Gagal memberikan izin. Pastikan bot memiliki hak administrator.`, ephemeral: true });
        }
    },
};
