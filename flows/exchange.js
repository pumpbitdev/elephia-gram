
import { Markup } from 'telegraf';
import Tesseract from 'tesseract.js';

const TASA_BOLIVAR = 196;
const COMISION_USD = 1;

const exchangeFlow = {
    start: (ctx) => {
        ctx.session.flow = 'exchange';
        ctx.session.step = 'action';
        ctx.reply('🏦 ¡Bienvenido al módulo de cambio! ¿Qué operación deseas realizar hoy?', Markup.keyboard([
            ['📈 Comprar Zinli', '📉 Vender Zinli']
        ]).resize());
    },
    handle: (ctx) => {
        switch (ctx.session.step) {
            case 'action':
                ctx.session.action = ctx.message.text.includes('Comprar') ? 'Comprar' : 'Vender';
                ctx.session.step = 'select_amount';
                ctx.reply(`Perfecto. ¿Qué cantidad de saldo Zinli deseas ${ctx.session.action.toLowerCase()}?`, Markup.keyboard([
                    ['$1', '$5', '$10'],
                    ['$20', '$50', '$100'],
                    ['Otro monto']
                ]).resize());
                break;

            case 'select_amount':
                if (ctx.message.text === 'Otro monto') {
                    ctx.session.step = 'custom_amount';
                    ctx.reply('Por favor, ingresa el monto en USD que deseas cambiar:');
                } else {
                    const amount = parseInt(ctx.message.text.replace('$', ''));
                    if (isNaN(amount)) {
                        ctx.reply('Por favor, selecciona un monto válido del teclado.');
                        return;
                    }
                    ctx.session.amount = amount;
                    // Procede a la confirmación
                    showConfirmation(ctx);
                    ctx.session.step = 'confirm';
                }
                break;

            case 'custom_amount':
                const customAmount = parseInt(ctx.message.text);
                if (isNaN(customAmount) || customAmount <= 0) {
                    ctx.reply('Monto inválido. Por favor, ingresa un número mayor a cero.');
                    return;
                }
                ctx.session.amount = customAmount;
                showConfirmation(ctx);
                ctx.session.step = 'confirm';
                break;

            case 'confirm':
                if (ctx.message.text.includes('Sí')) {
                    ctx.session.step = 'payment';
                    ctx.reply('💸 ¡Genial! Para continuar, por favor, realiza el pago y envíame una captura de pantalla del comprobante.');
                    // Aquí podrías añadir los detalles de la cuenta de pago.
                } else {
                    ctx.session.flow = null;
                    ctx.session.step = null;
                    ctx.reply('❌ Operación cancelada. Si cambias de opinión, aquí estaré para ayudarte.');
                }
                break;

            case 'payment':
                if (!ctx.message.photo) {
                    ctx.reply('Por favor, envíame una imagen del comprobante de pago.');
                    return;
                }
                ctx.reply('🤖 Procesando tu comprobante... Esto puede tardar un momento, por favor espera.');
                const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                ctx.telegram.getFileLink(fileId).then(url => {
                    Tesseract.recognize(
                        url.href,
                        'eng',
                        { logger: m => console.log(m) }
                    ).then(({ data: { text } }) => {
                        console.log('Resultado de Tesseract:', text);
                        ctx.session.flow = null;
                        ctx.session.step = null;
                        ctx.reply('✅ ¡Pago recibido! Hemos creado tu orden y se encuentra en estado "pendiente". Te notificaremos tan pronto como sea procesada. 🚀');
                    });
                });
                break;
        }
    }
};

// Función auxiliar para mostrar el resumen de la operación
function showConfirmation(ctx) {
    const amountToReceive = ctx.session.amount;
    const totalInUSD = amountToReceive + COMISION_USD;
    const totalInBolivares = totalInUSD * TASA_BOLIVAR;

    ctx.reply(
        `🧾 **Resumen de tu Operación** 🧾\n\n` +
        `Acción: ${ctx.session.action} Zinli\n\n` +
        `💰 Monto a recibir: **$${amountToReceive.toFixed(2)} USD**\n` +
        `➕ Comisión del servicio: **$${COMISION_USD.toFixed(2)} USD**\n\n` +
        `-------------------------------------\n` +
        `💵 **Total a Pagar (USD): $${totalInUSD.toFixed(2)}**\n` +
        `🇻🇪 **Total a Pagar (Bs.): ${totalInBolivares.toFixed(2)}**\n` +
        `-------------------------------------\n\n` +
        `¿Confirmas que los datos son correctos?`,
        Markup.keyboard([
            ['👍 Sí, confirmar', '👎 No, cancelar']
        ]).resize()
    );
}

export default exchangeFlow;
