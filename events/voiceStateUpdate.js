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

            } catch (err) {
                console.error('[TempVoice] Gagal membuat channel:', err.message);
            }
        }

        // ==========================================
        // 2. LOGIKA MENGHAPUS TEMP VOICE SAAT KOSONG
        // ==========================================
        if (!oldState.channel) return;

        const channel = oldState.channel;

        // Cek apakah ini channel buatan bot
        if (!privateChannels.has(channel.id)) return;

        // Jika channel sudah kosong (semua orang leave)
        if (channel.members.size === 0) {
            try {
                await channel.delete('Temp Voice Kosong');
                privateChannels.delete(channel.id);
                console.log(`[TempVoice] Dihapus: ${channel.name} karena sudah kosong.`);
            } catch (err) {
                console.error('[TempVoice] Gagal menghapus channel kosong:', err.message);
            }
        }
    },
    getPrivateChannels() {
        return privateChannels;
    }
};
