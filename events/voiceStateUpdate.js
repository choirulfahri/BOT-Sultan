const { Events, ChannelType } = require('discord.js');

// Simpan daftar private channel yang dibuat bot
// Key: channelId, Value: { ownerId, createdAt }
const privateChannels = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    privateChannels, // export agar bisa diakses dari tempat lain jika ada
    async execute(oldState, newState) {
        // ==========================================
        // 1. LOGIKA MEMBUAT TEMP VOICE (JOIN TO CREATE)
        // ==========================================
        // Set VOICE_CREATE_ID di dalam file .env
        const triggerChannelId = process.env.VOICE_CREATE_ID;
        const joinedChannel = newState.channel;

        // Jika user bergabung ke voice channel yang ID-nya cocok ATAU namanya mengandung emoji ➕
        if (joinedChannel && (joinedChannel.id === triggerChannelId || joinedChannel.name.includes('➕'))) {
            try {
                // Buat Voice Channel Baru di bawah Kategori yang sama
                const newChannel = await newState.guild.channels.create({
                    name: `🔊 ${newState.member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parentId, // Masuk ke kategori yang sama
                    permissionOverwrites: [
                        {
                            id: newState.member.id,
                            allow: ['ManageChannels', 'MoveMembers'], // Owner bisa atur roomnya
                        },
                        {
                            id: newState.guild.id,
                            allow: ['Connect', 'Speak'], // Yang lain bisa join
                        }
                    ],
                });

                // Pindahkan user ke channel yang baru dibuat
                await newState.setChannel(newChannel);

                // Catat channel baru ini di dalam memori bot
                privateChannels.set(newChannel.id, { ownerId: newState.member.id, createdAt: Date.now() });
                console.log(`[TempVoice] Dibuat: ${newChannel.name} oleh ${newState.member.user.tag}`);

                // ==========================================
                // KIRIM PANEL KONTROL KE TEXT CHAT VOICE CHANNEL
                // ==========================================
                try {
                    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('🔊 TempVoice Interface')
                        .setDescription(`Selamat datang <@${newState.member.id}>!\n\nGunakan tombol di bawah ini untuk mengatur room kamu.`);

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tv_rename').setLabel('NAMA').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_limit').setLabel('BATAS').setEmoji('👥').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_lock').setLabel('KUNCI').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_unlock').setLabel('BUKA').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
                    );
                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tv_setpass').setLabel('PASSWORD').setEmoji('🔑').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_hide').setLabel('HIDE').setEmoji('👻').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_unhide').setLabel('UNHIDE').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('tv_kick').setLabel('USIR').setEmoji('🚫').setStyle(ButtonStyle.Danger)
                    );
                    const row3 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tv_claim').setLabel('AMBIL ALIH').setEmoji('👑').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('tv_transfer').setLabel('SERAHKAN').setEmoji('🤝').setStyle(ButtonStyle.Primary)
                    );

                    await newChannel.send({ embeds: [embed], components: [row1, row2, row3] });
                } catch (sendErr) {
                    console.error('[TempVoice] Gagal mengirim panel ke chat voice', sendErr.message);
                }

            } catch (err) {
                console.error('[TempVoice] Gagal membuat channel:', err.message);
            }
        }

        // ==========================================
        // 2. LOGIKA MENGHAPUS TEMP VOICE SAAT KOSONG
        // ==========================================
        if (!oldState.channel) return;

        const channel = oldState.channel;

        // Cek apakah ini channel buatan bot (Lewat memory atau dari ciri khas namanya)
        const isSavedInMemory = privateChannels.has(channel.id);
        const isTempRoomByName = channel.name.includes("'s Room") || channel.name.includes("🔊");

        if (!isSavedInMemory && !isTempRoomByName) return;

        // Jika channel sudah kosong (semua orang leave)
        if (channel.members.size === 0) {
            try {
                // Beri delay 1.5 detik untuk memastikan API Discord sinkron sebelum dihapus
                setTimeout(async () => {
                    const checkChannel = await oldState.guild.channels.fetch(channel.id).catch(() => null);
                    if (checkChannel && checkChannel.members.size === 0) {
                        await checkChannel.delete('Temp Voice Kosong');
                        if (isSavedInMemory) privateChannels.delete(channel.id);
                        console.log(`[TempVoice] Dihapus: ${channel.name} karena sudah kosong.`);
                    }
                }, 1500);
            } catch (err) {
                console.error('[TempVoice] Gagal menghapus channel kosong:', err.message);
            }
        } 
        // Jika belum kosong, cek apakah yang keluar adalah Owner (Pemilik)
        else if (isSavedInMemory) {
            const roomData = privateChannels.get(channel.id);
            if (roomData.ownerId === oldState.member.id) {
                // Pilih member secara acak dari yang masih tersisa di dalam room
                const newOwner = channel.members.first(); 
                if (newOwner) {
                    roomData.ownerId = newOwner.id; // Update ke data baru
                    try {
                        // Ubah nama room
                        await channel.setName(`🔊 ${newOwner.user.username}'s Room`);
                        // Berikan perizinan ke orang baru tersebut
                        await channel.permissionOverwrites.edit(newOwner.id, { ManageChannels: true, MoveMembers: true });
                        // Hilangkan perizinan orang lama yg baru keluar (opsional/bersih-bersih)
                        await channel.permissionOverwrites.delete(oldState.member.id).catch(() => {});
                        // Beri notifikasi ke text chat voice
                        await channel.send({ content: `👑 Karena pemilik keluar, ruang ini otomatis dialihkan kepemilikannya ke **<@${newOwner.id}>**!` });
                        console.log(`[TempVoice] Update owner ke ${newOwner.user.username}`);
                    } catch (e) {
                        console.error('[TempVoice] Gagal transfer owner otomatis:', e.message);
                    }
                }
            }
        }
    },
    getPrivateChannels() {
        return privateChannels;
    }
};
