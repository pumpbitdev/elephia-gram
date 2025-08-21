
import { Telegraf, Markup, session } from 'telegraf';
import registerFlow from './flows/register.js';
import exchangeFlow from './flows/exchange.js';
import { initializeDatabase, getAllUserIds, findUserById, historyMessages } from './db.js'; // Importamos la nueva función
import 'dotenv/config';

const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({
    defaultSession: () => ({ flow: null, step: null })
}));

// --- MANEJADOR /start MEJORADO ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const isRegistered = await findUserById(userId);

    let welcomeMessage;
    let keyboard;

    if (isRegistered) {
        welcomeMessage = `¡Hola de nuevo, ${ctx.from.first_name}! 👋 Qué bueno verte por aquí. ¿Qué deseas hacer hoy?`;
        keyboard = Markup.keyboard([
            ['💹 Realizar Cambio', '💳 Mis Métodos de Pago'],
            ['ℹ️ Ayuda']
        ]).resize();
    } else {
        welcomeMessage = '¡Hola! 👋 Soy tu asistente de exchange. Para comenzar, por favor, regístrate.';
        keyboard = Markup.keyboard([
            ['👤 Registrarme', 'ℹ️ Ayuda']
        ]).resize();
    }

    ctx.reply(welcomeMessage, keyboard);
});

bot.command('help', (ctx) => ctx.reply('Usa los botones del menú para interactuar conmigo.'));
bot.command('historial', (ctx) => ctx.reply(historyMessages(ctx.from.id)));
bot.hears('ℹ️ Ayuda', (ctx) => ctx.reply('Usa los botones del menú para interactuar conmigo.'));


// ... (código del broadcast) ...
bot.command('broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply('❌ No tienes permiso para usar este comando.');
    }
    
    const message = ctx.message.text.slice('/broadcast'.length).trim();
    if (!message) {
        return ctx.reply('Por favor, escribe el mensaje que quieres enviar. \nEjemplo: `/broadcast ¡Hola a todos!`');
    }

    broadcastMessage(ctx, message);
});

// --- LÓGICA DE MANEJADORES ---
// Prevenimos que un usuario no registrado inicie flujos no permitidos
bot.hears('👤 Registrarme', (ctx) => registerFlow.start(ctx));
bot.hears('💹 Realizar Cambio', async (ctx) => {
    const isRegistered = await findUserById(ctx.from.id);
    if (!isRegistered) {
        return ctx.reply('Debes registrarte primero para poder realizar un cambio. Usa el botón "Registrarme".');
    }
    exchangeFlow.start(ctx);
});

bot.on('text', (ctx) => {
    if (ctx.session?.flow === 'register') registerFlow.handle(ctx);
    else if (ctx.session?.flow === 'exchange') exchangeFlow.handle(ctx);
    else {
         // Evita responder si el texto coincide con un botón que ya tiene un 'hears'
        if (!['👤 Registrarme', '💹 Realizar Cambio', 'ℹ️ Ayuda', '💳 Mis Métodos de Pago'].includes(ctx.message.text)) {
            ctx.reply("🤔 No estoy seguro de entenderte. Por favor, elige una de las opciones del teclado.");
        }
    }
});


// ... (código de 'on photo' y broadcastMessage) ...
bot.on('photo', (ctx) => {
    if (ctx.session?.flow === 'exchange' && ctx.session?.step === 'payment') {
        exchangeFlow.handle(ctx);
    } else {
        ctx.reply("🖼️ He recibido una imagen, pero no estoy seguro de qué hacer con ella.");
    }
});

async function broadcastMessage(ctx, message) {
    ctx.reply('🚀 Iniciando el envío masivo...');
    const userIds = await getAllUserIds();
    let successCount = 0;
    let errorCount = 0;

    for (const id of userIds) {
        try {
            await ctx.telegram.sendMessage(id, message);
            successCount++;
        } catch (error) {
            console.error(`Error enviando mensaje a ${id}:`, error.description);
            errorCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    ctx.reply(`✅ Envío completado.\n\nMensajes exitosos: ${successCount}\nErrores: ${errorCount}`);
}


// Iniciar el bot
async function startBot() {
    await initializeDatabase();
    bot.launch(() => {
        console.log('Bot started successfully!');
    });
}

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
