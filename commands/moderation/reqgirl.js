const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolegirl')
        .setDescription('Kirim permintaan (Request) untuk mendapatkan status verifikasi Perempuan ke Admin'),

    async execute(interaction) {
        // Harus ada di channel server
        if (!interaction.guild) {
            return interaction.reply({ content: 'Command ini hanya bisa digunakan di dalam Server.', ephemeral: true });
        }

        // 1. Validasi apakah user sudah punya role atau belum
        let girlRoleId = process.env.ROLE_GIRL_ID;
        let girlRole;

        if (girlRoleId) {
            girlRole = interaction.guild.roles.cache.get(girlRoleId);
        }
        if (!girlRole) {
            girlRole = interaction.guild.roles.cache.find(r =>
                r.name.toLowerCase().includes('cewe') ||
                r.name.toLowerCase().includes('girl') ||
                r.name.toLowerCase().includes('wanita') ||
                r.name.toLowerCase().includes('perempuan')
            );
        }

        // Kalau ada role-nya dan dia ternyata sudah punya
        if (girlRole && interaction.member.roles.cache.has(girlRole.id)) {
            return interaction.reply({ content: '✅ Kamu sudah memiliki role perempuan! (Posisimu sudah diverifikasi sebelumnya).', ephemeral: true });
        }

        // 2. Kumpulkan Admin Spesifik (2 Orang)
        // GANTI TULISAN ID_ADMIN_1 DAN ID_ADMIN_2 DENGAN ID DISCORD ASLI MEREKA (Angka)
        const adminIds = ['1247115440283582513', '479890396952920076'];

        await interaction.guild.members.fetch(); // Memastikan semua member masuk ke cache terlebih dulu
        const admins = [];
        for (const id of adminIds) {
            const member = interaction.guild.members.cache.get(id);
            if (member) admins.push(member);
        }

        if (admins.length === 0) {
            return interaction.reply({ content: '❌ Sayangnya, admin yang bertugas tidak ditemukan di server ini. Permintaan tidak bisa diproses.', ephemeral: true });
        }

        // Defer reply karena proses blast DM ke banyak admin bisa memakan waktu beberapa detik
        await interaction.deferReply({ ephemeral: true });

        // 3. Buat Surat Izin (DM Envelope)
        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setTitle('🚨 Request Verifikasi Perempuan')
            .setDescription(`Seorang member telah mengajukan permintaan role **Perempuan / Girl**.\n\n**Data Pelamar:**\n👤 **User:** <@${interaction.user.id}>\n🏷️ **Username:** ${interaction.user.tag}\n🏠 **Server:** ${interaction.guild.name}\n\nSilakan tekan tombol di bawah ini (Kamu bisa memverifikasi dia terlebih dulu lewat chat/voice jika ragu).`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: 'Sistem Verifikasi Khusus Cewe Otomatis' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                // customId diformat menyimpan ID Server dan ID Pelamar
                .setCustomId(`reqgirl_accept_${interaction.guild.id}_${interaction.user.id}`)
                .setLabel('SETUJUI')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`reqgirl_reject_${interaction.guild.id}_${interaction.user.id}`)
                .setLabel('TOLAK')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        // 4. Kirim ke DM kedua Admin
        let sentCount = 0;
        for (const admin of admins) {
            try {
                // Di discord.js, pengiriman DM dilakukan langsung lewat object Member/User
                await admin.send({ embeds: [embed], components: [row] });
                sentCount++;
            } catch (err) {
                // Biasanya error terjadi karena pengaturan privasi Admin menonaktifkan DM Server
            }
        }

        // 5. Beri Laporan Final ke Pelamar
        if (sentCount === 0) {
            await interaction.editReply({ content: '❌ Terjadi kegagalan. Seluruh admin telah mematikan fitur Private Message (DM) Server mereka, sehingga bot tidak bisa mengirimkan notifikasi apapun.' });
        } else {
            await interaction.editReply({ content: `✅ Permintaan verifikasi berhasil dikirimkan secara rahasia ke kotak pesan **${sentCount}** Admin Server!\n\nSilakan tunggu konfirmasi selanjutnya yang akan dberikan bot langsung ke Private Message (DM) kamu.` });
        }
    },
};
