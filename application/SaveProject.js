export class SaveProject {
    constructor(ConversationRepo, Whatsapp) {
        this.conversationRepo = ConversationRepo;
        this.whatsapp = Whatsapp;
    }

    async execute(projectData) {
        return this.conversationRepo.save(projectData);
    }
}