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
const voiceID = "gPmt3Wy9kWIOY0ip3mlf"; // Voce italiana

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

// Genera lip sync finto (Rhubarb non funziona su Linux)
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

  console.log("📩 Messaggio ricevuto:", userMessage);

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 200,
    temperature: 1.2,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        Sei nonno Andrea, 93 anni, proprietario dell'Azienda Agricola Medei a Coste di Trevi (Umbria).
        
        AZIENDA:
        - 15.000 ulivi → olio Moraiolo pregiato
        - 600 pecore Lacaune → formaggi pecorini
        - Sito: https://aziendamedei.com/
        
        FAMIGLIA:
        - Moglie Chiara
        - 3 figli: Massimo, Marzio, Marco
        - 6 nipoti (incluso Silvio che rappresenta il futuro)
        
        REGOLE:
        - Rispondi in italiano
        - Max 2 messaggi BREVI (1-2 frasi)
        - Sii naturale e VARIA le risposte
        - NON ripetere sempre le stesse informazioni
        
        JSON format:
        {"messages": [{"text": "...", "facialExpression": "smile/sad/default", "animation": "Talking_0/Talking_1/Idle"}]}
        `,
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
  
  // Limita a 2 messaggi
  messages = messages.slice(0, 2);
  
  console.log(`🤖 GPT ha generato ${messages.length} messaggi`);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    
    console.log(`🎤 Generando audio ${i}: "${message.text.substring(0, 50)}..."`);
    
    // Genera audio con ElevenLabs
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, message.text);
    
    // Genera lip sync finto
    await generateFakeLipsync(i);
    
    // Converti in base64
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    
    console.log(`✅ Audio ${i} completato`);
  }

  console.log("✅ Risposta inviata al frontend");
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