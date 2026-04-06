const { Events, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');
const { joinVoiceChannel } = require('@discordjs/voice');
const voiceStateEvent = require('./voiceStateUpdate');

// =====================================================
// DAFTAR KATA KASAR - Tambahkan kata baru di sini
// Format: huruf kecil semua
// =====================================================
const badWords = [
    // Umum
    'anjing', 'anj', 'anjg',
    'babi', 'b4b1',
    'bangsat', 'bgst', 'bngst',
    'goblok', 'g0bl0k', 'gblk',
    'tolol', 'tlol',
    'bodoh', 'bodo',
    'idiot',
    'kampret',
    'keparat',
    'bajingan',
    'bedebah',
    'sialan',
    'brengsek',
    // Kasar
    'kontol', 'kntl',
    'memek', 'mmk',
    'ngentot', 'ngt',
    'jancok', 'jncok',
    'cuki', 'cukimai',
    'asu',
    'celeng', 'jembut', 'jmbt',
    'pukimai', 'pendo',
    'lolok', 'maklu lonte',
    'bitch', 'zuya',
];

// =====================================================
// DAFTAR POLA PHISHING - Deteksi link & konten scam
// =====================================================
const phishingPatterns = [
    // Discord Nitro Scam
    /discord[.\-]?gift/i,
    /discordnitro/i,
    /free.?nitro/i,
    /nitro.?free/i,
    /discord.?nitro.?giveaway/i,
    /claim.?nitro/i,

    // Steam Scam
    /steam.?gift/i,
    /steamcommunity\.com\/gift/i,
    /free.?steam/i,
    /steam.?free/i,

    // URL Shortener + Klaim Hadiah (sering dipakai phishing)
    /(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy).+?(free|gift|nitro|claim|win)/i,

    // Fake gift / reward
    /you.?(have|got|won|received).+?(gift|prize|reward|nitro)/i,
    /klik.?(link|disini|sini).+(gratis|free|hadiah|menang)/i,
    /claim.?your.?(gift|prize|reward|free)/i,

    // Domain mencurigakan yang mirip Discord
    /discords?[^.]*\.(xyz|tk|ml|ga|cf|gq|ru|cn)/i,
    /dlscord/i,
    /disc0rd/i,
    /d1scord/i,
];

// Sistem peringatan (track berapa kali member melanggar kata kasar)
const warningCount = new Map();

// Fungsi untuk kick user dengan DM notifikasi
async function kickUser(message, reason, embedTitle, embedDesc) {
    try {
        // Kirim DM dulu sebelum kick
        await message.author.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🚨 Kamu Telah Dikeluarkan dari Server!')
                    .setDescription(embedDesc)
                    .addFields({ name: '📋 Alasan', value: reason })
                    .setTimestamp()
            ]
        }).catch(() => { });

        // Delay 2 detik biar user sempat baca DM
        setTimeout(async () => {
            try {
                const member = message.guild.members.cache.get(message.author.id);
                if (member && member.kickable) {
                    await member.kick(reason);
                    console.log(`[AutoKick] ${message.author.tag} dikick. Alasan: ${reason}`);
                }
            } catch (e) {
                console.error('Gagal auto-kick:', e);
            }
        }, 2000);
    } catch (e) {
        console.error('Gagal proses kick:', e);
    }
}

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        // Jangan merespon bot lain atau webhooks
        if (message.author.bot) return;
        if (!message.guild) return;

        const contentLower = message.content.toLowerCase();

        // =====================================================
        // CEK MENTION BOT - Semua command via chat natural
        // =====================================================
        const botMentioned = message.mentions.has(client.user);
        if (botMentioned) {

            // Helper: hapus pesan user + kirim konfirmasi yang auto-delete
            const autoReply = async (text) => {
                await message.delete().catch(() => { });
                const reply = await message.channel.send(`<@${message.author.id}> ${text}`);
                setTimeout(() => reply.delete().catch(() => { }), 5000);
            };
            // === GABUNG KE VOICE CHANNEL ===
            if (/(sini|gabung|masuk|join|ke sini|kemari)/i.test(contentLower)) {
                const vc = message.member.voice.channel;
                if (!vc) return autoReply('kamu harus masuk voice channel dulu bro');
                const botVc = message.guild.members.me.voice.channel;
                if (botVc && botVc.id === vc.id) return autoReply(`gue udah di **${vc.name}** bro 😎`);
                joinVoiceChannel({ channelId: vc.id, guildId: message.guild.id, adapterCreator: message.guild.voiceAdapterCreator, selfDeaf: false });
                return autoReply(`sip gue gabung ke **${vc.name}** 🎙️`);
            }

            // === PUTAR MUSIK ===
            if (/(putar|play|musik|lagu|cari)/i.test(contentLower)) {
                const vc = message.member.voice.channel;
                if (!vc) return message.reply('masuk voice channel dulu bro baru minta lagu');
                const query = message.content
                    .replace(/<@!?\d+>/g, '').replace(/(putar|play|musik|lagu|cari)/i, '').trim();
                if (!query) return message.reply('mau putar lagu apa? contoh: `@bot putar Hindia`');
                try {
                    const res = await client.player.play(vc, query, {
                        nodeOptions: { leaveOnEmpty: false, leaveOnEnd: false, leaveOnStop: false, metadata: message }
                    });
                    return message.reply(`numpang ngamen bawain lagu **${res.track.title}** 🎵`);
                } catch (e) {
                    return message.reply(`gagal putar lagu: ${e.message}`);
                }
            }

            // === STOP MUSIK ===
            if (/(stop|berhenti|cabut|udahan)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                queue.tracks.clear();
                queue.node.stop();
                return message.reply('oke lagunya distop 🎵');
            }

            // === SKIP LAGU ===
            if (/(skip|lewatin|next|lanjut)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                queue.node.skip();
                return message.reply('⏭️ oke dilangkahi lagunya!');
            }

            // === PAUSE ===
            if (/(pause|tahan|jeda)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                if (queue.node.isPaused()) return message.reply('udah di-pause bro');
                queue.node.pause();
                return message.reply('⏸️ lagu di-pause');
            }

            // === RESUME ===
            if (/(resume|lanjutin|terusin|lanjutkan)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue) return message.reply('ga ada lagu bro');
                if (!queue.node.isPaused()) return message.reply('lagunya lagi jalan bro');
                queue.node.resume();
                return message.reply('▶️ lanjut ngamen lagi!');
            }

            // === VOLUME ===
            const volMatch = contentLower.match(/volume\s*(\d+)/);
            if (volMatch) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                const vol = Math.min(100, Math.max(1, parseInt(volMatch[1])));
                queue.node.setVolume(vol);
                const emoji = vol > 66 ? '🔊' : vol > 33 ? '🔉' : '🔈';
                return message.reply(`${emoji} volume diset ke **${vol}%**`);
            }

            // === ANTRIAN / QUEUE ===
            if (/(antrian|queue|list lagu|daftar lagu)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                const tracks = queue.tracks.toArray();
                const cur = queue.currentTrack;
                const list = tracks.length > 0
                    ? tracks.slice(0, 10).map((t, i) => `\`${i + 1}.\` **${t.title}**`).join('\n')
                    : '*tidak ada antrian*';
                return message.reply(`🎵 **Sekarang:** ${cur.title}\n\n📋 **Antrian:**\n${list}`);
            }

            // === NOWPLAYING ===
            if (/(lagu apa|lagi play|putar apa|nowplaying|sekarang)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                const track = queue.currentTrack;
                return message.reply(`🎵 Lagi putar: **${track.title}** - ${track.author} (${track.duration})`);
            }

            // === LOOP ===
            if (/(loop|ulangin|repeat)/i.test(contentLower)) {
                const queue = useQueue(message.guild.id);
                if (!queue || !queue.isPlaying()) return message.reply('ga ada lagu yang lagi diputar bro');
                if (queue.repeatMode === QueueRepeatMode.OFF) {
                    queue.setRepeatMode(QueueRepeatMode.TRACK);
                    return message.reply('🔂 loop 1 lagu aktif!');
                } else if (queue.repeatMode === QueueRepeatMode.TRACK) {
                    queue.setRepeatMode(QueueRepeatMode.QUEUE);
                    return message.reply('🔁 loop semua antrian aktif!');
                } else {
                    queue.setRepeatMode(QueueRepeatMode.OFF);
                    return message.reply('🚫 loop dimatiin');
                }
            }

            // === KICK USER ===
            if (/(kick|keluarin|usir)/i.test(contentLower)) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
                    return autoReply('kamu ga punya izin kick member bro');
                const target = message.mentions.members.filter(m => !m.user.bot && m.id !== message.author.id).first();
                if (!target) return autoReply('tag dulu siapa yang mau dikick');
                if (!target.kickable) return autoReply('ga bisa kick orang itu, role-nya lebih tinggi dari gue');
                await target.kick('Dikick via perintah chat');
                return autoReply(`✅ **${target.user.username}** udah dikick`);
            }

            // === HAPUS PESAN / CLEAR ===
            const hapusMatch = contentLower.match(/(hapus|clear|bersihkan)\s*(\d+)/);
            if (hapusMatch) {
                if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
                    return autoReply('kamu ga punya izin hapus pesan bro');
                const amount = Math.min(100, parseInt(hapusMatch[2]));
                await message.channel.bulkDelete(amount + 1, true).catch(() => { });
                const notif = await message.channel.send(`✅ ${amount} pesan berhasil dihapus`);
                setTimeout(() => notif.delete().catch(() => { }), 3000);
                return;
            }

            // === AJAK MAIN ===
            if (/(ajakin|ajak|nyariin|nyari|panggilin|panggil)/i.test(contentLower)) {
                const targetUser = message.mentions.users.filter(u => !u.bot).first();
                if (!targetUser) return autoReply('tag dulu siapa yang mau diajak, contoh: `@bot ajakin @teman main Valorant`');
                const mainIndex = contentLower.indexOf('main');
                const gameName = mainIndex !== -1
                    ? message.content.slice(mainIndex + 5).replace(/<[^>]+>/g, '').trim()
                    : 'game';
                try {
                    await targetUser.send(`🎮 **${message.author.username}** dari server **${message.guild.name}** lagi nyariin kamu buat main bareng **${gameName || 'game'}**!`);
                    return autoReply(`sip! udah gue DM-in **${targetUser.username}** buat diajak main **${gameName || 'game'}** 🎮`);
                } catch (err) {
                    return autoReply(err.code === 50007
                        ? `gagal DM **${targetUser.username}**, DM-nya dikunci`
                        : 'ada error nih, coba lagi');
                }
            }

            // === DM TEMAN ===
            if (/(dm|kirimin pesan|kasih tau|pesan ke|pm)/i.test(contentLower)) {
                const targetUser = message.mentions.users.filter(u => !u.bot && u.id !== message.author.id).first();
                if (!targetUser) return autoReply('tag dulu siapa yang mau di-DM, contoh: `@bot dm @teman hai bro lagi apa?`');

                // Ambil isi pesan (buang semua mention dan keyword)
                const pesanDM = message.content
                    .replace(/<@!?\d+>/g, '')  // buang semua mention
                    .replace(/(dm|kirimin pesan|kasih tau|pesan ke|pm)\s*(ke|si|buat)?/ig, '') // buang keyword dan kata sambung
                    .trim();

                if (!pesanDM) return autoReply('isi pesannya dong, contoh: `@bot dm @teman hai lagi apa?`');

                try {
                    await targetUser.send(`📨 Pesan dari **${message.author.username}** (Server: **${message.guild.name}**):\n\n${pesanDM}`);
                    return autoReply(`✅ pesan udah dikirim ke **${targetUser.username}**!`);
                } catch (err) {
                    return autoReply(err.code === 50007
                        ? `❌ gagal DM **${targetUser.username}**, DM-nya dikunci nih`
                        : 'ada error, coba lagi bang');
                }
            }

            // === PRIVATE VOICE CHANNEL ===
            if (/(private|room|kamar|vc privat|private room|private vc|ruangan)/i.test(contentLower)) {
                const requester = message.member;
                const invitedMembers = message.mentions.members
                    .filter(m => !m.user.bot && m.id !== message.author.id);

                const permissionOverwrites = [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
                    { id: message.guild.members.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.ManageChannels] },
                    { id: requester.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.MuteMembers] },
                ];

                invitedMembers.forEach(member => {
                    permissionOverwrites.push({
                        id: member.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
                    });
                });

                let customName = message.content
                    .replace(/<@!?\d+>/g, '') // buang semua mention
                    .replace(/(buat|bikin|private|room|kamar|vc privat|private room|private vc|ruangan)/ig, '') // buang kata kunci
                    .trim();

                if (!customName) {
                    customName = `room-${requester.user.username}`;
                }

                try {
                    const privateChannel = await message.guild.channels.create({
                        name: `${customName}`,
                        type: ChannelType.GuildVoice,
                        parent: requester.voice.channel?.parentId || null,
                        permissionOverwrites,
                        userLimit: 1 + invitedMembers.size,
                        reason: 'Room dibuat admin',
                    });

                    voiceStateEvent.getPrivateChannels().set(privateChannel.id, { ownerId: requester.id, createdAt: Date.now() });

                    if (requester.voice.channel) {
                        await requester.voice.setChannel(privateChannel).catch(() => { });
                    }

                    let inviteUrl = '';
                    try {
                        const invite = await privateChannel.createInvite({
                            maxAge: 0, // Tidak expired sampai channel terhapus
                            maxUses: 0 // Unlimited atau bisa sesuai jumlah yg diinvite
                        });
                        inviteUrl = invite.url;
                    } catch (err) {
                        console.error('[PrivateVC] Gagal buat invite link:', err.message);
                    }

                    const inviteNames = [];
                    for (const [, member] of invitedMembers) {
                        inviteNames.push(member.user.username);
                        try {
                            const msgLink = inviteUrl ? `\n\nKlik link ini untuk langsung bergabung: ${inviteUrl}` : '';
                            await member.send(`**${message.author.username}** mengundang kamu ke **Private Room** di server **${message.guild.name}**!\nMasuk ke nama channel: **${privateChannel.name}**${msgLink}`);
                        } catch { }
                    }

                    const siapa = inviteNames.length > 0 ? `bersama ${inviteNames.join(', ')}` : 'tanpa undangan tambahan';
                    return autoReply(`private room **${privateChannel.name}** udah dibuat ${siapa}! langsung masuk aja.`);
                } catch (err) {
                    console.error('[PrivateVC] Gagal buat private room:', err.message);
                    return autoReply('gagal buat private room, pastiin bot punya izin Manage Channels');
                }
            }

            // Jika tidak ada keyword yang cocok
            return autoReply('hm? mau suruh gue ngapain? bilang yang jelas dong, contoh: `@bot putar Hindia` atau `@bot sini`');
        }

        const isPhishing = phishingPatterns.some(pattern => pattern.test(message.content));

        if (isPhishing) {
            // Hapus pesan phishing
            await message.delete().catch(err => {
                if (err.code === 10008) return; // pesan sudah dihapus
                if (err.code === 50013) return console.error('[Phishing] Bot tidak punya izin hapus pesan di channel ini!');
                console.error('[Phishing] Gagal hapus pesan:', err.message);
            });

            // Kirim embed peringatan phishing di channel
            const phishEmbed = new EmbedBuilder()
                .setColor(0x8B0000) // Merah gelap
                .setTitle('Link Phishing / Scam Terdeteksi!')
                .setDescription(`<@${message.author.id}> telah mengirim konten mencurigakan dan **langsung dikeluarkan** dari server!`)
                .addFields(
                    { name: 'Jenis Pelanggaran', value: 'Phishing / Link Scam', inline: true },
                    { name: 'Tindakan', value: 'Kick Otomatis', inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({ text: 'Jangan klik link sembarang ya members' })
                .setTimestamp();

            const phishMsg = await message.channel.send({ embeds: [phishEmbed] });

            // Hapus pesan peringatan phishing setelah 15 detik
            setTimeout(() => phishMsg.delete().catch(() => { }), 15000);

            // Langsung kick
            await kickUser(
                message,
                'Mengirim konten phishing/scam di server',
                'kick ye bang sorry nich',
                'bang plis jangan mencet link link dari stream vidio porn0 bang'
            );

            return; // Berhenti, tidak perlu cek badword lagi
        }

        const foundWord = badWords.find(word => contentLower.includes(word));

        if (foundWord) {
            try {
                const botMember = message.guild.members.me;
                const hasPermission = message.channel
                    .permissionsFor(botMember)
                    .has('ManageMessages');

                if (!hasPermission) {
                    console.error(`[BadWord] Bot tidak punya izin 'Manage Messages' di #${message.channel.name}! Silakan cek role bot di Discord.`);
                } else {
                    // Hapus pesan kata kasar
                    await message.delete().catch(err => {
                        if (err.code === 10008) return; // pesan sudah dihapus lebih dulu
                        console.error('[BadWord] Gagal hapus pesan (code ' + err.code + '):', err.message);
                    });
                    console.log(`[BadWord] Pesan dari ${message.author.tag} dihapus. Kata: "${foundWord}"`);
                }
                // Tambah hitungan peringatan
                const userId = message.author.id;
                const currentWarnings = (warningCount.get(userId) || 0) + 1;
                warningCount.set(userId, currentWarnings);

                // Tentukan warna dan pesan berdasarkan jumlah pelanggaran
                let color, title, description;

                if (currentWarnings >= 3) {
                    color = 0xFF0000;
                    title = 'yo yo yo jaga lisan anda';
                    description = `Ini ke-**${currentWarnings}**. sekali lagi anda dijemput!`;
                } else if (currentWarnings === 2) {
                    color = 0xFF8C00;
                    title = 'yo yo yo udah 2 kali ye';
                    description = `udah **2 kali**. sekali lagi anda dijemput!`;
                } else {
                    color = 0xFFD700;
                    title = 'Jangan kasar cuy';
                    description = `Lisannya dijaga ya`;
                }

                // Kirim peringatan (teks biasa)
                const warningMessage = await message.channel.send(
                    `**${title}**\n<@${message.author.id}>, ${description} (Pelanggaran ke-${currentWarnings})`
                );

                // Hapus pesan peringatan setelah 8 detik
                setTimeout(() => {
                    warningMessage.delete().catch(() => { });
                }, 8000);

            } catch (error) {
                console.error('Gagal memproses pesan kata kasar:', error);
            }
        }
    },
};
