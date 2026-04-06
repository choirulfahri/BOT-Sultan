const { SlashCommandBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Atur mode loop lagu')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Mode loop yang diinginkan')
                .setRequired(true)
                .addChoices(
                    { name: '🚫 Off - matiin loop', value: 'off' },
                    { name: '🔂 Track - ulangin 1 lagu', value: 'track' },
                    { name: '🔁 Queue - ulangin semua antrian', value: 'queue' },
                )),
    async execute(interaction) {
        const mode = interaction.options.getString('mode');
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'ga ada lagu yang lagi diputar bro', ephemeral: true });
        }

        const modeMap = {
            'off':   { value: QueueRepeatMode.OFF,   label: '🚫 Loop dimatiin' },
            'track': { value: QueueRepeatMode.TRACK, label: '🔂 Loop 1 lagu aktif' },
            'queue': { value: QueueRepeatMode.QUEUE, label: '🔁 Loop semua antrian aktif' },
        };

        queue.setRepeatMode(modeMap[mode].value);
        await interaction.reply({ content: modeMap[mode].label });
    },
};
