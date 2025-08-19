
import { Telegraf, Markup, session } from 'telegraf';
import registerFlow from './flows/register.js';
import exchangeFlow from './flows/exchange.js';
import { initializeDatabase, getAllUserIds } from './db.js';
import 'dotenv/config';

// ID del administrador que puede usar comandos especiales
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware de sesión
bot.use(session({
    defaultSession: () => ({ flow: null, step: null })
}));

// Comandos de usuario
bot.start((ctx) => {
    ctx.reply('¡Hola! 👋 Soy tu asistente de exchange...', Markup.keyboard([
        ['👤 Registrarme', '💹 Realizar Cambio']
    ]).resize());
});

bot.command('help', (ctx) => ctx.reply('Usa los botones...'));

// Comandos de administrador
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

// Manejadores de botones
bot.hears('👤 Registrarme', (ctx) => registerFlow.start(ctx));
bot.hears('💹 Realizar Cambio', (ctx) => exchangeFlow.start(ctx));

// Manejadores de eventos
bot.on('text', (ctx) => {
    if (ctx.session?.flow === 'register') registerFlow.handle(ctx);
    else if (ctx.session?.flow === 'exchange') exchangeFlow.handle(ctx);
    else ctx.reply("🤔 No estoy seguro de entenderte...");
});

bot.on('photo', (ctx) => {
    if (ctx.session?.flow === 'exchange' && ctx.session?.step === 'payment') {
        exchangeFlow.handle(ctx);
    } else {
        ctx.reply("🖼️ He recibido una imagen, pero no estoy seguro de qué hacer con ella.");
    }
});

// Función de Broadcast
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
        await new Promise(resolve => setTimeout(resolve, 100)); // Pausa de 100ms
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

// Manejo de errores y cierre del proceso
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
