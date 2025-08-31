
import { Telegraf, session } from 'telegraf';
import 'dotenv/config';

import { initializeDatabase, findUserById } from './db.js';
import { registerCommands } from './bot/commands.js';
import registerFlow from './flows/register.js';
import exchangeFlow from './flows/exchange.js';
import paymentMethodsFlow from './flows/payment-methods.js'; // <-- 1. IMPORTAR EL NUEVO FLUJO

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Middlewares
bot.use(session({
    defaultSession: () => ({ flow: null, step: null })
}));

// 2. Comandos
registerCommands(bot);

// 3. 'hears' para iniciar flujos
bot.hears('👤 Registrarme', (ctx) => registerFlow.start(ctx));

bot.hears('💹 Realizar Cambio', async (ctx) => {
    if (!(await findUserById(ctx.from.id))) {
        return ctx.reply('Debes registrarte primero para poder realizar un cambio.');
    }
    exchangeFlow.start(ctx);
});

// --- 2. NUEVO 'hears' PARA EL FLUJO DE MÉTODOS DE PAGO ---
bot.hears('💳 Mis Métodos de Pago', async (ctx) => {
    if (!(await findUserById(ctx.from.id))) {
        return ctx.reply('Debes registrarte primero para gestionar tus métodos de pago.');
    }
    paymentMethodsFlow.start(ctx);
});


// 4. Manejadores generales para flujos activos
bot.on('text', (ctx) => {
    const text = ctx.message.text;
    if (text === 'hola') {
        ctx.reply('Operación cancelada. Volviendo al menú principal.');
    }

    if (ctx.session?.flow === 'register') {
        registerFlow.handle(ctx);
    } else if (ctx.session?.flow === 'exchange') {
        exchangeFlow.handle(ctx);
    } else if (ctx.session?.flow === 'payment_methods') { // <-- 3. AÑADIR CONDICIÓN PARA EL NUEVO FLUJO
        paymentMethodsFlow.handle(ctx);
    } 
    else {
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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
