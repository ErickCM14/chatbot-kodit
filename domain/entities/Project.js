export class Project {
  constructor({ phone, name, email, contactPhone, company, projectType, description }) {
    if (!phone || !email || !projectType) throw new Error("Missing mandatory data");
    this.phone = phone;
    this.name = name;
    this.email = email;
    this.contactPhone = contactPhone;
    this.company = company;
    this.projectType = projectType;
    this.description = description;
  }
}