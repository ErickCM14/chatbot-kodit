import axios from 'axios';

export class Whatsapp {
    constructor() {
        this.url = `https://graph.facebook.com/v22.0/`;
    }

    sendMessage = async (to, message) => {
        const WHATSAPP_TOKEN = 'EAAPTG5tZAfuoBPJY27qqyAuHUqBAtcsDqjsdGVoVXfWOoy6KyVouSbyN39a46C2lsnjLAnxMhOdWJfFaFUcuwpGcZArhML0JVzZBH1sm3YVuUstiMbvisePAQoSRRhqAouUaqfbQR1yiulZC0i2G6g1ws7k0BZA93roTvFbRHmIolxb4cfEpZBz4A4QZAluPZAmYvrteZCEcxnP1carz9A5UZCO8KJRQ3Xtcgj5brXrGZC64G2j7GIpJ9OSgmJ7bHZBh5QZDZD';
        const PHONE_NUMBER_ID = '103168086004644';

        try {
            const url = `${this.url}${PHONE_NUMBER_ID}/messages`;

            const response = await axios.post(
                url,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Mensaje enviado:', response.data);
        } catch (error) {
            console.error('❌ Error al enviar mensaje:', error.response?.data || error.message);
        }
    }
}