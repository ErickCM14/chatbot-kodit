export class SaveProject {
    constructor(ConversationRepo, Whatsapp, Conversations, OpenAiApi, OptionsEnum, Prompts) {
        this.conversationRepo = ConversationRepo;
        this.whatsapp = Whatsapp;
        this.conversations = Conversations;
        this.openAiApi = OpenAiApi;
        this.enumProjects = OptionsEnum;
        this.prompts = Prompts;
    }

    async execute(message) {
        const from = message.from;
        try {
            const projectTypeText = "🛠️ ¿Qué tipo de servicio requieres?\n1. Desarrollo de software\n2. Fábrica de software\n3. Ciberseguridad\n4. Inteligencia Artificial\n5. Consultoria TI";
            const text = message.text?.body?.trim();

            if (!this.conversations[from]) {

                const conversation = await this.conversationRepo.findOne({ phone: from });
                if (!conversation) {
                    this.conversations[from] = {
                        step: 0,
                        data: {}
                    };
                    await this.whatsapp.sendMessage(from, "👋 ¡Hola! Gracias por contactarnos, para poder ayudarte con tu proyecto, necesito recopilar un poco de información.\n\n¿Cuál es tu nombre?");
                } else {
                    await this.whatsapp.sendMessage(from, "👋 ¡Hola, " + conversation.name + "! un gusto verte de nuevo por aquí, estos son tus datos anteriormente guardados:\n\nNombre: " + conversation.name + "\nCorreo: " + conversation.email + "\nTeléfono de contacto: " + conversation.contactPhone + "\nEmpresa: " + conversation.company + "\n\n¿Deseas modificarlos o quieres continuar?\n1. Continuar\n2. Modificar");
                    this.conversations[from] = {
                        step: 0,
                        data: {},
                        modify: 1
                    };
                    this.conversations[from].data.phone = from;
                    this.conversations[from].data.name = conversation.name;
                    this.conversations[from].data.email = conversation.email;
                    this.conversations[from].data.contactPhone = conversation.contactPhone;
                    this.conversations[from].data.company = conversation.company;
                    return true;
                }
            } else {
                const user = this.conversations[from];
                
                if (user.modify && user.modify == '1') {

                    if (text.toString() !== '1' && text.toString() !== '2' && text.toLowerCase() !== 'continuar' && text.toLowerCase() !== 'modificar') {
                        await this.whatsapp.sendMessage(from, "❗Por favor, elige una opción válida:\n1-2 o escribe el nombre de la acción.");
                        return true;
                    }

                    const option = text == '1' || text.toLowerCase() == 'continuar' ? '1' : '2';

                    switch (option) {
                        case '1':
                            user.step = 4;
                            await this.whatsapp.sendMessage(from, projectTypeText);
                            break;
                        case '2':
                            await this.whatsapp.sendMessage(from, "¿Cuál es tu nombre?");
                            break;

                        default:
                            await this.whatsapp.sendMessage(from, "❗Por favor, elige una opción válida:\n1-2 o escribe el nombre de la acción.");
                            break;
                    }
                    delete user.modify;
                    return true;
                }

                if (user.modify) {
                    return true;
                }

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
                        await this.whatsapp.sendMessage(from, projectTypeText);
                        break;
                    case 4:
                        const normalizedText = this.normalizeText(text.toString());
                        if (this.enumProjects[text.toString()]) {
                            user.data.projectType = this.enumProjects[text.toString()];
                        } else {
                            const matchedOption = Object.values(this.enumProjects).find(
                                option => this.normalizeText(option) === normalizedText
                            );

                            if (matchedOption) {
                                user.data.projectType = matchedOption;
                            } else {
                                await this.whatsapp.sendMessage(from, "❗Por favor, elige una opción válida:\n1-5 o escribe el nombre del servicio.");
                                break;
                            }
                        }
                        // if (text !== '1' && text !== '2') {
                        //     await this.whatsapp.sendMessage(from, "❗Por favor, escribe '1' o '2' para elegir una opción válida.");
                        //     break;
                        // }
                        // user.data.projectType = text === '1' ? 'Desarrollo de software' : 'Ciberseguridad';
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

                        const response = await this.openAiApi.query(text, from, this.prompts[user.data.projectType]);
                        await this.whatsapp.sendMessage(from, response.data);

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ response }, null, 2) + '\n');

                        await this.conversationRepo.save(user.data)
                        break;
                    default:
                        const responses = await this.openAiApi.query(text, from, this.prompts[user.data.projectType], user.data);

                        await this.whatsapp.sendMessage(from, responses.data);
                        if (responses.updateStatus) {
                            delete this.conversations[from];
                        }

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ responses }, null, 2) + '\n');
                        break;
                }
            }
            return true;
        } catch (error) {
            console.error(error);
            return true;
            // await this.whatsapp.sendMessage(from, error.message);
            throw new Error(error.message);
        }
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }
}