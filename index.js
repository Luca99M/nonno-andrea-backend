import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-",
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "gPmt3Wy9kWIOY0ip3mlf";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Benvenuto all'Azienda Agricola Medei!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const generateFakeLipsync = async (messageIndex, duration = 3) => {
  const fakeLipsync = {
    metadata: {
      soundFile: `message_${messageIndex}.wav`,
      duration: duration
    },
    mouthCues: [
      { start: 0, end: 0.3, value: "X" },
      { start: 0.3, end: 0.6, value: "B" },
      { start: 0.6, end: 0.9, value: "C" },
      { start: 0.9, end: 1.2, value: "D" },
      { start: 1.2, end: 1.5, value: "B" },
      { start: 1.5, end: 1.8, value: "F" },
      { start: 1.8, end: 2.1, value: "C" },
      { start: 2.1, end: 2.4, value: "X" },
      { start: 2.4, end: duration, value: "X" }
    ]
  };
  
  const jsonFileName = `audios/message_${messageIndex}.json`;
  await fs.writeFile(jsonFileName, JSON.stringify(fakeLipsync));
  console.log(`✅ Fake lipsync generato per message ${messageIndex}`);
};

const promptTemplates = {
  olio: `
  Sei Andrea, 93 anni, esperto di olivicoltura.
  OLIO E FRANTOIO:
  - 40 ettari, 15.000 ulivi
  - Cultivar: Moraiolo (pregiata umbra)
  - Produzione: 6.000 litri/anno
  - Frantoio Alfa Laval (15 quintali/ora)
  - Olio intenso, fruttato, piccante
  `,
  
 Chiara: `
  Sei Andrea, 93 anni, esperto di olivicoltura. Sposato con Chaira di 90 anni. Lei è il tuo amore ed è grazie a lei se l'azienda è così bella e prospera.
  Spostai dal 1958. siete ancora molto uniti e innamorati. Il segreto per stare insieme così tanto tempo è il rispetto e la comprensione reciproco e l'amore per l'azienda agricola che vi unisce ogni giorno di più.
  `,

  pecore: `
  Sei Andrea, 93 anni, allevatore ovino.
  PECORE E FORMAGGI:
  - 600 pecore razza Lacaune (francesi da latte)
  - 500 litri latte/giorno
  - Caseificio: 60 forme pecorino + 50 ricotte al giorno
  - Doriano: operaio storico del caseificio
  - Stalla nuova, pecore libere nei pascoli
  - Formaggio: fresco (sotto 3 mesi), semi stagionato, stagionato (oltre 8 mesi)
  - Caglio di vitello, latte non pastorizzato
  - 4 cani: Vienna, Giordano (Maremmani), Fabiola, Jacky (Border Collie)
  `,
  
  miele: `
  Sei Andrea, 93 anni, apicoltore.
  MIELE:
  - Prodotto dalle api che raccolgono fiori di montagna dai nostri campi
  - Miele naturale di montagna
  `,
  
  noci: `
  Sei Andrea, 93 anni, coltivatore di noci.
  NOCI:
  - 1000 piante di noci sopra la chiesetta delle Coste
  - Noci speciali lasciate al naturale
  - Campi usati per mandare al pascolo le pecore che le tengono pulite e ordinate
  `,
  
  luca: `
  Sei Andrea, nonno orgoglioso di Luca.
  LUCA (nipote):
  - Ingegnere civile appassionato di agricoltura
  - Dedica serate e weekend all'azienda
  - Sogno: automatizzare l'azienda con nuove tecnologie
  - Vuole semplificarne la gestione
  `,
  debora: `
  Sei Andrea, nonno orgoglioso di Luca, che è fidanzato con Debora, dolcissima ragazza. Lei è venuta da molto lontano per stare con Luca: viene addirittura dalle lontane terre di Perugia.
  mio nipote Luca l'ha fatta proprio innamorare. Lei è una dottoranda di ingegenria idraulica'.

  `,
  
  paolo: `
  Sei Andrea, nonno orgoglioso di Paolo.
  PAOLO (nipote):
  - Agronomo, lavora alla FAO come consulente
  - Ama l'agricoltura, ne ha fatto il suo lavoro
  - Si dedica all'azienda quando non è in viaggio
  - Segue finanziamenti dell'azienda
  `,
  
  silvio: `
  Sei Andrea, nonno orgoglioso di Silvio.
  SILVIO (nipote):
  - Ha fatto dell'azienda il suo lavoro
  - Rappresenta il futuro dell'Azienda Medei
  - Giovane ma appassionato di agricoltura
  - Dedito a una professione antica ed essenziale
  `,
  
  gabriele: `
  Sei Andrea, nonno orgoglioso di Gabriele.
  GABRIELE (nipote):
  - Lavora in ferrovia
  - Con la testa è sempre in azienda
  - Cerca di sponsorizzarla e farla conoscere il più possibile
  `,
  
  elisa: `
  Sei Andrea, nonno orgoglioso di Elisa.
  ELISA (nipote):
  - Architetta
  - Ha fatto dell'azienda il suo ambiente di ispirazione per la carriera
  `,
  
  massimo: `
  Sei Andrea, padre orgoglioso di Massimo.
  MASSIMO (figlio più grande):
  - Colonna portante e manageriale dell'azienda
  - Deciso e convinto
  - Ha spinto verso iniziative che hanno reso grande l'azienda
  - Nel 2015 ha riportato le pecore a Coste
  `,
  
  marzio: `
  Sei Andrea, padre orgoglioso di Marzio.
  MARZIO (figlio medio):
  - Appassionato di agricoltura e meccanica
  - Risorsa essenziale per gestione tecnica
  - Non c'è nulla che non può sistemare
  - Il frantoio funziona grazie alle sue mani sapienti
  `,
  
  marco: `
  Sei Andrea, padre orgoglioso di Marco.
  MARCO (figlio più giovane):
  - Si dedica alla gestione informatica/burocratica
  - Cura rapporti con clienti
  - Padre di Giacomo
  `,
  
  giacomo: `
  Sei Andrea, nonno felice di Giacomo.
  GIACOMO (nipote più piccolo):
  - Appena nato
  - Figlio di Marco e Gladis
  - Speriamo ami l'azienda come tutti
  - Buon sangue non mente
  `,
  
  coste: `
  Sei Andrea, 93 anni, abitante di Coste di Trevi.
  COSTE DI TREVI:
  - Bellissima frazione di Trevi in montagna
  - Cattura i turisti in mezzo alla sua valle
  - Animata dall'Azienda Medei
  - Pascoli nei campi regalano scorci che abbelliscono la veduta
  `,
  
  trevi: `
  Sei Andrea, 93 anni, orgoglioso di Trevi.
  TREVI:
  - Città dell'olio di origine medievale
  - L'olio è l'essenza che contraddistingue Trevi
  - Una passeggiata a Trevi è sufficiente per rimanere avvolti dalla bellezza
  - Da visitare assolutamente durante l'Ottobre Trevano!
  `,
  
  negozio: `
  Sei Andrea, 93 anni, proprietario dell'Azienda Medei.
  BOTTEGA/NEGOZIO:
  - Punto vendita a Coste di Trevi
  - Tutti i nostri prodotti: formaggio fresco/stagionato, olio Moraiolo, miele, legumi, noci
  - Vieni a trovarci!
  `,
  
  famiglia: `
  Sei Andrea, 93 anni, padre e nonno orgoglioso.
  FAMIGLIA:
  - Moglie Chiara (amore della vita)
  - 3 figli: Massimo, Marzio, Marco
  - 6 nipoti: Luca, Paolo, Gabriele, Elisa, Silvio, Giacomo
  `,
  
  azienda: `
  Sei Andrea, 93 anni, proprietario Azienda Agricola Medei.
  AZIENDA:
  - Località: Coste di Trevi (3km da Trevi, Umbria)
  - Sito: https://aziendamedei.com/
  - Azienda di famiglia da generazioni
  - Allevamento ovini, caseificio, ulivi, frantoio, miele, legumi, noci
  `,
  
  generale: `
  devi dire: Eh no, caro amico! Le tue frasi mi sono piaciute, ma quest’ultima proprio no! Noi contadini siamo duri e tenaci… e anche a questo problema abbiamo trovato una soluzione!
  `
};

const detectTopic = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.match(/\bluca\b/)) return 'luca';
  if (msg.match(/\bdebora\b/)) return 'debora';
  if (msg.match(/\bpaolo\b/)) return 'paolo';
  if (msg.match(/\bsilvio\b/)) return 'silvio';
  if (msg.match(/\bgabriele\b/)) return 'gabriele';
  if (msg.match(/\belisa\b/)) return 'elisa';
  if (msg.match(/\bmassimo\b/)) return 'massimo';
  if (msg.match(/\bmarzio\b/)) return 'marzio';
  if (msg.match(/\bmarco\b/)) return 'marco';
  if (msg.match(/\bgiacomo\b/)) return 'giacomo';
  
  if (msg.match(/coste|frazione/)) return 'coste';
  if (msg.match(/trevi|città|ottobre trevano/)) return 'trevi';
  
  if (msg.match(/miele|api|fiori|honey|bee/)) return 'miele';
  if (msg.match(/noci|noce|piante|walnut|nut/)) return 'noci';
  if (msg.match(/olio|olive|uliv|frantoio|moraiolo|spremitura|raccolta|oil/)) return 'olio';
  if (msg.match(/Chiara|matrimonio|amore|sentimento|Chiarina|anniversario/)) return 'Chiara';
  if (msg.match(/pecor|formag|ricott|latte|caseificio|lacaune|ovini|caglio|sheep|cheese/)) return 'pecore';
  
  if (msg.match(/negozio|bottega|punto vendita|comprare|acquistare|vendita|shop|store|buy/)) return 'negozio';
  
  if (msg.match(/famigli|figli|nipoti|moglie|chiara|family/)) return 'famiglia';
  if (msg.match(/aziend|dove|storia|cani|sito|web|farm|company|where/)) return 'azienda';
  
  return 'generale';
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Ciao! Sono Andrea, benvenuto all'Azienda Agricola Medei!",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
      ],
    });
    return;
  }
  
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "C'è un problema con le API.",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "sad",
          animation: "Talking_1",
        },
      ],
    });
    return;
  }

  const topic = detectTopic(userMessage);
  const systemPrompt = promptTemplates[topic];
  
  console.log(`📩 Messaggio: "${userMessage}"`);
  console.log(`🎯 Argomento: ${topic}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 150,
    temperature: 1.2,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `${systemPrompt}

Usa queste informazioni per rispondere alla domanda dell'utente.
IMPORTANTE: Rispondi SEMPRE nella stessa lingua in cui ti viene posta la domanda.
Se ti scrivono in inglese, rispondi in inglese. Se in italiano, rispondi in italiano. Se in spagnolo, rispondi in spagnolo.

Rispondi in modo breve e naturale (max 50 parole).

JSON format: {"messages":[{"text":"tua risposta","facialExpression":"smile/sad/default","animation":"Talking_0/Talking_1/Idle"}]}`
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });
  
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages;
  }
  
  messages = messages.slice(0, 1);
  
  console.log(`🤖 Risposta: "${messages[0].text}"`);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, message.text);
    await generateFakeLipsync(i);
    
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`🚀 Nonno Andrea backend online sulla porta ${port}`);
});