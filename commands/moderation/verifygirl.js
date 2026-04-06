const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verifygirl')
        .setDescription('(Admin Only) Memverifikasi member sebagai cewe dan memberikan role terkait')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Pilih member yang akan diverifikasi')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles), // Hanya yang bisa atur role yang bisa pakai ini

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const member = interaction.guild.members.cache.get(targetUser.id);

        if (!member) {
            return interaction.reply({ content: '❌ Member tidak ditemukan di server ini.', ephemeral: true });
        }

        // Cari Role Cewe
        // 1. Coba ambil dari .env kalau ada 
        let girlRoleId = process.env.ROLE_GIRL_ID;
        let girlRole;

        if (girlRoleId) {
            girlRole = interaction.guild.roles.cache.get(girlRoleId);
        }

        // 2. Jika di .env tidak ada/salah ketik, bot akan mencari otomatis berdasarkan nama "cewe", "girl", "perempuan", atau "wanita"
        if (!girlRole) {
            girlRole = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase().includes('cewe') || 
                r.name.toLowerCase().includes('girl') || 
                r.name.toLowerCase().includes('wanita') ||
                r.name.toLowerCase().includes('perempuan')
            );
        }

        // Jika sama sekali tidak ada role bernuansa perempuan di server
        if (!girlRole) {
            return interaction.reply({ 
                content: '❌ **Role tidak ditemukan!** Pastikan kamu memiliki role dengan nama "Cewe / Girl / Wanita" di server ini, atau atur `ROLE_GIRL_ID` di file .env.', 
                ephemeral: true 
            });
        }

        // Cek apakah bot berada di bawah hierarchy role tersebut sehingga bisa memberikannya
        if (interaction.guild.members.me.roles.highest.position <= girlRole.position) {
            return interaction.reply({ 
                content: `❌ Gagal! Role bot (${interaction.guild.members.me.roles.highest.name}) berada **di bawah** role ${girlRole.name}.\nSilakan tarik role bot ke posisi lebih atas pada menu Server Settings -> Roles!`, 
                ephemeral: true 
            });
        }

        // Cek apakah member sudah punya role tersebut
        if (member.roles.cache.has(girlRole.id)) {
            return interaction.reply({ content: `✅ **${targetUser.username}** sudah memiliki role <@&${girlRole.id}>. Tidak perlu diverifikasi lagi.`, ephemeral: true });
        }

        // Jalankan pemberian role
        try {
            await member.roles.add(girlRole);
            
            // Buat pengumuman berhiaskan Embed
            const embed = new EmbedBuilder()
                .setColor(0xFF69B4) // Pink color
                .setTitle('🎀 Verifikasi Cewe Berhasil 🎀')
                .setDescription(`Selamat datang **${targetUser.username}**!\nKamu telah diverifikasi secara resmi sebagai anggota Perempuan di server ini.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 Member', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🛡️ Disahkan Oleh', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setFooter({ text: 'Official Voice Verification System' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in verifygirl:', error);
            await interaction.reply({ content: '❌ Terjadi kesalahan tak terduga saat mencoba memberikan role.', ephemeral: true });
        }
    },
};
