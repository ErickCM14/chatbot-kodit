import { ConversationRepository } from "../../../../domain/interfaces/ConversationRepository.js";
import { BaseRepository } from "./BaseRepository.js";

export class MongoConversationRepository extends ConversationRepository {
    constructor(model) {
        super();
        this.model = model;
        this.base = new BaseRepository(model);
    }

    async save(projectData) {
        const existing = await this.base.findOne({ phone: projectData.phone });
        if (existing) {
            return this.base.update(existing._id, projectData);
        }
        return this.base.create(projectData);
    }

    async getConversationByPhone(phone) {
        const conversation = await this.base.findOne({ phone });
        if (!conversation || !conversation.mensajes) {
            return [];
        }

        // Convertir el formato de mensajes para que sea compatible con OpenAI
        return conversation.mensajes.map(msg => ({
            role: msg.rol,
            content: msg.mensaje
        }));
    }

    async saveMessage(phone, role, message) {
        const now = new Date();

        const existing = await this.base.findOne({ phone });
        const newMessage = { role, message, timestamp: now };

        if (existing) {
            await this.model.updateOne(
                { phone },
                {
                    $push: { messages: newMessage },
                    $set: { updatedAt: now }
                }
            );
        } else {
            await this.base.create({
                phone,
                messages: [newMessage],
                createdAt: now,
                updatedAt: now
            });
        }
    }
}
