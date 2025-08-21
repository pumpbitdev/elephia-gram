
import { Telegraf, Markup, session } from 'telegraf';
import registerFlow from './flows/register.js';
import exchangeFlow from './flows/exchange.js';
import { 
    initializeDatabase, 
    getAllUserIds, 
    findUserById,
    getTransactionHistory // <-- Importamos la nueva función
} from './db.js';
import 'dotenv/config';

const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({
    defaultSession: () => ({ flow: null, step: null })
}));

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const isRegistered = await findUserById(userId);

    let welcomeMessage;
    let keyboard;

    if (isRegistered) {
        welcomeMessage = `¡Hola de nuevo, ${ctx.from.first_name}! 👋 ¿Qué deseas hacer hoy?`;
        keyboard = Markup.keyboard([
            ['💹 Realizar Cambio', '📜 Mi Historial'],
            ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
        ]).resize();
    } else {
        welcomeMessage = '¡Hola! 👋 Soy tu asistente de exchange. Para comenzar, por favor, regístrate.';
        keyboard = Markup.keyboard([
            ['👤 Registrarme', 'ℹ️ Ayuda']
        ]).resize();
    }

    ctx.reply(welcomeMessage, keyboard);
});

// --- COMANDO DE HISTORIAL IMPLEMENTADO ---
const handleHistory = async (ctx) => {
    const userId = ctx.from.id;
    if (!(await findUserById(userId))) {
        return ctx.reply('Debes registrarte para poder ver tu historial.');
    }

    const history = await getTransactionHistory(userId);

    if (history.length === 0) {
        return ctx.reply('📂 No tienes ninguna operación en tu historial todavía.');
    }

    let message = '📜 **Tu Historial de Operaciones Recientes:**\n\n';
    history.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleString('es-ES');
        const icon = tx.transaction_type === 'Comprar' ? '📈' : '📉';
        message += `------------------------------------\n`;
        message += `${icon} **Tipo:** ${tx.transaction_type}\n`;
        message += `💰 **Monto:** $${tx.total_usd}\n`;
        message += `🔵 **Estado:** ${tx.status}\n`;
        message += `📅 **Fecha:** ${date}\n`;
    });

    // Usamos parse_mode 'Markdown' para que los asteriscos se conviertan en negrita.
    ctx.replyWithHTML(message);
};

bot.command('historial', handleHistory);
bot.hears('📜 Mi Historial', handleHistory);


bot.command('help', (ctx) => ctx.reply('Usa los botones del menú para interactuar conmigo.'));
bot.hears('ℹ️ Ayuda', (ctx) => ctx.reply('Usa los botones del menú para interactuar conmigo.'));

bot.command('broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply('❌ No tienes permiso para usar este comando.');
    }
    const message = ctx.message.text.slice('/broadcast'.length).trim();
    if (!message) {
        return ctx.reply('Por favor, escribe el mensaje. Ejemplo: `/broadcast ¡Hola!`');
    }
    broadcastMessage(ctx, message);
});

bot.hears('👤 Registrarme', (ctx) => registerFlow.start(ctx));
bot.hears('💹 Realizar Cambio', async (ctx) => {
    if (!(await findUserById(ctx.from.id))) {
        return ctx.reply('Debes registrarte primero. Usa el botón "Registrarme".');
    }
    exchangeFlow.start(ctx);
});

bot.on('text', (ctx) => {
    const text = ctx.message.text;
    if (ctx.session?.flow === 'register') registerFlow.handle(ctx);
    else if (ctx.session?.flow === 'exchange') exchangeFlow.handle(ctx);
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
    ctx.reply(`✅ Envío completado.\n\nExitosos: ${successCount}\nErrores: ${errorCount}`);
}

async function startBot() {
    await initializeDatabase();
    bot.launch(() => {
        console.log('Bot started successfully!');
    });
}

startBot();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
