const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        // =====================================================
        // AUTO ROLE - set ROLE_AUTO_ID di file .env
        // =====================================================
        const autoRoleId = process.env.ROLE_AUTO_ID;

        if (autoRoleId) {
            try {
                const role = member.guild.roles.cache.get(autoRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`[AutoRole] Role "${role.name}" diberikan ke ${member.user.tag}`);
                } else {
                    console.warn(`[AutoRole] Role ID ${autoRoleId} tidak ditemukan di server!`);
                }
            } catch (err) {
                console.error(`[AutoRole] Gagal memberikan role ke ${member.user.tag}:`, err.message);
            }
        }

        // =====================================================
        // WELCOME MESSAGE - set WELCOME_CHANNEL_ID di file .env
        // =====================================================
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(0x57F287) // Hijau
                    .setTitle('👋 Member Baru Bergabung!')
                    .setDescription(`Selamat datang di **${member.guild.name}**, <@${member.user.id}>! 🎉`)
                    .addFields(
                        { name: '📋 Baca Rules', value: 'Pastikan baca aturan server ya sebelum ngobrol!', inline: false },
                        { name: '👥 Total Member', value: `${member.guild.memberCount} orang`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setFooter({ text: `User ID: ${member.user.id}` })
                    .setTimestamp();

                channel.send({ embeds: [welcomeEmbed] }).catch(() => {});
            }
        }
    },
};
