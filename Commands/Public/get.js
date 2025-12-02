const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("get")
        .setDescription("Descarga un video de Instagram, TikTok u otras plataformas")
        .addStringOption(option =>
            option
                .setName("url")
                .setDescription("La URL del video que quieres descargar")
                .setRequired(true)
        ),
    
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        // Defer la respuesta porque puede tardar
        await interaction.deferReply();

        const url = interaction.options.getString("url");

        try {
            // Validar que sea una URL válida
            new URL(url);

            // Construir la URL de la API
            const apiUrl = `https://api-telegram-bot-l4m4.onrender.com/api/v1/download?postUrl=${encodeURIComponent(url)}`;

            // Enviar embed de espera
            const waitingEmbed = new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle("⏳ Descargando video...")
                .setDescription("Por favor espera, estoy procesando tu solicitud. Esto puede tardar un momento.")
                .setTimestamp();

            await interaction.editReply({ embeds: [waitingEmbed] });

            console.log("Haciendo petición a:", apiUrl);

            // Hacer la petición a la API - LA API DEVUELVE EL VIDEO DIRECTAMENTE
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer', // IMPORTANTE: Recibir como binario
                timeout: 180000, // 3 minutos de timeout
                maxContentLength: 50 * 1024 * 1024, // 50MB máximo
                validateStatus: function (status) {
                    return status < 500;
                }
            });

            console.log("Status de respuesta:", response.status);
            console.log("Content-Type:", response.headers['content-type']);
            console.log("Content-Length:", response.headers['content-length']);

            // Verificar si la respuesta fue exitosa
            if (response.status !== 200) {
                throw new Error(`La API respondió con código ${response.status}`);
            }

            // Convertir la respuesta a Buffer
            const videoBuffer = Buffer.from(response.data);
            const fileSizeMB = videoBuffer.length / (1024 * 1024);

            console.log("Video descargado exitosamente!");
            console.log("Tamaño del video:", fileSizeMB.toFixed(2), "MB");

            // Verificar el tamaño del archivo (Discord tiene límite de 25MB para servidores normales)
            if (fileSizeMB > 25) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#FF6B00")
                    .setTitle("⚠️ Video muy grande")
                    .setDescription(`El video pesa **${fileSizeMB.toFixed(2)} MB**, lo cual excede el límite de Discord (25 MB).`)
                    .addFields(
                        { name: "💡 Sugerencia", value: "Intenta con un video más corto o de menor calidad.", inline: false },
                        { name: "URL Original", value: url, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

                await interaction.editReply({ 
                    embeds: [errorEmbed]
                });
                return;
            }

            // Determinar la extensión del archivo basándose en el Content-Type
            let extension = '.mp4'; // Por defecto MP4
            const contentType = response.headers['content-type'];
            
            if (contentType) {
                if (contentType.includes('video/mp4')) extension = '.mp4';
                else if (contentType.includes('video/quicktime')) extension = '.mov';
                else if (contentType.includes('video/mpeg')) extension = '.mpeg';
                else if (contentType.includes('video/webm')) extension = '.webm';
                else if (contentType.includes('video/x-msvideo')) extension = '.avi';
            }

            // Crear el attachment con el video
            const fileName = `video_${Date.now()}${extension}`;
            const attachment = new AttachmentBuilder(videoBuffer, { 
                name: fileName 
            });

            // Crear embed de éxito
            const successEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle("✅ Video descargado exitosamente")
                .setDescription(`Tu video está listo para disfrutar.`)
                .addFields(
                    { name: "📦 Tamaño", value: `${fileSizeMB.toFixed(2)} MB`, inline: true },
                    { name: "📁 Formato", value: extension.toUpperCase(), inline: true },
                    { name: "🔗 URL Original", value: url, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

            // Enviar el video con el embed
            await interaction.editReply({ 
                embeds: [successEmbed],
                files: [attachment]
            });

            console.log("Video enviado exitosamente a Discord!");

        } catch (error) {
            console.error("Error en el comando /get:", error);

            let errorMessage = "Hubo un error al procesar tu solicitud.";
            let errorDetails = "";

            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                errorMessage = "⏱️ La solicitud tardó demasiado tiempo.";
                errorDetails = "La API podría estar ocupada, el video podría ser muy grande, o la plataforma está bloqueando la descarga.";
            } else if (error.message && error.message.includes("Invalid URL")) {
                errorMessage = "🔗 La URL proporcionada no es válida.";
                errorDetails = "Verifica que hayas copiado la URL completa correctamente.";
            } else if (error.response) {
                errorMessage = `❌ Error de la API: ${error.response.status}`;
                errorDetails = error.response.statusText || "La API no pudo procesar la solicitud.";
            } else if (error.message) {
                errorMessage = "❌ Error al procesar el video";
                errorDetails = error.message;
            }

            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setTitle(errorMessage)
                .setDescription(errorDetails)
                .addFields(
                    { name: "🔗 URL proporcionada", value: url, inline: false },
                    { 
                        name: "💡 Plataformas compatibles", 
                        value: "Instagram, TikTok, Twitter/X, Facebook, YouTube y más.", 
                        inline: false 
                    },
                    {
                        name: "🔍 Consejos",
                        value: "• Asegúrate de que el video sea público\n• Verifica que la URL esté completa\n• Intenta con un video diferente",
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed], content: null });
        }
    }
};