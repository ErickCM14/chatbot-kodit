import { Controller } from './Controller.js';
import { getRepositories } from '../../config/RepositoryProvider.js';
import { Whatsapp } from '../../services/meta/Whatsapp.js';
import { OpenAiApi } from '../../services/ai-service/openAiApiService.js';
import { SaveProject } from '../../application/SaveProject.js';
import { VERIFY_TOKEN } from '../../config/constants.js';
// import fs from 'fs';

export class ChatbotController extends Controller {

    constructor() {
        super();
        this.whatsapp = new Whatsapp();
        this.openAiApi = new OpenAiApi();
        this.conversations = {};
        this.verifyToken = VERIFY_TOKEN;
    }

    index = async (req, res) => {
        try {
            const { conversationRepo } = await getRepositories();
            this.conversationRepository = conversationRepo;
            this.saveProject = new SaveProject(this.conversationRepository, this.whatsapp, this.conversations, this.openAiApi);
            
            const entry = req.body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                await this.saveProject.execute(message);
            }

            this.sendResponse(res);
        } catch (error) {
            console.error(error.message);
            this.sendError(res, error.message);
        }
    }

    verify = async (req, res) => {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            // fs.appendFileSync('hook_test.txt', `Wessbhook llamado: GET\n`);

            if (mode === 'subscribe' && token === this.verifyToken) {
                console.log('✅ Webhook verificado correctamente.');
                return res.status(200).send(challenge);
            } else {
                console.log('❌ Verificación fallida.');
                return res.sendStatus(403);
            }
        } catch (error) {
            return res.sendStatus(403);
        }
    }

}