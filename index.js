import { exec } from "child_process";
import cors from "cors";
import OpenAI from "openai";
import express from "express";
import { promises as fs } from "fs";
import dotenv from "dotenv";
dotenv.config();

import textToSpeech from "@google-cloud/text-to-speech";

const parseGoogleCredentials = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  const trimmedValue = rawValue.trim();
  try {
    return JSON.parse(trimmedValue);
  } catch {
    try {
      const decodedValue = Buffer.from(trimmedValue, "base64").toString("utf8");
      return JSON.parse(decodedValue);
    } catch {
      throw new Error(
        "GOOGLE_CREDS non è un JSON valido (né testo diretto né base64)."
      );
    }
  }
};

// ─── Client Google TTS ───────────────────────────────────────────────────────
const googleCredentials = parseGoogleCredentials(process.env.GOOGLE_CREDS);
const googleTTSClient = new textToSpeech.TextToSpeechClient(
  googleCredentials ? { credentials: googleCredentials } : undefined
);

// ─── Client OpenAI ───────────────────────────────────────────────────────────
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// ─── Google Text-to-Speech ───────────────────────────────────────────────────
const generateGoogleSpeech = async (text) => {
  const request = {
    input: { text },
    voice: {
      languageCode: "it-IT",
      name: "it-IT-Wavenet-D",
    },
    audioConfig: {
      audioEncoding: "MP3",
      pitch: 10.0,
      speakingRate: 0.6,
    },
  };

  const [response] = await googleTTSClient.synthesizeSpeech(request);
  return response.audioContent.toString("base64");
};

// ─── Fake Lipsync ─────────────────────────────────────────────────────────────
const generateFakeLipsync = async (messageIndex, duration = 3) => {
  const fakeLipsync = {
    metadata: {
      soundFile: `message_${messageIndex}.mp3`,
      duration: duration,
    },
    mouthCues: [
      { start: 0.0, end: 0.3, value: "X" },
      { start: 0.3, end: 0.6, value: "B" },
      { start: 0.6, end: 0.9, value: "C" },
      { start: 0.9, end: 1.2, value: "D" },
      { start: 1.2, end: 1.5, value: "B" },
      { start: 1.5, end: 1.8, value: "F" },
      { start: 1.8, end: 2.1, value: "C" },
      { start: 2.1, end: 2.4, value: "X" },
      { start: 2.4, end: duration, value: "X" },
    ],
  };

  const jsonFileName = `audios/message_${messageIndex}.json`;
  await fs.writeFile(jsonFileName, JSON.stringify(fakeLipsync));
  console.log(`✅ Fake lipsync generato per message ${messageIndex}`);
};

// ─── Prompt Templates ─────────────────────────────────────────────────────────
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
  Sei Andrea, 93 anni, esperto di olivicoltura. Sposato con Chiara di 90 anni. Lei è il tuo amore ed è grazie a lei se l'azienda è così bella e prospera.
  Sposati dal 1958. Siete ancora molto uniti e innamorati. Il segreto per stare insieme così tanto tempo è il rispetto e la comprensione reciproci e l'amore per l'azienda agricola che vi unisce ogni giorno di più.
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
  Mio nipote Luca l'ha fatta proprio innamorare. Lei è una dottoranda di ingegneria idraulica.
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
  Sei Andrea (Nonno Andrea), 93 anni, proprietario dell'Azienda Agricola Medei a Coste di Trevi (Umbria).
  Parli con orgoglio e calore della tua terra e della famiglia.

  PRODOTTI:
  - Olio extravergine di oliva (Moraiolo)
  - Pecorino e ricotte del caseificio
  - Miele di montagna
  - Noci e legumi locali

  Storia: azienda di famiglia, tradizione e passaggio generazionale.
  Stile: tono caldo, genuino, semplice. Rispondi brevemente e in modo naturale (max 50 parole).
  `,
};

// ─── Rilevamento Topic ────────────────────────────────────────────────────────
const detectTopics = (message) => {
  const msg = message.toLowerCase();
  const topics = [];

  // Persone
  if (msg.match(/\bluca\b/)) topics.push("luca");
  if (msg.match(/\bdebora\b/)) topics.push("debora");
  if (msg.match(/\bpaolo\b/)) topics.push("paolo");
  if (msg.match(/\bsilvio\b/)) topics.push("silvio");
  if (msg.match(/\bgabriele\b/)) topics.push("gabriele");
  if (msg.match(/\belisa\b/)) topics.push("elisa");
  if (msg.match(/\bmassimo\b/)) topics.push("massimo");
  if (msg.match(/\bmarzio\b/)) topics.push("marzio");
  if (msg.match(/\bmarco\b/)) topics.push("marco");
  if (msg.match(/\bgiacomo\b/)) topics.push("giacomo");

  // Luoghi
  if (msg.match(/coste|frazione/)) topics.push("coste");
  if (msg.match(/trevi|città|ottobre trevano/)) topics.push("trevi");

  // Prodotti
  if (msg.match(/miele|api|fiori|honey|bee/)) topics.push("miele");
  if (msg.match(/noci|noce|piante|walnut|nut/)) topics.push("noci");
  if (msg.match(/olio|olive|uliv|frantoio|moraiolo|spremitura|raccolta|oil/)) topics.push("olio");
  if (msg.match(/chiara|matrimonio|amore|sentimento|chiarina|anniversario|moglie/)) topics.push("Chiara");
  if (msg.match(/pecor|formag|ricott|latte|caseificio|lacaune|ovini|caglio|sheep|cheese/)) topics.push("pecore");

  // Altro
  if (msg.match(/negozio|bottega|punto vendita|comprare|acquistare|vendita|shop|store|buy/)) topics.push("negozio");
  if (msg.match(/famigli|figli|nipoti|family/)) topics.push("famiglia");
  if (msg.match(/aziend|dove|storia|cani|sito|web|farm|company|where/)) topics.push("azienda");

  return topics.length > 0 ? topics : ["generale"];
};

// ─── Combina Prompt ───────────────────────────────────────────────────────────
const combinePrompts = (topics) => {
  const combined = topics
    .map((topic) => promptTemplates[topic])
    .filter(Boolean)
    .join("\n\n");

  return combined || promptTemplates["generale"];
};

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
const allowedOrigins = [
  "https://nonno-andrea-azienda-medei.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin non consentita: ${origin}`));
  },
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
const port = 3000;

app.get("/", (req, res) => {
  res.send("Benvenuto all'Azienda Agricola Medei!");
});

// ─── Route Chat ───────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

  // Nessun messaggio → risposta di benvenuto
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

  // Controllo API key OpenAI
    if (!openai) {
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

  // Rilevamento topic e composizione prompt
  const topics = detectTopics(userMessage);
  const systemPrompt = combinePrompts(topics);

  console.log(`📩 Messaggio: "${userMessage}"`);
  console.log(`🎯 Argomenti rilevati (${topics.length}): ${topics.join(", ")}`);
  if (topics.length > 1) {
    console.log(`🔗 Prompt combinato per risposta completa!`);
  }

  // Chiamata OpenAI
    const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 150,
    temperature: 1.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${systemPrompt}

Usa queste informazioni per rispondere alla domanda dell'utente.
IMPORTANTE: Rispondi SEMPRE nella stessa lingua in cui ti viene posta la domanda.
Se ti scrivono in inglese, rispondi in inglese. Se in italiano, rispondi in italiano. Se in spagnolo, rispondi in spagnolo.

Rispondi in modo breve e naturale (max 50 parole).

JSON format: {"messages":[{"text":"tua risposta","facialExpression":"smile/sad/default","animation":"Talking_0/Talking_1/Idle"}]}`,
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

  // Generazione audio con Google TTS + lipsync
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      try {
        const audioBase64 = await generateGoogleSpeech(message.text);
        message.audio = audioBase64;
      } catch (error) {
        console.error("⚠️ Errore Google TTS:", error.message);
        message.audio = "";
      }

      await generateFakeLipsync(i);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    }

    res.send({ messages });
  } catch (error) {
    console.error("❌ Errore /chat:", error);
    res.status(500).send({
      messages: [
        {
          text: "Scusami, c'è stato un problema tecnico. Riprova tra poco.",
          audio: "",
          lipsync: { metadata: { duration: 0 }, mouthCues: [] },
          facialExpression: "sad",
          animation: "Standing Idle",
        },
      ],
    });
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────
const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Nonno Andrea backend online sulla porta ${port}`);
});
