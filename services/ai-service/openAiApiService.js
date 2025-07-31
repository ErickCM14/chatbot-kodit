import OpenAI from "openai";
import { getRepositories } from "../../config/RepositoryProvider.js";
import { PROMPT_GPT } from "./prompts/prompt_gpt.js";
import { BASE_URL_OPENROUTER, OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../../config/constants.js";

export class OpenAiApi {
    constructor() {
        this.base_url_openrouter = BASE_URL_OPENROUTER;
        this.apiKey = OPENROUTER_API_KEY;
        this.model_name = OPENROUTER_MODEL;
        this.openai = new OpenAI({
            baseURL: this.base_url_openrouter,
            apiKey: this.apiKey
        });
    }

    consulta_gpt = async (message, phone, prompt = PROMPT_GPT) => {
        if (!message) {
            throw new Error('Message is required');
        }
        const { conversationRepo } = await getRepositories();
        this.conversationRepository = conversationRepo;

        // Obtener historial del usuario
        const record = await this.conversationRepository.getConversationByPhone(phone);
        let chat_log;
        if (!record || record.length === 0) {
            chat_log = [
                { role: "system", content: prompt },
                { role: "user", content: message }
            ];
        } else {
            chat_log = [{ role: "system", content: prompt }, ...record, { role: "user", content: message }];
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: this.model_name,
                messages: chat_log,
                temperature: 0.1,
            });

            if (
                !completion.choices ||
                !completion.choices[0] ||
                !completion.choices[0].message
            ) {
                throw new Error("Invalid response API OPENROUTER");
            }

            const response = completion.choices[0].message.content;

            // await guardarMensaje(phone, "user", message);
            await this.conversationRepository.saveMessage(phone, "user", message);
            // await guardarMensaje(phone, "assistant", response);
            await this.conversationRepository.saveMessage(phone, "assistant", response);

            return response;
        } catch (error) {
            console.error("Query error IA:", error);
            throw error;
        }
    }
}