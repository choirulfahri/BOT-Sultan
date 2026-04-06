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
            // ===============================================
            // 1. PENANGANAN PERMINTAAN ROLE VERIFIKASI CEWE (DARI DM)
            // ===============================================
            if (interaction.customId.startsWith('reqgirl_accept_') || interaction.customId.startsWith('reqgirl_reject_')) {
                // Di dalam DM, interaction.guild = null. Kita harus fetch server asli dan pelamarnya.
                const parts = interaction.customId.split('_');
                const action = parts[1]; // accept atau reject
                const guildId = parts[2];
                const applicantId = parts[3];

                const guild = interaction.client.guilds.cache.get(guildId);
                if (!guild) {
                    return interaction.reply({ content: '❌ Terjadi kesalahan: Data server sudah tidak ditemukan (mungkin bot kick dari server).', ephemeral: true });
                }

                // Defer DM karena fetch lama
                await interaction.deferUpdate();

                // Dapatkan pelamar dari server
                let applicant;
                try {
                    applicant = await guild.members.fetch(applicantId);
                } catch (e) {
                    return interaction.editReply({ content: '❌ Terjadi kesalahan: Pelamar tersebut sepertinya sudah keluar dari server.', components: [] });
                }

                if (action === 'accept') {
                    // Cari Role (sama seperti algoritma semula)
                    let girlRoleId = process.env.ROLE_GIRL_ID;
                    let girlRole;
                    if (girlRoleId) girlRole = guild.roles.cache.get(girlRoleId);
                    
                    if (!girlRole) {
                        girlRole = guild.roles.cache.find(r => 
                            r.name.toLowerCase().includes('cewe') || r.name.toLowerCase().includes('girl') || r.name.toLowerCase().includes('wanita') || r.name.toLowerCase().includes('perempuan')
                        );
                    }

                    if (!girlRole) {
                        return interaction.editReply({ content: '❌ **Role tidak ditemukan!** Pastikan server memiliki role dengan nama "Cewe / Girl / Wanita". Tolong beritahu pelamar secara manual.', components: [] });
                    }

                    try {
                        await applicant.roles.add(girlRole);
                        await interaction.editReply({ content: `✅ Permintaan disetujui! Status perempuan dari **${applicant.user.tag}** telah berhasil diverifikasi.`, components: [] });
                        // DM pelamar!
                        await applicant.send({ content: `🎀 **Selamat!** Permintaan verifikasi perempuan kamu di server **${guild.name}** telah disetujui oleh <@${interaction.user.id}>.\nKamu sudah resmi mendapatkan role terkait.` }).catch(() => {});
                    } catch (e) {
                        return interaction.editReply({ content: '❌ Gagal memberikan role. Pastikan peran bot Sultan berada lebih atas dari peran Cewe tersebut!', components: [] });
                    }
                } else if (action === 'reject') {
                    await interaction.editReply({ content: `❌ Anda telah **menolak** permintaan verifikasi dari **${applicant.user.tag}**.`, components: [] });
                    await applicant.send({ content: `💔 Maaf, tapi permintaan verifikasi perempuan kamu di server **${guild.name}** telah **Ditolak** oleh salah seorang admin.` }).catch(() => {});
                }
                return; // Selesai
            }

            // ===============================================
            // 2. PENANGANAN TOMBOL TEMP VOICE
            // ===============================================
            if (!interaction.customId.startsWith('tv_')) return; // Blokir jika bukan temp voice
            
            const memberVoiceChannel = interaction.member?.voice?.channel;

            if (!memberVoiceChannel) {
                await interaction.reply({ content: '❌ Kamu harus berada di dalam Temp Voice kamu sendiri untuk menggunakan kontrol ini!', ephemeral: true });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                return;
            }

            // Ambil daftar private channel dari memory bot
            const voiceEvent = require('./voiceStateUpdate.js');
            const privateChannels = voiceEvent.getPrivateChannels();

            // ==========================================
            // AUTO RESTORE MEMORY (Jika Bot Habis Restart)
            // ==========================================
            let roomData = privateChannels.get(memberVoiceChannel.id);
            if (!roomData && (memberVoiceChannel.name.includes("'s Room") || memberVoiceChannel.name.includes("🔊"))) {
                // Temukan user yang punya izin ManageChannels di room ini
                const ownerPerm = memberVoiceChannel.permissionOverwrites.cache.find(perm => perm.allow.has('MoveMembers') && perm.type === 1);
                const ownerId = ownerPerm ? ownerPerm.id : (memberVoiceChannel.members.first() ? memberVoiceChannel.members.first().id : interaction.user.id);
                roomData = { ownerId: ownerId, createdAt: Date.now() };
                privateChannels.set(memberVoiceChannel.id, roomData);
            }

            // Pengecekan kepemilikan room (Kecuali tombol AMBIL ALIH)
            if (interaction.customId !== 'tv_claim' && (!roomData || roomData.ownerId !== interaction.user.id)) {
                await interaction.reply({ content: '❌ Kamu bukan pemilik riuangan ini!', ephemeral: true });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                return;
            }

            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

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
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal mengunci room.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // 4. TOMBOL UNLOCK (BUKA KUNCI ROOM)
            else if (interaction.customId === 'tv_unlock') {
                try {
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
                    await interaction.reply({ content: '🔓 Room berhasil **dibuka**! Semua orang bisa masuk sekarang.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal membuka room.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // 6. TOMBOL HIDE (SEMBUNYIKAN ROOM)
            else if (interaction.customId === 'tv_hide') {
                try {
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                    await interaction.reply({ content: '👻 Room berhasil **disembunyikan**! Orang lain tidak bisa melihat channel ini.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal menyembunyikan room.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // 7. TOMBOL UNHIDE (TAMPILKAN ROOM)
            else if (interaction.customId === 'tv_unhide') {
                try {
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
                    await interaction.reply({ content: '👁️ Room kembali **ditampilkan**! Semua orang bisa melihatnya sekarang.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal menampilkan room.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // 8. TOMBOL SET PASSWORD
            else if (interaction.customId === 'tv_setpass') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_tv_setpass')
                    .setTitle('Pasang Kata Sandi');

                const passInput = new TextInputBuilder()
                    .setCustomId('tv_password_input')
                    .setLabel('Masukkan kata sandi untuk room ini')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(20)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(passInput));
                await interaction.showModal(modal);
            }

            // 9. TOMBOL AMBIL ALIH (CLAIM ROOM)
            else if (interaction.customId === 'tv_claim') {
                if (roomData.ownerId === interaction.user.id) {
                    await interaction.reply({ content: '❌ Kamu sudah menjadi pemilik room ini!', ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }

                // Cek apakah pemilik aslinya masih ada di voice channel ini
                const ownerP = memberVoiceChannel.members.get(roomData.ownerId);
                if (ownerP) {
                    await interaction.reply({ content: `❌ Pemilik ruangan (<@${roomData.ownerId}>) masih ada di dalam! Kamu tidak bisa mengambil alih.`, ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }

                try {
                    // Berhasil claim
                    roomData.ownerId = interaction.user.id;
                    await memberVoiceChannel.setName(`🔊 ${interaction.user.username}'s Room`);
                    await memberVoiceChannel.permissionOverwrites.edit(interaction.user.id, { ManageChannels: true, MoveMembers: true });
                    await interaction.reply({ content: '👑 Kamu telah berhasil **mengambil alih** kepemilikan room ini!', ephemeral: false });

                    // EDIT PANEL SECARA REALTIME
                    const receivedEmbed = interaction.message.embeds[0];
                    if (receivedEmbed) {
                        const { EmbedBuilder } = require('discord.js');
                        const newEmbed = EmbedBuilder.from(receivedEmbed)
                            .setDescription(receivedEmbed.description.replace(/👑 \*\*Owner:\*\* <@\d+>/, `👑 **Owner:** <@${interaction.user.id}>`));
                        await interaction.message.edit({ embeds: [newEmbed] }).catch(() => {});
                    }
                } catch (e) {
                    await interaction.reply({ content: '❌ Gagal melakukan claim room.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // 10. TOMBOL SERAHKAN (TRANSFER ROOM)
            else if (interaction.customId === 'tv_transfer') {
                const membersInChannel = Array.from(memberVoiceChannel.members.values()).filter(m => m.id !== interaction.user.id);
                
                if (membersInChannel.length === 0) {
                    await interaction.reply({ content: '❌ Tidak ada orang lain di ruangan ini untuk diserahkan kepemilikannya.', ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_tv_transfer_${interaction.message.id}`)
                    .setPlaceholder('Pilih member pengganti')
                    .addOptions(
                        membersInChannel.slice(0, 25).map(m => ({
                            label: m.user.username,
                            description: `Serahkan room ke ${m.user.tag}`,
                            value: m.id
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);
                await interaction.reply({ content: 'Pilih member yang ingin Anda jadikan pemilik baru room ini:', components: [row], ephemeral: true });
            }
            // 5. TOMBOL KICK (KICK USER)
            else if (interaction.customId === 'tv_kick') {
                const membersInChannel = Array.from(memberVoiceChannel.members.values()).filter(m => m.id !== interaction.user.id);
                
                if (membersInChannel.length === 0) {
                    await interaction.reply({ content: '❌ Tidak ada orang lain di ruangan ini untuk diusir.', ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_tv_kick')
                    .setPlaceholder('Pilih member yang ingin diusir')
                    .addOptions(
                        membersInChannel.slice(0, 25).map(m => ({
                            label: m.user.username,
                            description: `Usir ${m.user.tag} dari room`,
                            value: m.id
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);
                await interaction.reply({ content: 'Pilih member yang ingin Anda usir dari daftar ini:', components: [row], ephemeral: true });
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
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (err) {
                    await interaction.reply({ content: '❌ Gagal mengubah nama room. Mungkin bot terkena rate-limit dari Discord.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
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
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (err) {
                    await interaction.reply({ content: '❌ Gagal mengubah batas user.', ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }

            // PROSES SET PASSWORD
            else if (interaction.customId === 'modal_tv_setpass') {
                const pass = interaction.fields.getTextInputValue('tv_password_input');
                
                const voiceEvent = require('./voiceStateUpdate.js');
                const privateChannels = voiceEvent.getPrivateChannels();
                const roomData = privateChannels.get(memberVoiceChannel.id);

                if (roomData) {
                    roomData.password = pass; // Simpan password ke memory object server
                    
                    try {
                        // Kunci room otomatis agar orang harus pake command
                        await memberVoiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                        await interaction.reply({ 
                            content: `✅ Password berhasil dipasang: **${pass}**\n🔒 Room kamu sudah **dikunci** secara otomatis.\n\nSuruh temanmu mengetik command ini di sembarang chat untuk bisa masuk:\n\`/masuk target:@${interaction.user.username} password:${pass}\``, 
                            ephemeral: true 
                        });
                    } catch (err) {
                        await interaction.reply({ content: '❌ Gagal mengunci channel, pastikan bot punya izin.', ephemeral: true });
                    }
                }
            }
        }

        // ===============================================
        // PENANGANAN MENU PILIHAN (DROPDOWN/SELECT MENU)
        // ===============================================
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_tv_kick') {
                const memberVoiceChannel = interaction.member.voice.channel;
                if (!memberVoiceChannel) return interaction.reply({ content: '❌ Kamu harus di dalam voice channel.', ephemeral: true });
                
                const targetId = interaction.values[0];
                const targetMember = memberVoiceChannel.members.get(targetId);

                if (!targetMember) {
                    return interaction.reply({ content: '❌ Member tersebut mungkin sudah keluar dari room ini.', ephemeral: true });
                }

                try {
                    // Keluarkan user dengan memutuskan koneksinya
                    await targetMember.voice.disconnect('Diusir oleh pemilik room Temp Voice');
                    await interaction.reply({ content: `✅ Berhasil menendang **${targetMember.user.tag}** dari room.`, ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                } catch (err) {
                    await interaction.reply({ content: `❌ Gagal mengusir member. Pastikan bot memiliki izin Move Members.`, ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }
            
            else if (interaction.customId.startsWith('select_tv_transfer_')) {
                const panelMsgId = interaction.customId.split('_').pop();
                const memberVoiceChannel = interaction.member.voice.channel;
                if (!memberVoiceChannel) {
                    await interaction.reply({ content: '❌ Kamu harus di dalam voice channel.', ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
                
                const targetId = interaction.values[0];
                const targetMember = memberVoiceChannel.members.get(targetId);

                if (!targetMember) {
                    await interaction.reply({ content: '❌ Member tersebut mungkin sudah keluar dari room ini.', ephemeral: true });
                    return setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }

                try {
                    const voiceEvent = require('./voiceStateUpdate.js');
                    const privateChannels = voiceEvent.getPrivateChannels();
                    const roomData = privateChannels.get(memberVoiceChannel.id);
                    
                    if (roomData) {
                        roomData.ownerId = targetId; // Ubah owner
                        await memberVoiceChannel.setName(`🔊 ${targetMember.user.username}'s Room`);
                        await memberVoiceChannel.permissionOverwrites.edit(targetId, { ManageChannels: true, MoveMembers: true });
                        await memberVoiceChannel.permissionOverwrites.delete(interaction.user.id).catch(() => {});
                        await interaction.reply({ content: `✅ Berhasil menyerahkan kepemilikan room kepada **${targetMember.user.tag}**.`, ephemeral: false });

                        // UPDATE PANEL SECARA REALTIME
                        const panelMsg = await interaction.channel.messages.fetch(panelMsgId).catch(() => null);
                        if (panelMsg && panelMsg.embeds.length > 0) {
                            const { EmbedBuilder } = require('discord.js');
                            const newEmbed = EmbedBuilder.from(panelMsg.embeds[0])
                                .setDescription(panelMsg.embeds[0].description.replace(/👑 \*\*Owner:\*\* <@\d+>/, `👑 **Owner:** <@${targetId}>`));
                            await panelMsg.edit({ embeds: [newEmbed] }).catch(() => {});
                        }
                    }
                } catch (err) {
                    await interaction.reply({ content: `❌ Gagal memindahkan kepemilikan room.`, ephemeral: true });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 4000);
                }
            }
        }
    },
};
