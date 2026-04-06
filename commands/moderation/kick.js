const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Mengeluarkan member dari server.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Member yang ingin di-kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('alasan')
                .setDescription('Alasan kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const targetMember = interaction.options.getMember('target');
        const alasan = interaction.options.getString('alasan') ?? 'Tidak ada alasan yang diberikan';

        if (!targetMember) {
            return interaction.reply({ content: 'User tersebut tidak ditemukan di server ini.', ephemeral: true });
        }

        if (!targetMember.kickable) {
            return interaction.reply({ content: 'Saya tidak bisa me-kick user tersebut karena pangkat mereka lebih tinggi dariku.', ephemeral: true });
        }

        try {
            await targetMember.kick(alasan);
            await interaction.reply({ content: `✅ Berhasil mengeluarkan **${targetMember.user.tag}** dari server. Alasan: *${alasan}*` });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Gagal mengeluarkan member tersebut.', ephemeral: true });
        }
    },
};
