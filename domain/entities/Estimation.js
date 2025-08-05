export class Estimation {
  constructor({ phone, description, total_costo, total_horas, modulos, createdAt }) {
    if (!phone) throw new Error("Missing mandatory data");
    this.phone = phone;
    this.description = description;
    this.total_costo = total_costo;
    this.total_horas = total_horas;
    this.modulos = modulos;
    this.createdAt = createdAt;
  }
}