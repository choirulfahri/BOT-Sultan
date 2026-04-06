const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        // =====================================================
        // AUTO ROLE - set ROLE_AUTO_ID di file .env
        // =====================================================
        const autoRoleId = process.env.ROLE_AUTO_ID;

        if (autoRoleId) {
            try {
                const role = member.guild.roles.cache.get(autoRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`[AutoRole] Role "${role.name}" diberikan ke ${member.user.tag}`);
                } else {
                    console.warn(`[AutoRole] Role ID ${autoRoleId} tidak ditemukan di server!`);
                }
            } catch (err) {
                console.error(`[AutoRole] Gagal memberikan role ke ${member.user.tag}:`, err.message);
            }
        }

        // =====================================================
        // WELCOME MESSAGE (BERGAMBAR ala KOYA BOT)
        // =====================================================
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

        if (welcomeChannelId) {
            const channel = member.guild.channels.cache.get(welcomeChannelId);
            if (channel) {
                try {
                    // Wajib punya module ini: npm install @napi-rs/canvas
                    const { createCanvas, loadImage } = require('@napi-rs/canvas');
                    const { AttachmentBuilder } = require('discord.js');

                    // Buat kanvas dengan ukuran 800x400
                    const canvas = createCanvas(800, 400);
                    const ctx = canvas.getContext('2d');

                    // 1. Gambar Background (Ganti URL ini dengan link background pilihan Anda)
                    const bgUrl = "https://i.imgur.com/8m1z91L.png"; // Contoh background biru dari url
                    const background = await loadImage(bgUrl).catch(() => null);
                    if (background) {
                        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
                    } else {
                        // Jika gagal load background, gunakan warna solid
                        ctx.fillStyle = '#1A1A24';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    // 2. Teks Sambutan
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 50px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('SELAMAT DATANG', canvas.width / 2, 320);

                    // 3. Teks Nama User
                    ctx.font = 'bold 30px sans-serif';
                    ctx.fillStyle = '#cccccc';
                    ctx.fillText(member.user.tag.toUpperCase(), canvas.width / 2, 365);

                    // 4. Lingkaran Border untuk Foto Profil
                    const avatarY = 140; // Posisi vertikal tengah avatarnya
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, avatarY, 105, 0, Math.PI * 2, true);
                    ctx.fillStyle = '#ffffff'; // Border putih
                    ctx.fill();

                    // 5. Masukkan Foto Profil
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, avatarY, 95, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip(); // Potong gambar avatarnya jadi bulat

                    // Ambil avatar user dengan ekstensi png (agar bersih)
                    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
                    const avatar = await loadImage(avatarUrl);
                    ctx.drawImage(avatar, (canvas.width / 2) - 95, avatarY - 95, 190, 190);

                    // Proses mengubah canvas menjadi gambar (attachment) untuk dikirim
                    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'welcome-image.png' });

                    // Kamu juga tetap bisa menyisipkan pesan/embed bersamaan dengan gambarnya
                    await channel.send({ content: `Halo <@${member.user.id}>, selamat bergabung di server! 🎉`, files: [attachment] });

                } catch (error) {
                    console.error("Gagal membuat gambar welcome:", error);
                    channel.send(`Halo <@${member.user.id}>, selamat datang di server!`); // Fallback jika gagal
                }
            }
        }
    },
};
