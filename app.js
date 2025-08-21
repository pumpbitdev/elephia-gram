
import { Telegraf, session } from 'telegraf';
import 'dotenv/config';

import { initializeDatabase, findUserById } from './db.js';
import { registerCommands } from './bot/commands.js';
import registerFlow from './flows/register.js';
import exchangeFlow from './flows/exchange.js';

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Registrar Middlewares
bot.use(session({
    defaultSession: () => ({ flow: null, step: null })
}));

// 2. Registrar todos los comandos y sus 'hears' desde el archivo externo
registerCommands(bot);

// 3. Registrar los 'hears' que inician flujos de conversación
bot.hears('👤 Registrarme', (ctx) => registerFlow.start(ctx));

bot.hears('💹 Realizar Cambio', async (ctx) => {
    // Verificación para proteger el flujo
    if (!(await findUserById(ctx.from.id))) {
        return ctx.reply('Debes registrarte primero para poder realizar un cambio.');
    }
    exchangeFlow.start(ctx);
});

// 4. Registrar manejadores generales para los flujos activos
bot.on('text', (ctx) => {
    const text = ctx.message.text;
    if (ctx.session?.flow === 'register') {
        registerFlow.handle(ctx);
    } else if (ctx.session?.flow === 'exchange') {
        exchangeFlow.handle(ctx);
    } else {
        // Evita responder a botones que ya tienen un manejador dedicado en commands.js
        if (!['👤 Registrarme', '💹 Realizar Cambio', 'ℹ️ Ayuda', '💳 Mis Métodos de Pago', '📜 Mi Historial'].includes(text)) {
            ctx.reply("🤔 No estoy seguro de entenderte. Por favor, elige una de las opciones del teclado.");
        }
    }
});

bot.on('photo', (ctx) => {
    if (ctx.session?.flow === 'exchange' && ctx.session?.step === 'payment') {
        exchangeFlow.handle(ctx);
    } else {
        ctx.reply("🖼️ He recibido una imagen, pero no estoy seguro de qué hacer con ella.");
    }
});


// 5. Iniciar el bot
async function startBot() {
    await initializeDatabase();
    bot.launch(() => {
        console.log('Bot started successfully!');
    });
}

startBot();

// Manejo de cierre del proceso para apagar el bot de forma segura
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
