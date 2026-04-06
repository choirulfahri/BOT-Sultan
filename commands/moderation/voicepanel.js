const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicepanel')
        .setDescription('Munculkan panel kontrol untuk Temp Voice')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Hanya Admin yang bisa spawn
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔊 TempVoice Interface')
            .setDescription('**Antarmuka Pengendali**\n\nAntarmuka ini digunakan untuk mengatur Voice channel sementara kamu. Klik tombol di bawah ini saat kamu sedang berada di dalam room temp voice milikmu.')
            .setFooter({ text: 'TempVoice System' })
            .setTimestamp();

        // Baris Pertama
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tv_rename')
                .setLabel('NAMA')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('tv_limit')
                .setLabel('BATAS')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('tv_lock')
                .setLabel('PRIVASI (KUNCI)')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('tv_unlock')
                .setLabel('BUKA KUNCI')
                .setEmoji('🔓')
                .setStyle(ButtonStyle.Secondary),
        );

        // Baris Kedua (bisa ditambahkan kick dll nanti)
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tv_kick')
                .setLabel('USIR')
                .setEmoji('🚫')
                .setStyle(ButtonStyle.Danger) // Red color untuk usir
        );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2]
        });
    },
};
