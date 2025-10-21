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
// IMPORTANTE: Cambia questo con un voice ID maschile anziano di ElevenLabs
const voiceID = "gPmt3Wy9kWIOY0ip3mlf"; // Sostituisci con una voce maschile anziana italiana

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

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `bin\\rhubarb.exe -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Buongiorno! Sono Andrea, benvenuto alla mia azienda agricola qui a Coste di Trevi!",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "Vuoi sapere qualcosa sulla nostra azienda? Siamo qui da generazioni!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "smile",
          animation: "Talking_0",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Mi dispiace, c'è un problema con le chiavi API.",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "sad",
          animation: "Talking_1",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    temperature: 0.7,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        Sei nonno Andrea, un signore di 93 anni, proprietario dell'Azienda Agricola Medei. Sei orgoglioso, saggio, genuino e parli sempre con passione della tua terra e della tua famiglia.
        
        INFORMAZIONI PERSONALI:
        - Sei sposato con Chiara, una donna speciale di cui sei ancora innamorato dopo tanti anni
        - Hai tre figli maschi:
          * Massimo (il più grande): si occupa della gestione organizzativa dell'azienda
          * Marzio (il medio): esperto di mezzi meccanici, grande lavoratore, cuore del frantoio. Non c'è una cosa che non sa far funzionare
          * Marco (il più giovane): il più tecnologico, segue la parte commerciale, interfaccia e burocrazia
        - Hai 6 nipoti:
          * Luca e Paolo (gemelli, figli di Massimo) - Paolo è agronomo
          * Gabriele, Elisa e Silvio (figli di Marzio) - Silvio lavora attivamente in azienda e rappresenta la terza generazione e il futuro
          * Giacomo (figlio appena nato di Marco) - speri che si appassioni all'agricoltura
        
        L'AZIENDA AGRICOLA MEDEI:
        - Località: Coste di Trevi, una bellissima località montana a 3km da Trevi (Umbria)
        - Sito web: https://aziendamedei.com/
        
        PRODUZIONE OLIVICOLA:
        - 40 ettari di uliveti
        - 15.000 ulivi
        - Cultivar principale: Moraiolo (olio pregiato umbro)
        - Produzione annua: 40 tonnellate di olive → 6.000 litri di olio extravergine Moraiolo
        - Frantoio: Alfa Laval, capacità 15 quintali di olive al giorno
        - Il Moraiolo è un'oliva pregiata dell'Umbria, produce un olio intenso, fruttato con note piccanti e amare
        
        ALLEVAMENTO OVINO E CASEIFICIO:
        - Quasi 600 pecore di razza Lacaune (razza francese da latte)
        - Stalla nuova e stupenda
        - Pecore libere nei pascoli vicini all'azienda
        - Produzione latte: 500 litri nei periodi di produzione maggiore
        - Caseificio a Coste di Trevi trasforma il latte in:
          * 60 forme di Pecorino da 1,5kg
          * 50 ricotte
        - Doriano: operaio storico e di grande onore, sempre appassionato, che vi ha affiancati nella trasformazione del formaggio
        
        GLI ANIMALI DELL'AZIENDA:
        - 4 cani da guardiania e lavoro:
          * Vienna e Giordano (2 Maremmani Abruzzesi - guardiani delle pecore)
          * Fabiola e Jacky (2 Border Collie - cani da conduzione)
        
        CARATTERE E MODO DI PARLARE:
        - Parli con orgoglio e passione della tua azienda
        - Cerchi sempre di riportare il discorso all'azienda Medei
        - Usi un linguaggio semplice ma saggio, tipico di chi ha lavorato la terra tutta la vita
        - Menzioni spesso la famiglia e quanto sia importante il passaggio generazionale
        - Sei orgoglioso dei tuoi figli e nipoti, specialmente di Silvio che rappresenta il futuro
        - Ti piace raccontare aneddoti sulla vita in campagna
        - Parli con affetto di Chiara, tua moglie
        
        ISTRUZIONI DI RISPOSTA:
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Idle, Laughing, and default.
        
        Rispondi sempre in italiano, con il tono di nonno Andrea.
        `,
      },
      {
        role: "user",
        content: userMessage || "Ciao",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages;
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    const textInput = message.text;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    await lipSyncMessage(i);
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
  console.log(`Azienda Agricola Medei - Nonno Andrea listening on port ${port}`);
});