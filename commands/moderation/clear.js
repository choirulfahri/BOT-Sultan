const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Menghapus jumlah chat tertentu secara massal.')
        .addIntegerOption(option => 
            option.setName('jumlah')
                .setDescription('Jumlah pesan yang ingin dihapus (1-100)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const jumlah = interaction.options.getInteger('jumlah');

        if (jumlah < 1 || jumlah > 100) {
            return interaction.reply({ content: 'Jumlah pesan harus antara 1 dan 100.', ephemeral: true });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(jumlah, true);
            await interaction.reply({ content: `✅ Berhasil menghapus ${deleted.size} pesan.`, ephemeral: true });
            
            // Hapus pesan info di atas setelah 3 detik
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Gagal menghapus pesan (mungkin usianya lebih dari 14 hari).', ephemeral: true });
        }
    },
};
