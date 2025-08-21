
import { createWorker } from 'tesseract.js';
import path from 'path';

/**
 * Procesa una imagen para extraer texto y buscar un número de referencia o de operación.
 * @param {string} imagePath - La ruta local al archivo de imagen.
 * @returns {Promise<{success: boolean, referenceId: string|null, error: string|null}>} 
 *          Un objeto indicando el éxito, el ID encontrado (o null), y un mensaje de error (o null).
 */
async function processPaymentImage(imagePath) {
    console.log(`[ImageService] Procesando imagen: ${imagePath}`);

    const worker = await createWorker('spa'); // Usamos 'spa' para español

    try {
        const { data: { text } } = await worker.recognize(imagePath);
        console.log(`[ImageService] Texto extraído:\n---\n${text}\n---`);

        // Expresión regular combinada para múltiples formatos de banco.
        // Busca "referencia" U "operacion" y captura el número siguiente.
        const combinedRegex = /(?:(?:n[uú]mero\sde\s)?referencia|operaci[oó]n):?\s*(\d{6,20})/i;
        
        const match = text.match(combinedRegex);

        if (match && match[1]) {
            const referenceId = match[1];
            console.log(`[ImageService] ¡Éxito! Número de referencia encontrado: ${referenceId}`);
            return { success: true, referenceId: referenceId, error: null };
        } else {
            console.log('[ImageService] Error: No se pudo encontrar un número de referencia válido.');
            return { success: false, referenceId: null, error: 'No se pudo encontrar un número de referencia en el comprobante.' };
        }

    } catch (error) {
        console.error('[ImageService] Error procesando la imagen con Tesseract:', error);
        return { success: false, referenceId: null, error: 'Hubo un error técnico al leer la imagen.' };
    } finally {
        await worker.terminate();
    }
}

export { processPaymentImage };
