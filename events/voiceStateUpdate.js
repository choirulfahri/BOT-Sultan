const { Events } = require('discord.js');

// Simpan daftar private channel yang dibuat bot
// Key: channelId, Value: { ownerId, createdAt }
const privateChannels = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    privateChannels, // export agar bisa diakses dari messageCreate
    async execute(oldState, newState) {
        // Cek jika ada yang keluar dari voice channel
        if (!oldState.channel) return;

        const channel = oldState.channel;

        // Cek apakah ini private channel yang dibuat bot
        if (!privateChannels.has(channel.id)) return;

        // Jika channel sudah kosong, hapus otomatis
        if (channel.members.size === 0) {
            try {
                await channel.delete('Private room kosong, dihapus otomatis.');
                privateChannels.delete(channel.id);
                console.log(`[PrivateVC] Channel "${channel.name}" dihapus karena kosong.`);
            } catch (err) {
                console.error('[PrivateVC] Gagal hapus channel kosong:', err.message);
            }
        }
    },
    getPrivateChannels() {
        return privateChannels;
    }
};
