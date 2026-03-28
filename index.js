const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = "7678859115";
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// GANTI DENGAN DOMAIN KAMU
const API_CEK = "https://domainkamu.infinityfreeapp.com/cek.php";
const API_SIMPAN = "https://domainkamu.infinityfreeapp.com/simpan.php";

// ================= FUNCTION =================

// parsing tanggal (sementara biarkan)
function formatTanggal(tanggal) {
    return tanggal;
}

// kirim pesan ke telegram
async function sendMessage(chatId, text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: text
    });
}

// ================= WEBHOOK =================

app.post("/webhook", async (req, res) => {
    const message = req.body.message;

    if (!message) return res.send("ok");

    const chatId = message.chat.id;
    const text = message.text;

    // ================= START =================
    if (text === "/start") {
        await sendMessage(chatId,
`Halo 👋

Gunakan format berikut:

/input
SC : XXXXX
NIK : XXXXX
TANGGAL : 25 MARET 2026`
        );
    }

    // ================= INPUT =================
    else if (text.startsWith("/input")) {
        try {
            const lines = text.split("\n");

            let data = {};

            // parsing tiap baris
            lines.forEach(line => {
                if (line.includes(":")) {
                    let [key, value] = line.split(":");
                    data[key.trim().toUpperCase()] = value.trim();
                }
            });

            const sc = data["SC"];
            const nik = data["NIK"];
            const tanggal = data["TANGGAL"];

            // ===== VALIDASI DASAR =====
            if (!sc || !nik || !tanggal) {
                throw "Data tidak lengkap (SC, NIK, TANGGAL wajib diisi)";
            }

            // NIK harus angka
            if (!/^\d+$/.test(nik)) {
                throw "NIK harus berupa angka";
            }

            // ===== CEK KE DATABASE =====
            const cek = await axios.post(API_CEK, { sc, nik });
            const result = cek.data;

            if (result.status === "nik_tidak_ada") {
                throw "NIK tidak ditemukan dalam database";
            }

            if (result.status === "sc_double") {
                throw "SC sudah terdaftar (tidak boleh double)";
            }

            // ===== SIMPAN DATA =====
            await axios.post(API_SIMPAN, {
                sc,
                nik,
                tanggal: formatTanggal(tanggal)
            });

            // ===== SUKSES =====
            await sendMessage(chatId, "✅ Data berhasil disimpan");

        } catch (err) {
            await sendMessage(chatId, `❌ Data tidak tersimpan\nError: ${err}`);
        }
    }

    // ================= SALAH FORMAT =================
    else {
        await sendMessage(chatId,
`❌ Format salah

Gunakan:
/input
SC : XXXXX
NIK : XXXXX
TANGGAL : 25 MARET 2026`
        );
    }

    res.send("ok");
});

// ================= ROOT =================

app.get("/", (req, res) => {
    res.send("Bot Telegram Aktif 🚀");
});

// ================= RUN SERVER =================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server jalan di port " + PORT);
});
