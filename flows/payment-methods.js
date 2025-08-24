
import { Markup } from 'telegraf';
import { addPaymentMethod, getPaymentMethodsForUser } from '../db.js';

const paymentMethodsFlow = {
    start: (ctx) => {
        ctx.session.flow = 'payment_methods';
        ctx.session.step = 'menu';
        showMenu(ctx);
    },

    handle: async (ctx) => {
        const text = ctx.message.text;
        const step = ctx.session.step;

        // Opción para cancelar en cualquier momento
        if (text === '⬅️ Cancelar') {
            ctx.session.flow = null;
            ctx.session.step = null;
            ctx.session.paymentData = null;
            // Mostramos el menú principal de un usuario registrado
            ctx.reply('Operación cancelada. Volviendo al menú principal.', Markup.keyboard([
                ['💹 Realizar Cambio', '📜 Mi Historial'],
                ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
            ]).resize());
            return;
        }

        switch (step) {
            // --- ESTE ES EL CASO QUE FALTABA ---
            case 'menu':
                if (text === '➕ Añadir Nuevo Método') {
                    ctx.session.step = 'add_method_type';
                    ctx.reply('Selecciona el tipo de método de pago que deseas añadir:', Markup.keyboard([
                        ['PayPal', 'Zinli', 'Pago Móvil'],
                        ['⬅️ Cancelar']
                    ]).resize());
                } else if (text === '⬅️ Volver al Menú Principal') {
                    ctx.session.flow = null; // Salimos del flujo
                    // Simulamos /start para mostrar el menú principal
                     ctx.reply('Volviendo al menú principal.', Markup.keyboard([
                        ['💹 Realizar Cambio', '📜 Mi Historial'],
                        ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
                    ]).resize());
                }
                break;

            case 'add_method_type':
                handleMethodTypeSelection(ctx);
                break;
            case 'add_nickname':
                ctx.session.paymentData.nickname = text;
                askForDetails(ctx);
                break;
            case 'add_details_paypal_zinli':
                ctx.session.paymentData.account_details = text;
                await savePaymentMethod(ctx);
                break;
            case 'add_details_pm_identity':
                ctx.session.paymentData.pm_identity_card = text;
                ctx.session.step = 'add_details_pm_phone';
                ctx.reply('Ahora, ingresa el número de teléfono afiliado al Pago Móvil:');
                break;
            case 'add_details_pm_phone':
                ctx.session.paymentData.pm_phone_number = text;
                ctx.session.step = 'add_details_pm_bank';
                ctx.reply('Finalmente, escribe el nombre de tu banco:');
                break;
            case 'add_details_pm_bank':
                ctx.session.paymentData.pm_bank_name = text;
                await savePaymentMethod(ctx);
                break;
        }
    }
};

// --- Funciones auxiliares (sin cambios, pero incluidas para el contexto) ---

async function showMenu(ctx) {
    const userId = ctx.from.id;
    const methods = await getPaymentMethodsForUser(userId);
    let message = '💳 **Gestión de Métodos de Pago**\n\n';
    if (methods.length === 0) {
        message += 'Aún no tienes ningún método de pago guardado.';
    } else {
        message += 'Tus métodos de pago guardados:\n';
        methods.forEach(method => {
            message += `\n- **${method.nickname}** (${method.method_type})`;
        });
    }
    ctx.replyWithHTML(message, Markup.keyboard([
        ['➕ Añadir Nuevo Método'],
        ['⬅️ Volver al Menú Principal']
    ]).resize());
}

function handleMethodTypeSelection(ctx) {
    const selection = ctx.message.text;
    if (!['PayPal', 'Zinli', 'Pago Móvil'].includes(selection)) {
        ctx.reply('Por favor, selecciona una opción válida del teclado.');
        return;
    }
    ctx.session.paymentData = { method_type: selection.replace(' ', 'PagoMovil') };
    ctx.session.step = 'add_nickname';
    ctx.reply(`Perfecto. Dale un apodo a este método (Ej: "PayPal Personal"):`, Markup.keyboard([['⬅️ Cancelar']]).resize());
}

function askForDetails(ctx) {
    const type = ctx.session.paymentData.method_type;
    if (type === 'PayPal' || type === 'Zinli') {
        ctx.session.step = 'add_details_paypal_zinli';
        ctx.reply(`Ingresa el correo electrónico de tu cuenta ${type}:`);
    } else if (type === 'PagoMovil') {
        ctx.session.step = 'add_details_pm_identity';
        ctx.reply('Ahora, ingresa tu Cédula de Identidad (V/E):');
    }
}

async function savePaymentMethod(ctx) {
    await addPaymentMethod(ctx.from.id, ctx.session.paymentData);
    ctx.reply('✅ ¡Método de pago guardado exitosamente!');
    
    ctx.session.flow = null;
    ctx.session.step = null;
    ctx.session.paymentData = null;
    
    ctx.reply('¿Qué deseas hacer ahora?', Markup.keyboard([
        ['💹 Realizar Cambio', '📜 Mi Historial'],
        ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
    ]).resize());
}

export default paymentMethodsFlow;
