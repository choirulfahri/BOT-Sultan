const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // Hanya tangani slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Tidak ada command bernama ${interaction.commandName} yang terdaftar.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error saat menjalankan command ${interaction.commandName}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: ' Ada masalah saat mengeksekusi command!', ephemeral: true });
            } else {
                await interaction.reply({ content: ' Ada masalah saat mengeksekusi command!', ephemeral: true });
            }
        }
    },
};
