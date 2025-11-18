# 🔧 Server - Sevimlilar Tuzatish

## ❌ Muammo
1. **409 Conflict** - Serverda 2 ta bot instance ishlayapti
2. Sevimlilar funksiyasi ishlamayapti
3. Kod local da ishlaydi, lekin serverda muammo

## ✅ Yechim - Serverda Bajarish

### 1. SSH orqali serverga kirish
```bash
ssh sardor@server_ip
cd /home/sardor/names/names
```

### 2. Barcha bot jarayonlarini to'xtatish
```bash
# PM2 orqali to'xtatish
pm2 stop all
pm2 delete all

# Yoki to'g'ridan-to'g'ri
ps aux | grep "nest start" | grep -v grep | awk '{print $2}' | xargs kill -9
ps aux | grep "node" | grep "names" | grep -v grep | awk '{print $2}' | xargs kill -9

# Port tekshirish
lsof -ti:9990 | xargs kill -9 2>/dev/null
```

### 3. Yangi kodlarni olish (GitHub dan)
```bash
# Local o'zgarishlarni saqlash
git stash

# Yangi kodlarni tortish
git pull origin master

# Paketlarni yangilash
pnpm install
```

### 4. Build qilish
```bash
# Eski build ni o'chirish
rm -rf dist

# Yangi build
pnpm run build
```

### 5. Bot ni qayta ishga tushirish
```bash
# PM2 orqali (tavsiya etiladi)
pm2 start dist/main.js --name "names-bot"
pm2 save

# Yoki oddiy
pnpm run start:prod
```

### 6. Loglarni tekshirish
```bash
pm2 logs names-bot

# Yoki
tail -f /tmp/bot_startup.log
```

## 🧪 Tekshirish

1. Botga /start yuboring
2. Biror ism izlang (masalan: "Muhammad")
3. "⭐ Sevimlilarga" tugmasini bosing
4. Xabar kelishi kerak: "⭐ Sevimlilarga qo'shildi"
5. "⭐ Sevimlilar" menyusiga o'ting
6. Ism ko'rinishi kerak

## 📊 Database Tekshirish

```bash
# PostgreSQL ga kirish
psql -U postgres -d names

# Sevimlilar jadvalini tekshirish
SELECT * FROM user_favorite LIMIT 5;

# Foydalanuvchilarni tekshirish
SELECT id, telegram_id, username FROM "user" LIMIT 5;

# Chiqish
\q
```

## 🔍 Agar Ishlamasa

### Debug rejimi bilan ishga tushirish:
```bash
pm2 stop all
DEBUG=* pnpm run start:dev
```

### Telegram Bot Token tekshirish:
```bash
grep "BOT_TOKEN" .env
```

Token to'g'ri va yangi bo'lishi kerak.

### Webhook ni o'chirish (agar bor bo'lsa):
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## 💡 Muhim Eslatmalar

1. **Faqat 1 ta bot instance** ishlashi kerak
2. Local va server bir vaqtda ishlamasa ham bo'ladi (turli tokenlar bo'lsa)
3. PM2 orqali ishga tushirish yaxshiroq (auto-restart)
4. Loglarni doim kuzatib turing

## 🚀 PM2 Sozlash (Production)

```bash
# PM2 o'rnatish
npm install -g pm2

# Bot ni ishga tushirish
pm2 start dist/main.js --name "names-bot" --watch

# Auto-restart sozlash
pm2 startup
pm2 save

# Monitoring
pm2 monit
```

---

✅ **Muammo hal bo'lishi kerak!**
