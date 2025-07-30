import { Controller } from './Controller.js';
import { Whatsapp } from '../../services/meta/Whatsapp.js';
import { SaveProject } from '../../application/SaveProject.js';
import { getRepositories } from '../../config/RepositoryProvider.js';
import { OpenAiApi } from '../../services/ai-service/openAiApiService.js';
import fs from 'fs';

export class ChatbotController extends Controller {

    constructor() {
        super();
        this.whatsapp = new Whatsapp();
        this.openAiApi = new OpenAiApi();
        this.conversations = {};
    }

    index = async (req, res) => {
        const { conversationRepo } = await getRepositories();
        this.conversationRepository = conversationRepo;
        this.saveProject = new SaveProject(this.conversationRepository, this.whatsapp);
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const text = message.text?.body?.trim();

            if (!this.conversations[from]) {
                this.conversations[from] = {
                    step: 0,
                    data: {}
                };
                // await sendWhatsAppMessage(from, '👋 ¡Hola! ¿Cuál es tu nombre?');
                await this.whatsapp.sendMessage(from, '👋 ¡Hola! ¿Cuál es tu nombre?');
                // await sendWhatsAppMessage(from, text);
                // await this.whatsapp.sendMessage(from, text);
            } else {
                const user = this.conversations[from];

                switch (user.step) {
                    case 0:
                        user.data.phone = from;
                        user.data.name = text;
                        user.step++;
                        // await sendWhatsAppMessage(from, '📧 ¿Cuál es tu correo electrónico?');
                        await this.whatsapp.sendMessage(from, '📧 ¿Cuál es tu correo electrónico?');
                        break;
                    case 1:
                        user.data.contactPhone = text;
                        user.step++;
                        // await sendWhatsAppMessage(from, '📲 ¿Cuál es tu teléfono de contacto?');
                        await this.whatsapp.sendMessage(from, '📲 ¿Cuál es tu teléfono de contacto?');
                        break;
                    case 2:
                        user.data.email = text;
                        user.step++;
                        // await sendWhatsAppMessage(from, '🏢 ¿Cuál es tu empresa?');
                        await this.whatsapp.sendMessage(from, '🏢 ¿Cuál es tu empresa?');
                        break;
                    case 3:
                        user.data.company = text;
                        user.step++;
                        // await sendWhatsAppMessage(from, "🛠️ ¿Qué tipo de servicio requieres?\n1. Desarrollo de software\n2. Ciberseguridad");
                        await this.whatsapp.sendMessage(from, "🛠️ ¿Qué tipo de servicio requieres?\n1. Desarrollo de software\n2. Ciberseguridad");
                        break;
                    case 4:
                        user.data.projectType = text === '1' ? 'Desarrollo de software' : 'Ciberseguridad';
                        user.step++;
                        // await sendWhatsAppMessage(from, '📝 Describe brevemente tu proyecto:');
                        await this.whatsapp.sendMessage(from, '📝 Describe brevemente tu proyecto:');
                        break;
                    case 5:
                        user.data.description = text;
                        user.step++;

                        const response = await this.openAiApi.consulta_gpt(text, from);
                        await this.whatsapp.sendMessage(from, response);

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ response }, null, 2) + '\n');

                        await this.conversationRepository.save(user.data)
                        // delete this.conversations[from];
                        break;
                    default:
                        const responses = await this.openAiApi.consulta_gpt(text, from);
                        await this.whatsapp.sendMessage(from, responses);

                        // fs.appendFileSync('conversaciones-chatgpt.txt', JSON.stringify({ responses }, null, 2) + '\n');

                        break;
                }
            }
        }

        // return res.sendStatus(200);
        this.sendResponse(res);
    }

    verify = async (req, res) => {
        const VERIFY_TOKEN = 'miverifytoken';
        const WHATSAPP_TOKEN = 'EAAPTG5tZAfuoBPG9iIafFqiveruwRwtsOVU6SKPZAwYlx0jTZBT4JXcISlSeKcUWPXBdlS4IZAa1JeHW0gHSbY3ucZAw2Lzqy0dv5ZADIM0iNiSDUsHQFfzeRfBjlnRZBJqaGefcd305mJgHPyvzgGMHistvQyihBIPPpVwLiXaZBUyLEwfpxVZCmNArKsO8siIxrftYKNz13k8vZBUyh2weEmk3j5HmoT8ZCacouDwiwuZAo0n1RaSwJmpoWCvSz7HRNLsZD';
        const PHONE_NUMBER_ID = '103168086004644';
        const conversations = {};

        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        fs.appendFileSync('hook_test.txt', `Wessbhook llamado: GET\n`);

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente.');
            return res.status(200).send(challenge);
        } else {
            console.log('❌ Verificación fallida.');
            // return res.sendStatus(403);
            this.sendError(res, "Error", 403);
        }
    }

}