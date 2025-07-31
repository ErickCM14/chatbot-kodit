export class SaveProject {
    constructor(ConversationRepo, Whatsapp, Conversations, OpenAiApi) {
        this.conversationRepo = ConversationRepo;
        this.whatsapp = Whatsapp;
        this.conversations = Conversations;
        this.openAiApi = OpenAiApi;
    }

    async execute(message) {
        const from = message.from;
        try {
            const text = message.text?.body?.trim();

            if (!this.conversations[from]) {
                this.conversations[from] = {
                    step: 0,
                    data: {}
                };
                await this.whatsapp.sendMessage(from, "👋 ¡Hola! Gracias por contactarnos, para poder ayudarte con tu proyecto, necesito recopilar un poco de información.\n\n¿Cuál es tu nombre?");
            } else {
                const user = this.conversations[from];

                switch (user.step) {
                    case 0:
                        if (!text || text.length < 2) {
                            await this.whatsapp.sendMessage(from, "❗Por favor, escribe un nombre válido.");
                            break;
                        }
                        user.data.phone = from;
                        user.data.name = text;
                        user.step++;
                        await this.whatsapp.sendMessage(from, '📧 ¿Cuál es tu correo electrónico?');
                        break;
                    case 1:
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
                            await this.whatsapp.sendMessage(from, "❗Ese correo no es válido. Por favor, escribe un correo electrónico válido.");
                            break;
                        }
                        user.data.email = text;
                        user.step++;
                        await this.whatsapp.sendMessage(from, '📲 ¿Cuál es tu teléfono de contacto?');
                        break;
                    case 2:
                        if (!/^\+?\d{10,15}$/.test(text)) {
                            await this.whatsapp.sendMessage(from, "❗El número ingresado no es válido. Por favor, ingresa un número de teléfono válido (con o sin +).");
                            break;
                        }
                        user.data.contactPhone = text;
                        user.step++;
                        await this.whatsapp.sendMessage(from, '🏢 ¿Cuál es tu empresa?');
                        break;
                    case 3:
                        if (!text || text.length < 2) {
                            await this.whatsapp.sendMessage(from, "❗Por favor, escribe un nombre de empresa válido.");
                            break;
                        }
                        user.data.company = text;
                        user.step++;
                        await this.whatsapp.sendMessage(from, "🛠️ ¿Qué tipo de servicio requieres?\n1. Desarrollo de software\n2. Ciberseguridad");
                        break;
                    case 4:
                        if (text !== '1' && text !== '2') {
                            await this.whatsapp.sendMessage(from, "❗Por favor, escribe '1' o '2' para elegir una opción válida.");
                            break;
                        }
                        user.data.projectType = text === '1' ? 'Desarrollo de software' : 'Ciberseguridad';
                        user.step++;
                        await this.whatsapp.sendMessage(from, '📝 Describe brevemente tu proyecto:');
                        break;
                    case 5:
                        if (!text || text.length < 10) {
                            await this.whatsapp.sendMessage(from, "❗Por favor, escribe una descripción un poco más detallada del proyecto.");
                            break;
                        }
                        user.data.description = text;
                        user.step++;

                        const response = await this.openAiApi.consulta_gpt(text, from);
                        await this.whatsapp.sendMessage(from, response);

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ response }, null, 2) + '\n');

                        await this.conversationRepo.save(user.data)
                        delete this.conversations[from];
                        break;
                    default:
                        const responses = await this.openAiApi.consulta_gpt(text, from);
                        await this.whatsapp.sendMessage(from, responses);

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ responses }, null, 2) + '\n');
                        break;
                }
            }
            return true;
        } catch (error) {
            console.error(error);
            // await this.whatsapp.sendMessage(from, error.message);
            throw new Error(error.message);
        }
    }
}