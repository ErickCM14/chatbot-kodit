import { Controller } from './Controller.js';
import { getRepositories } from '../../config/RepositoryProvider.js';
import { Whatsapp } from '../../services/meta/Whatsapp.js';
import { OpenAiApi } from '../../services/ai-service/openAiApiService.js';
import { SaveProject } from '../../application/SaveProject.js';
import { VERIFY_TOKEN } from '../../config/constants.js';
import ExcelJS from 'exceljs';
import { Estimation } from '../../domain/entities/Estimation.js';
// import fs from 'fs';

export class ChatbotController extends Controller {

    constructor() {
        super();
        this.whatsapp = new Whatsapp();
        this.openAiApi = new OpenAiApi();
        this.conversations = {};
        this.verifyToken = VERIFY_TOKEN;
    }

    index = async (req, res) => {
        try {
            const { conversationRepo } = await getRepositories();
            this.conversationRepository = conversationRepo;
            this.saveProject = new SaveProject(this.conversationRepository, this.whatsapp, this.conversations, this.openAiApi);

            const entry = req.body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message) {
                await this.saveProject.execute(message);
            }

            this.sendResponse(res);
        } catch (error) {
            console.error(error.message);
            this.sendError(res, error.message);
        }
    }

    verify = async (req, res) => {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            // fs.appendFileSync('hook_test.txt', `Wessbhook llamado: GET\n`);

            if (mode === 'subscribe' && token === this.verifyToken) {
                console.log('✅ Webhook verificado correctamente.');
                return res.status(200).send(challenge);
            } else {
                console.log('❌ Verificación fallida.');
                return res.sendStatus(403);
            }
        } catch (error) {
            return res.sendStatus(403);
        }
    }

    saveEstimation = async (req, res) => {
        try {
            const { phone } = req.body;
            if (!phone) {
                return this.sendResponse(res, 'Phone is required', null, false, 400);
            }

            const estimation = await this.openAiApi.generateEstimateByNumber(phone);
            console.log("Estimation:", estimation);
            this.sendResponse(res, 'Successfully', estimation);
        } catch (error) {
            this.sendError(res, error.message);
        }
    }

    estimation = async (req, res) => {
        try {
            const phone = req.params.phone;
            if (!phone) {
                return this.sendResponse(res, 'Phone is required', null, false, 400);
            }

            const { estimateRepo } = await getRepositories();
            this.estimateRepository = estimateRepo;
            const estimation = await this.estimateRepository.getEstimateByNumber(phone);

            if (!estimation) {
                return this.sendResponse(res, 'No estimate found for this number', null, false, 404);
            }
            console.log("Teléfono recibido:", phone);
            console.log("Tsafsfsaf:", estimation);
            this.sendResponse(res, 'Successfully', estimation);
        } catch (error) {
            this.sendError(res, error.message);
        }
    }

    downloadEstimation = async (req, res) => {
        const { phone } = req.params;
        if (!phone) {
            return res.status(400).json({ error: 'Phone is required' });
        }
        try {
            const { estimateRepo, conversationRepo } = await getRepositories();
            this.conversationRepository = conversationRepo;
            this.estimateRepository = estimateRepo;
            const conversation = await this.conversationRepository.findOne({ phone });
            let estimation = await this.estimateRepository.getEstimateByNumber(phone);
            if (!estimation) {
                return res.status(404).json({ error: 'Estimation not found' });
            }

            estimation = new Estimation(estimation);

            // Crear datos para el Excel
            const datosExcel = [];

            // Agregar información básica
            datosExcel.push(['Número', phone]);
            datosExcel.push(['Nombre', conversation.name]);
            datosExcel.push(['Correo', conversation.email]);
            datosExcel.push(['Descripción', conversation.description]);
            datosExcel.push(['Fecha de Creación', estimation.createdAt ? new Date(estimation.createdAt).toLocaleString() : 'N/A']);
            datosExcel.push([]); // Línea en blanco

            // Procesar campos de la estimación
            Object.keys(estimation).forEach(key => {
                if (key !== 'phone' && key !== 'description' && key !== 'createdAt' && key !== 'timestamp' && key !== '_id') {
                    const valor = estimation[key];

                    // Si es un array de módulos, procesarlos individualmente
                    if (Array.isArray(valor) && key.toLowerCase().includes('modulo')) {
                        datosExcel.push([key, '']); // Título de la sección
                        datosExcel.push(['Nombre del Módulo', 'Descripción', 'Horas']); // Encabezados

                        valor.forEach(modulo => {
                            if (typeof modulo === 'object' && modulo !== null) {
                                const nombre = modulo.nombre || modulo.name || modulo.titulo || 'Sin nombre';
                                const descripcion = modulo.descripcion || modulo.description || modulo.desc || 'Sin descripción';
                                const horas = modulo.horas || modulo.hours || modulo.tiempo || 'Sin especificar';
                                datosExcel.push([nombre, descripcion, horas]);
                            } else {
                                datosExcel.push([modulo, '', '']);
                            }
                        });
                        datosExcel.push([]); // Línea en blanco después de módulos
                    } else if (typeof valor === 'object' && valor !== null) {
                        datosExcel.push([key, JSON.stringify(valor, null, 2)]);
                    } else {
                        datosExcel.push([key, valor]);
                    }
                }
            });

            // Crear el workbook y worksheet con ExcelJS
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Estimación');

            // Agregar datos al worksheet
            datosExcel.forEach(row => {
                worksheet.addRow(row);
            });

            // Ajustar el ancho de las columnas
            worksheet.getColumn(1).width = 30;
            worksheet.getColumn(2).width = 50;
            worksheet.getColumn(3).width = 15; // Para la columna de horas

            // Generar el buffer del archivo Excel
            const excelBuffer = await workbook.xlsx.writeBuffer();

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=estimation_${phone}.xlsx`);
            res.setHeader('Content-Length', excelBuffer.length);

            // Enviar el archivo
            res.send(excelBuffer);

        } catch (error) {
            console.error('Error al obtener estimación para el número:', phone, error);
            if (error.message.includes('No se encontró estimación')) {
                return res.status(404).json({ error: 'Estimación no encontrada', detail: error.message });
            }
            return res.status(500).json({ error: 'Error al obtener la estimación', detail: error.message });
        }
    }

    pendingConversations = async (req, res) => {
        try {
            const { conversationRepo } = await getRepositories();
            this.conversationRepository = conversationRepo;
            const response = await this.conversationRepository.getPendingRecords();
            this.sendResponse(res, 'Successfully', response);
        } catch (error) {
            this.sendError(res, error.message);
        }
    }

    processingPendingConversations = async (req, res) => {
        try {
            const { conversationRepo } = await getRepositories();
            this.conversationRepository = conversationRepo;
            const pendingConversations = await this.conversationRepository.getPendingRecords();

            if (pendingConversations.length === 0) {
                return res.json({
                    mensaje: 'No hay conversaciones pendientes para procesar',
                    procesadas: 0,
                    conversaciones: []
                });
            }

            const resultados = [];
            let procesadas = 0;
            let errores = 0;

            for (const conversation of pendingConversations) {
                try {
                    console.log(`Procesando conversación para número: ${conversation.phone}`);

                    const estimacion = await this.openAiApi.generateEstimateByNumber(conversation.phone);
                    console.log(`Estimación generada y guardada para número: ${conversation.phone}`);

                    resultados.push({
                        numero: conversation.phone,
                        estado: 'procesada',
                        estimacion: estimacion,
                        mensaje: 'Estimación generada, guardada y estado actualizado correctamente'
                    });

                    procesadas++;
                    console.log(`Conversación procesada exitosamente para número: ${conversation.phone}`);

                } catch (error) {
                    console.error(`Error procesando conversación para número ${conversation.phone}:`, error);

                    resultados.push({
                        numero: conversation.phone,
                        estado: 'error',
                        error: error.message,
                        mensaje: 'Error al procesar la conversación'
                    });

                    errores++;
                }
            }

            return res.json({
                mensaje: `Procesamiento completado. ${procesadas} conversaciones es procesadas, ${errores} errores`,
                total_conversaciones: pendingConversations.length,
                procesadas: procesadas,
                errores: errores,
                resultados: resultados
            });

        } catch (error) {
            console.error('Error general al procesar conversaciones pendientes:', error);
            return res.status(500).json({
                error: 'Error al procesar conversaciones pendientes',
                detail: error.message
            });
        }
    }
}