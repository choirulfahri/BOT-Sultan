const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error command ${interaction.commandName}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Masalah saat eksekusi command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Masalah saat eksekusi command!', ephemeral: true });
                }
            }
        } 
        
        // ===============================================
        // PENANGANAN TOMBOL (BUTTON) DARI PANEL TEMP VOICE
        // ===============================================
        else if (interaction.isButton()) {
            // Ambil daftar private channel dari memory bot
            const voiceEvent = require('./voiceStateUpdate.js');
            const privateChannels = voiceEvent.getPrivateChannels();

            // Pengecekan dasar: user harus ada di voice channel
            const memberVoiceChannel = interaction.member.voice.channel;
            if (!interaction.customId.startsWith('tv_')) return; // Bukan tombol temp voice

            if (!memberVoiceChannel) {
                return interaction.reply({ content: '❌ Kamu harus berada di dalam Temp Voice kamu sendiri untuk menggunakan kontrol ini!', ephemeral: true });
            }

            // Pengecekan kepemilikan room
            const roomData = privateChannels.get(memberVoiceChannel.id);
            if (!roomData || roomData.ownerId !== interaction.user.id) {
                return interaction.reply({ content: '❌ Kamu bukan pemilik riuangan ini!', ephemeral: true });
            }

            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

            // 1. TOMBOL GANTI NAMA
            if (interaction.customId === 'tv_rename') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_tv_rename')
                    .setTitle('Ganti Nama Room');

                const nameInput = new TextInputBuilder()
                    .setCustomId('tv_new_name')
                    .setLabel('Masukkan nama baru untuk room kamu')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(32)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.showModal(modal);
            }

            // 2. TOMBOL BATAS USER
            else if (interaction.customId === 'tv_limit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_tv_limit')
                    .setTitle('Atur Batas Member');

                const limitInput = new TextInputBuilder()
                    .setCustomId('tv_new_limit')
                    .setLabel('Masukkan angka 0 sampai 99 (0 = tak terbatas)')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(2)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                await interaction.showModal(modal);
            }

            // 3. TOMBOL LOCK (KUNCI ROOM)
            else if (interaction.customId === 'tv_lock') {
                try {
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                    await interaction.reply({ content: '🔒 Room berhasil **dikunci**! Orang lain tidak bisa masuk.', ephemeral: true });
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal mengunci room.', ephemeral: true });
                }
            }

            // 4. TOMBOL UNLOCK (BUKA KUNCI ROOM)
            else if (interaction.customId === 'tv_unlock') {
                try {
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
                    await interaction.reply({ content: '🔓 Room berhasil **dibuka**! Semua orang bisa masuk sekarang.', ephemeral: true });
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal membuka room.', ephemeral: true });
                }
            }

            // 5. TOMBOL KICK (KICK USER)
            else if (interaction.customId === 'tv_kick') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_tv_kick')
                    .setTitle('Usir Member dari Room');

                const idInput = new TextInputBuilder()
                    .setCustomId('tv_kick_id')
                    .setLabel('Ketik ID Discord member atau tag/namanya')
                    .setPlaceholder('Contoh: 123456789 atau @udin')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            }
        }

        // ===============================================
        // PENANGANAN POP-UP FORMULIR (MODAL)
        // ===============================================
        else if (interaction.isModalSubmit()) {
            const memberVoiceChannel = interaction.member.voice.channel;
            if (!memberVoiceChannel) return; // Jika mendadak keluar

            // PROSES GANTI NAMA
            if (interaction.customId === 'modal_tv_rename') {
                const newName = interaction.fields.getTextInputValue('tv_new_name');
                try {
                    await memberVoiceChannel.setName(newName);
                    await interaction.reply({ content: `✅ Nama room berhasil diubah menjadi: **${newName}**`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: '❌ Gagal mengubah nama room. Mungkin bot terkena rate-limit dari Discord (jangan terlalu cepat mengganti nama).', ephemeral: true });
                }
            }

            // PROSES BATAS USER
            else if (interaction.customId === 'modal_tv_limit') {
                let limit = parseInt(interaction.fields.getTextInputValue('tv_new_limit'));
                if (isNaN(limit) || limit < 0 || limit > 99) limit = 0;
                
                try {
                    await memberVoiceChannel.setUserLimit(limit);
                    const msg = limit === 0 ? 'dibuat tanpa batas' : `dibatasi maksimal **${limit}** orang`;
                    await interaction.reply({ content: `✅ Kapasitas room berhasil ${msg}.`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: '❌ Gagal mengubah batas user.', ephemeral: true });
                }
            }

            // PROSES KICK (SIMPLIFIED: Mengeluarkan user berdasarkan ID)
            else if (interaction.customId === 'modal_tv_kick') {
                const inputQuery = interaction.fields.getTextInputValue('tv_kick_id').replace(/[<@!>]/g, ''); // bersihkan ping/tag jika ada
                const targetMember = memberVoiceChannel.members.get(inputQuery);

                if (!targetMember) {
                    return interaction.reply({ content: '❌ Member dengan ID/Tag tersebut tidak ada di dalam room kamu saat ini.', ephemeral: true });
                }
                if (targetMember.id === interaction.user.id) {
                    return interaction.reply({ content: '❌ Kamu tidak bisa mengusir diri sendiri!', ephemeral: true });
                }

                try {
                    // Cara mengusir dari voice: set voice channel ke null
                    await targetMember.voice.disconnect('Diusir oleh pemilik room Temp Voice');
                    await interaction.reply({ content: `✅ Berhasil menendang **${targetMember.user.tag}** dari room.`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: `❌ Gagal mengusir member. (Mungkin bot tidak punya izin Move Members)`, ephemeral: true });
                }
            }
        }
    },
};
