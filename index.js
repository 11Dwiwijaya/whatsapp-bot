const { makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { createSticker, StickerTypes } = require('wa-sticker-formatter');
const { generate } = require('qrcode-terminal');

/**
 * Fungsi untuk menghubungkan ke WhatsApp menggunakan BAILEYS.
 */
async function connectToWhatsapp() {
    // Mengambil data otentikasi dari penyimpanan sesi
    const auth = await useMultiFileAuthState("session");

    // Membuat socket WhatsApp dengan konfigurasi tertentu
    const socket = makeWASocket({
        printQRInTerminal: true,
        browser: ['Dwi', 'Safari', '1.0.0'],
        auth: auth.state,
        logger: pino({ level: 'silent' }),
    });

    // Event listener untuk memperbarui kredensial
    socket.ev.on("creds.update", auth.saveCreds);

    // Event listener untuk memperbarui status koneksi
    socket.ev.on("connection.update", async ({ connection }) => {
        if (connection === 'open') {
            console.log("Koneksi terbuka 🚀");
        } else if (connection === 'close') {
            // Menghubungkan kembali jika koneksi ditutup
            await connectToWhatsapp();
        }
    });

    // Event listener untuk pesan yang masuk
    socket.ev.on("messages.upsert", async ({ messages }) => {
        const chat = messages[0];

        // Mendapatkan teks pesan
        const pesan =
            (
                chat.message?.extendedTextMessage?.text ??
                chat.message?.ephemeralMessage?.message?.extendedTextMessage?.text ??
                chat.message?.conversation
            )?.toLocaleLowerCase() || "";

        // Menanggapi pesan .ping
        if (pesan === '.ping') {
            await socket.sendMessage(chat.key.remoteJid, { text: "Hello, world!" }, { quoted: chat });
        }
        // Membuat stiker jika pesan adalah gambar dengan keterangan '.sticker'
        else if (chat.message?.imageMessage?.caption == '.sticker' && chat.message?.imageMessage) {
            // Fungsi untuk mendapatkan media (gambar) dari pesan
            const getMedia = async (msg) => {
                const msgType = Object.keys(msg?.message)[0];
                const stream = await downloadContentFromMessage(msg.message[msgType], msgType.replace("Message", ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            };
            const mediaData = await getMedia(chat);

            // Opsi stiker
            const stickerOption = {
                pack: 'wangsaff',
                author: 'wangsaff',
                type: StickerTypes.FULL,
                quality: 50
            };

            // Membuat stiker
            const generateSticker = await createSticker(mediaData, stickerOption);
            await socket.sendMessage(chat.key.remoteJid, { sticker: generateSticker });
        }
    });
}

// Menghubungkan ke WhatsApp saat aplikasi dijalankan
connectToWhatsapp();
