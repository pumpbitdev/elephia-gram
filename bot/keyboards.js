
import { Markup } from 'telegraf';

// Teclado para el menú principal de un usuario registrado
export const mainKeyboard = Markup.keyboard([
    ['💹 Realizar Cambio', '📜 Mi Historial'],
    ['💳 Mis Métodos de Pago', 'ℹ️ Ayuda']
]).resize();

// Teclado para el menú de un usuario no registrado
export const unegisteredKeyboard = Markup.keyboard([
    ['👤 Registrarme', 'ℹ️ Ayuda']
]).resize();

// Teclado para cancelar una operación en un flujo
export const cancelKeyboard = Markup.keyboard([
    ['⬅️ Cancelar']
]).resize();
