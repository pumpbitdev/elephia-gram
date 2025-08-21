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

    const worker = await createWorker('spa');

    try {
        const { data: { text } } = await worker.recognize(imagePath);
        console.log(`[ImageService] Texto extraído:
---
${text}
---`);

        // --- INICIO DE LA MEJORA ---

        // Expresión regular combinada para múltiples formatos de banco.
        // Busca las palabras clave "referencia" U "operacion" y captura el número siguiente.
        //
        // Desglose del Regex:
        // (?: ... )   - Un grupo que no se captura (para agrupar las opciones).
        // (?:n[uú]mero\sde\s)?referencia - Busca "referencia", opcionalmente precedida por "numero de ".
        // |             - Operador "O".
        // operaci[oó]n - Busca "operacion" u "operación".
        // :?\s*        - Busca un ":" opcional y cero o más espacios.
        // (\d{6,20})  - ¡El grupo importante! Captura una secuencia de 6 a 20 dígitos.
        // i             - Hace que la búsqueda no distinga mayúsculas/minúsculas.
        const combinedRegex = /(?:(?:n[uú]mero\sde\s)?referencia|operaci[oó]n):?\s*(\d{6,20})/i;
        
        const match = text.match(combinedRegex);

        // --- FIN DE LA MEJORA ---

        if (match && match[1]) {
            // El número capturado siempre estará en el índice 1 del array 'match'.
            const referenceId = match[1];
            console.log(`[ImageService] ¡Éxito! Número de referencia/operación encontrado: ${referenceId}`);
            return { success: true, referenceId: referenceId, error: null };
        } else {
            console.log('[ImageService] Error: No se pudo encontrar un número de referencia u operación válido.');
            return { success: false, referenceId: null, error: 'No se pudo encontrar un número de referencia u operación en el comprobante.' };
        }

    } catch (error) {
        console.error('[ImageService] Error procesando la imagen con Tesseract:', error);
        return { success: false, referenceId: null, error: 'Hubo un error técnico al leer la imagen.' };
    } finally {
        await worker.terminate();
    }
}

export { processPaymentImage };