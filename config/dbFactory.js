import { mongoClient } from "../infrastructure/db/mongo/connection.js";
import { ProjectModel } from "../infrastructure/db/mongo/models/ProjectModel.js";
import { ConversationModel } from "../infrastructure/db/mongo/models/ConversationModel.js";
import { MongoProjectRepository } from "../infrastructure/db/mongo/repositories/MongoProjectRepository.js";
import { MongoConversationRepository } from "../infrastructure/db/mongo/repositories/MongoConversationRepository.js";


const DB_ENGINE = process.env.DB_ENGINE || "mongo"; // o "postgres"

export async function createRepository() {
  switch (DB_ENGINE) {
    case "mongo":
      await mongoClient.connect();
      // return new MongoRepository(mongoClient, process.env.MONGO_DB, "chatbot");
      return {
        projectRepo: new MongoProjectRepository(ProjectModel),
        conversationRepo: new MongoConversationRepository(ConversationModel),
      };

    // case "postgres":
    //   return new PostgresRepository(postgresPool);

    default:
      throw new Error(`Database engine not soported: ${DB_ENGINE}`);
  }
}
