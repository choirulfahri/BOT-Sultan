const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gabung')
        .setDescription('Panggil bot masuk ke voice channel kamu tanpa putar musik'),
    async execute(interaction) {
        const userChannel = interaction.member.voice.channel;

        if (!userChannel) {
            return interaction.reply({ content: 'masuk dulu ke voice channel bro, baru panggil gue', ephemeral: true });
        }

        // Cek apakah bot sudah ada di channel yang sama
        const botVoiceState = interaction.guild.members.me.voice;
        if (botVoiceState.channel && botVoiceState.channel.id === userChannel.id) {
            return interaction.reply({ content: `whatsapp ${userChannel.name} 😎`, ephemeral: true });
        }

        try {
            joinVoiceChannel({
                channelId: userChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false,
            });

            await interaction.reply({ content: `sip gue gabung ke **${userChannel.name}** dulu ye 🎙️` });
        } catch (error) {
            console.error('Gagal join voice channel:', error);
            await interaction.reply({ content: 'aduh gagal gabung, coba lagi bang', ephemeral: true });
        }
    },
};
