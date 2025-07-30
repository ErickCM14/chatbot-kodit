import { ProjectRepository } from "../../../../domain/interfaces/ProjectRepository.js";
import { BaseRepository } from "./BaseRepository.js";

export class MongoProjectRepository extends ProjectRepository {
    constructor(model) {
        super();
        this.base = new BaseRepository(model);
    }

    async saveProject(projectData) {
        const existing = await this.base.findOne({ phone: projectData.phone });
        if (existing) {
            return this.base.update(existing._id, projectData);
        }
        return this.base.create(projectData);
    }

    async getProjectByNumber(phone) {
        return this.base.findOne({ phone });
    }
}
