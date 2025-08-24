
import { Markup } from 'telegraf';
import { addPaymentMethod, getPaymentMethodsForUser } from '../db.js';

const paymentMethodsFlow = {
    // --- Punto de entrada principal ---
    start: (ctx) => {
        ctx.session.flow = 'payment_methods';
        ctx.session.step = 'menu';
        
        showMenu(ctx);
    },

    // --- Manejador de todas las respuestas dentro del flujo ---
    handle: async (ctx) => {
        const step = ctx.session.step;

        switch (step) {
            case 'add_method_type':
                handleMethodTypeSelection(ctx);
                break;
            case 'add_nickname':
                ctx.session.paymentData.nickname = ctx.message.text;
                askForDetails(ctx);
                break;
            case 'add_details_paypal_zinli':
                ctx.session.paymentData.account_details = ctx.message.text;
                await savePaymentMethod(ctx);
                break;
            case 'add_details_pm_identity':
                ctx.session.paymentData.pm_identity_card = ctx.message.text;
                ctx.session.step = 'add_details_pm_phone';
                ctx.reply('Ahora, ingresa el número de teléfono afiliado al Pago Móvil:');
                break;
            case 'add_details_pm_phone':
                ctx.session.paymentData.pm_phone_number = ctx.message.text;
                ctx.session.step = 'add_details_pm_bank';
                ctx.reply('Finalmente, escribe el nombre de tu banco:');
                break;
            case 'add_details_pm_bank':
                ctx.session.paymentData.pm_bank_name = ctx.message.text;
                await savePaymentMethod(ctx);
                break;
        }
    }
};

// --- Funciones auxiliares del flujo ---

// Muestra el menú principal con los métodos de pago existentes y opciones
async function showMenu(ctx) {
    const userId = ctx.from.id;
    const methods = await getPaymentMethodsForUser(userId);

    let message = '💳 **Gestión de Métodos de Pago**\n\n';
    if (methods.length === 0) {
        message += 'Aún no tienes ningún método de pago guardado.';
    } else {
        message += 'Aquí están tus métodos de pago guardados:\n';
        methods.forEach(method => {
            message += `\n- **${method.nickname}** (${method.method_type})`;
        });
    }

    ctx.reply(message, Markup.keyboard([
        ['➕ Añadir Nuevo Método'],
        ['⬅️ Volver al Menú Principal']
    ]).resize());
}

// Maneja la selección del tipo de método a añadir
function handleMethodTypeSelection(ctx) {
    const selection = ctx.message.text;
    if (!['PayPal', 'Zinli', 'Pago Móvil'].includes(selection)) {
        ctx.reply('Por favor, selecciona una opción válida del teclado.');
        return;
    }
    
    // Inicializamos el objeto que guardará los datos
    ctx.session.paymentData = { method_type: selection.replace(' ', '') };
    ctx.session.step = 'add_nickname';
    ctx.reply(`Perfecto. Dale un apodo o alias a este método de pago para que lo reconozcas fácilmente (Ej: "PayPal Personal", "Zinli de Mamá").`);
}

// Pregunta por los detalles específicos según el tipo de método
function askForDetails(ctx) {
    const type = ctx.session.paymentData.method_type;
    if (type === 'PayPal' || type === 'Zinli') {
        ctx.session.step = 'add_details_paypal_zinli';
        ctx.reply(`Ingresa el correo electrónico asociado a tu cuenta de ${type}:`);
    } else if (type === 'PagoMovil') {
        ctx.session.step = 'add_details_pm_identity';
        ctx.reply('Ahora, ingresa tu número de Cédula de Identidad (V/E):');
    }
}

// Guarda el método de pago en la BD y finaliza el flujo
async function savePaymentMethod(ctx) {
    await addPaymentMethod(ctx.from.id, ctx.session.paymentData);
    
    ctx.reply('✅ ¡Método de pago guardado exitosamente!');

    // Limpiar y salir del flujo
    ctx.session.flow = null;
    ctx.session.step = null;
    ctx.session.paymentData = null;
    
    // Regresar al menú principal de la app
    // (Simulamos un /start para mostrar el teclado principal)
    ctx.reply('¿Qué deseas hacer ahora?', Markup.keyboard([
        ['💹 Realizar Cambio', '📜 Mi Historial'],
        ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
    ]).resize());
}


export default paymentMethodsFlow;
