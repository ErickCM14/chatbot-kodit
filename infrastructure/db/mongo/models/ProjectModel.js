import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  name: String,
  email: String,
  contactPhone: String,
  company: String,
  projectType: String,
  description: String,
}, { timestamps: true });

export const ProjectModel = mongoose.model("Project", ProjectSchema);
