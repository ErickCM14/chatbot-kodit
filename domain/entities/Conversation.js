export class Conversation {
  constructor({ phone, name, email, contactPhone, company, projectType, description, messages }) {
    if (!phone || !email || !projectType) throw new Error("Datos obligatorios faltantes");
    this.phone = phone;
    this.name = name;
    this.email = email;
    this.contactPhone = contactPhone;
    this.company = company;
    this.projectType = projectType;
    this.description = description;
    this.messages = messages;
  }
}